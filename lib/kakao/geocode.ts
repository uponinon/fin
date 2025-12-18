type LatLng = { lat: number; lng: number }

function normalizeAddress(address: string) {
  return address
    .trim()
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
}

function isValidCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001
}

const STORAGE_KEY = "kakao_geocode_cache_v1"

function loadPersistentCache(): Map<string, LatLng> {
  if (typeof window === "undefined") return new Map()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, LatLng>
    return new Map(Object.entries(obj))
  } catch {
    return new Map()
  }
}

function savePersistentCache(cache: Map<string, LatLng>) {
  if (typeof window === "undefined") return
  try {
    const obj: Record<string, LatLng> = {}
    cache.forEach((v, k) => {
      obj[k] = v
    })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
  }
}

export interface GeocodeProgress {
  total: number
  resolved: number
  queued: number
  inFlight: number
  failed: number
}

export class KakaoGeocoderQueue {
  private readonly geocoder: any
  private readonly concurrency: number
  private readonly minDelayMs: number
  private readonly maxRetries: number
  private readonly baseRetryDelayMs: number
  private readonly cache: Map<string, LatLng>
  private readonly memoryCache: Map<string, LatLng>
  private queue: Array<{
    key: string
    address: string
    attempt: number
    readyAt: number
    resolve: (v: LatLng | null) => void
  }> = []
  private inFlight = 0
  private failed = 0
  private resolved = 0
  private total = 0
  private persistTimer: any = null
  private nextAllowedAt = 0
  private pumpTimer: any = null
  private readonly negativeCacheUntil: Map<string, number> = new Map()

  constructor(
    geocoder: any,
    {
      concurrency = 2,
      minDelayMs = 250,
      maxRetries = 3,
      baseRetryDelayMs = 800,
    }: { concurrency?: number; minDelayMs?: number; maxRetries?: number; baseRetryDelayMs?: number } = {},
  ) {
    this.geocoder = geocoder
    this.concurrency = concurrency
    this.minDelayMs = minDelayMs
    this.maxRetries = maxRetries
    this.baseRetryDelayMs = baseRetryDelayMs
    this.cache = loadPersistentCache()
    this.memoryCache = new Map()
  }

  getProgress(): GeocodeProgress {
    return {
      total: this.total,
      resolved: this.resolved,
      queued: this.queue.length,
      inFlight: this.inFlight,
      failed: this.failed,
    }
  }

  getCached(address: string): LatLng | null {
    const key = normalizeAddress(address)
    const mem = this.memoryCache.get(key)
    if (mem && isValidCoord(mem.lat, mem.lng)) return mem
    const persisted = this.cache.get(key)
    if (persisted && isValidCoord(persisted.lat, persisted.lng)) return persisted
    return null
  }

  geocode(address: string): Promise<LatLng | null> {
    const key = normalizeAddress(address)
    const cached = this.getCached(key)
    if (cached) return Promise.resolve(cached)

    const blockedUntil = this.negativeCacheUntil.get(key) ?? 0
    if (blockedUntil > Date.now()) {
      return Promise.resolve(null)
    }

    this.total += 1
    return new Promise<LatLng | null>((resolve) => {
      this.queue.push({ key, address: key, attempt: 0, readyAt: Date.now(), resolve })
      this.pump()
    })
  }

  private pump() {
    if (this.pumpTimer) return

    const now = Date.now()
    const ready = this.queue.filter((j) => j.readyAt <= now)
    if (ready.length === 0 || now < this.nextAllowedAt || this.inFlight >= this.concurrency) {
      const earliestReadyAt = this.queue.reduce((min, j) => Math.min(min, j.readyAt), Number.POSITIVE_INFINITY)
      const nextAt = Math.max(this.nextAllowedAt, Number.isFinite(earliestReadyAt) ? earliestReadyAt : now + 100)
      this.pumpTimer = setTimeout(() => {
        this.pumpTimer = null
        this.pump()
      }, Math.max(50, nextAt - now))
      return
    }

    while (this.inFlight < this.concurrency) {
      const idx = this.queue.findIndex((j) => j.readyAt <= Date.now())
      if (idx < 0) break
      if (Date.now() < this.nextAllowedAt) break
      const job = this.queue.splice(idx, 1)[0]
      this.inFlight += 1
      this.nextAllowedAt = Date.now() + this.minDelayMs
      this.geocoder.addressSearch(job.address, (result: any, status: any) => {
        this.inFlight -= 1

        const servicesStatus = (window as any).kakao?.maps?.services?.Status
        const ok = servicesStatus ? status === servicesStatus.OK : false
        const isZero = servicesStatus ? status === servicesStatus.ZERO_RESULT : false
        const isError = servicesStatus ? status === servicesStatus.ERROR : !ok && !isZero
        const first = ok ? result?.[0] : null
        const lat = first?.y ? Number.parseFloat(first.y) : NaN
        const lng = first?.x ? Number.parseFloat(first.x) : NaN

        if (ok && isValidCoord(lat, lng)) {
          const value = { lat, lng }
          this.memoryCache.set(job.key, value)
          this.cache.set(job.key, value)
          this.resolved += 1
          job.resolve(value)
          this.schedulePersist()
        } else if (isError && job.attempt < this.maxRetries) {
          const delay = Math.min(60_000, this.baseRetryDelayMs * 2 ** job.attempt)
          const jitter = Math.floor(Math.random() * 250)
          this.queue.push({
            key: job.key,
            address: job.address,
            attempt: job.attempt + 1,
            readyAt: Date.now() + delay + jitter,
            resolve: job.resolve,
          })
          this.nextAllowedAt = Math.max(this.nextAllowedAt, Date.now() + delay)
        } else {
          this.failed += 1
          this.negativeCacheUntil.set(job.key, Date.now() + 10 * 60 * 1000)
          job.resolve(null)
        }

        this.pump()
      })
    }
  }

  private schedulePersist() {
    if (this.persistTimer) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      savePersistentCache(this.cache)
    }, 500)
  }
}
