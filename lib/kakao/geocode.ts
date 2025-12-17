type LatLng = { lat: number; lng: number }

function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ")
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
  private readonly cache: Map<string, LatLng>
  private readonly memoryCache: Map<string, LatLng>
  private queue: Array<{
    key: string
    address: string
    resolve: (v: LatLng | null) => void
  }> = []
  private inFlight = 0
  private failed = 0
  private resolved = 0
  private total = 0
  private persistTimer: any = null

  constructor(geocoder: any, { concurrency = 4 }: { concurrency?: number } = {}) {
    this.geocoder = geocoder
    this.concurrency = concurrency
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

    this.total += 1
    return new Promise<LatLng | null>((resolve) => {
      this.queue.push({ key, address: key, resolve })
      this.pump()
    })
  }

  private pump() {
    while (this.inFlight < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!
      this.inFlight += 1
      this.geocoder.addressSearch(job.address, (result: any, status: any) => {
        this.inFlight -= 1

        const ok = status === (window as any).kakao.maps.services.Status.OK
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
        } else {
          this.failed += 1
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
