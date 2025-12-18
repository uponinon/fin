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

const STORAGE_KEY = "kakao_geocode_cache_v2"

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

export class RateLimitError extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super("rate_limited")
    this.retryAfterMs = retryAfterMs
  }
}

export type GeocodeFn = (address: string) => Promise<LatLng | null>

export class KakaoGeocoderQueue {
  private readonly geocodeFn: GeocodeFn
  private readonly concurrency: number
  private readonly minDelayMs: number
  private readonly maxRetries: number
  private readonly baseRetryDelayMs: number
  private readonly cache: Map<string, LatLng>
  private readonly memoryCache: Map<string, LatLng>
  private readonly negativeCacheUntil: Map<string, number> = new Map()
  private readonly pendingResolversByKey: Map<string, Array<(v: LatLng | null) => void>> = new Map()

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

  constructor(
    geocodeFn: GeocodeFn,
    {
      concurrency = 1,
      minDelayMs = 200,
      maxRetries = 5,
      baseRetryDelayMs = 1000,
    }: { concurrency?: number; minDelayMs?: number; maxRetries?: number; baseRetryDelayMs?: number } = {},
  ) {
    this.geocodeFn = geocodeFn
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
    if (blockedUntil > Date.now()) return Promise.resolve(null)

    return new Promise<LatLng | null>((resolve) => {
      const existing = this.pendingResolversByKey.get(key)
      if (existing) {
        existing.push(resolve)
        return
      }

      this.pendingResolversByKey.set(key, [resolve])
      this.total += 1

      const resolveAll = (value: LatLng | null) => {
        const resolvers = this.pendingResolversByKey.get(key) ?? []
        this.pendingResolversByKey.delete(key)
        resolvers.forEach((r) => r(value))
      }

      this.queue.push({ key, address: key, attempt: 0, readyAt: Date.now(), resolve: resolveAll })
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

      void this.runJob(job).finally(() => {
        this.inFlight -= 1
        this.pump()
      })
    }
  }

  private async runJob(job: {
    key: string
    address: string
    attempt: number
    readyAt: number
    resolve: (v: LatLng | null) => void
  }) {
    try {
      const coord = await this.geocodeFn(job.address)
      if (coord && isValidCoord(coord.lat, coord.lng)) {
        this.memoryCache.set(job.key, coord)
        this.cache.set(job.key, coord)
        this.resolved += 1
        job.resolve(coord)
        this.schedulePersist()
        return
      }

      this.failed += 1
      this.negativeCacheUntil.set(job.key, Date.now() + 10 * 60 * 1000)
      job.resolve(null)
    } catch (err: any) {
      const isRateLimit = err instanceof RateLimitError || String(err?.message) === "rate_limited"
      if (isRateLimit && job.attempt < this.maxRetries) {
        const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : Number(err?.retryAfterMs ?? 5000)
        const jitter = Math.floor(Math.random() * 250)
        const delay = Math.max(retryAfterMs, this.baseRetryDelayMs * 2 ** job.attempt) + jitter
        this.queue.push({
          key: job.key,
          address: job.address,
          attempt: job.attempt + 1,
          readyAt: Date.now() + delay,
          resolve: job.resolve,
        })
        this.nextAllowedAt = Math.max(this.nextAllowedAt, Date.now() + delay)
        return
      }

      if (!isRateLimit && job.attempt < this.maxRetries) {
        const jitter = Math.floor(Math.random() * 250)
        const delay = Math.min(60_000, this.baseRetryDelayMs * 2 ** job.attempt) + jitter
        this.queue.push({
          key: job.key,
          address: job.address,
          attempt: job.attempt + 1,
          readyAt: Date.now() + delay,
          resolve: job.resolve,
        })
        this.nextAllowedAt = Math.max(this.nextAllowedAt, Date.now() + delay)
        return
      }

      this.failed += 1
      this.negativeCacheUntil.set(job.key, Date.now() + 10 * 60 * 1000)
      job.resolve(null)
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
