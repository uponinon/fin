import { NextResponse } from "next/server"

export const runtime = "edge"

type LatLng = { lat: number; lng: number }

const CACHE_TTL_OK_MS = 30 * 24 * 60 * 60 * 1000
const CACHE_TTL_NULL_MS = 6 * 60 * 60 * 1000

const memoryCache = new Map<string, { expiresAt: number; value: LatLng | null }>()
const inFlight = new Map<string, Promise<LatLng | null>>()
let nextAllowedAt = 0
const MIN_INTERVAL_MS = 1200

function normalizeQuery(query: string) {
  return query
    .trim()
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(header: string | null) {
  if (!header) return 0
  const secs = Number.parseInt(header, 10)
  if (Number.isFinite(secs) && secs > 0) return secs * 1000
  return 0
}

function getCachesDefault(): Cache | null {
  try {
    const maybeCaches = (globalThis as any).caches
    const maybeDefault = maybeCaches?.default
    if (maybeDefault && typeof maybeDefault.match === "function" && typeof maybeDefault.put === "function") {
      return maybeDefault as Cache
    }
  } catch {
  }
  return null
}

async function geocodeViaKakaoRest(query: string, restApiKey: string): Promise<LatLng | null> {
  const waitMs = Math.max(0, nextAllowedAt - Date.now())
  if (waitMs > 0) await sleep(waitMs)
  nextAllowedAt = Date.now() + MIN_INTERVAL_MS

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json")
  url.searchParams.set("query", query)
  url.searchParams.set("page", "1")
  url.searchParams.set("size", "1")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${restApiKey.trim()}` },
    cache: "no-store",
  })

  if (res.status === 429) {
    const retryAfterMs = Math.max(5000, parseRetryAfterMs(res.headers.get("Retry-After")))
    nextAllowedAt = Date.now() + retryAfterMs
    const err = new Error("rate_limited")
    ;(err as any).retryAfterMs = retryAfterMs
    throw err
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`kakao_rest_failed:${res.status}:${text.slice(0, 120)}`)
  }

  const json = (await res.json()) as any
  const first = json?.documents?.[0]
  const lat = first?.y ? Number.parseFloat(first.y) : NaN
  const lng = first?.x ? Number.parseFloat(first.x) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) < 0.0001 || Math.abs(lng) < 0.0001) return null
  return { lat, lng }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const queryRaw = searchParams.get("query") ?? searchParams.get("q") ?? ""
  const query = normalizeQuery(queryRaw)
  if (!query) return NextResponse.json({ message: "Missing query", coord: null }, { status: 400 })

  const restApiKey = process.env.KAKAO_REST_API_KEY
  if (!restApiKey) {
    return NextResponse.json({ message: "Missing KAKAO_REST_API_KEY", coord: null }, { status: 501 })
  }

  const cacheStorage = getCachesDefault()
  if (cacheStorage) {
    try {
      const cached = await cacheStorage.match(req)
      if (cached) return cached
    } catch {
    }
  }

  const cached = memoryCache.get(query)
  if (cached && cached.expiresAt > Date.now()) {
    const res = NextResponse.json(
      { coord: cached.value },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    )
    if (cacheStorage) {
      try {
        await cacheStorage.put(req, res.clone())
      } catch {
      }
    }
    return res
  }

  const existing = inFlight.get(query)
  if (existing) {
    const coord = await existing.catch(() => null)
    const res = NextResponse.json(
      { coord },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    )
    if (cacheStorage) {
      try {
        await cacheStorage.put(req, res.clone())
      } catch {
      }
    }
    return res
  }

  const task = geocodeViaKakaoRest(query, restApiKey)
  inFlight.set(query, task)

  try {
    const coord = await task
    memoryCache.set(query, { expiresAt: Date.now() + (coord ? CACHE_TTL_OK_MS : CACHE_TTL_NULL_MS), value: coord })
    const res = NextResponse.json(
      { coord },
      { headers: { "Cache-Control": coord ? "public, max-age=2592000" : "public, max-age=21600" } },
    )
    if (cacheStorage) {
      try {
        await cacheStorage.put(req, res.clone())
      } catch {
      }
    }
    return res
  } catch (err: any) {
    if (String(err?.message) === "rate_limited") {
      const retryAfterMs = Number(err?.retryAfterMs ?? 5000)
      return NextResponse.json(
        { message: "Kakao geocode rate limited", coord: null, retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }
    return NextResponse.json({ message: err instanceof Error ? err.message : "geocode_failed", coord: null }, { status: 502 })
  } finally {
    inFlight.delete(query)
  }
}
