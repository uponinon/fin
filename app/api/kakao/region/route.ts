import { NextResponse } from "next/server"

export const runtime = "edge"

type SelectedRegion = {
  query: string
  lawdCd: string
  label: string
  center: { lat: number; lng: number }
}

const CACHE_TTL_OK_MS = 7 * 24 * 60 * 60 * 1000
const CACHE_TTL_FAIL_MS = 10 * 60 * 1000

const memoryCache = new Map<string, { expiresAt: number; value: SelectedRegion | null }>()
const inFlight = new Map<string, Promise<SelectedRegion | null>>()
let nextAllowedAt = 0

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

async function kakaoFetchJson(url: string, restApiKey: string) {
  const waitMs = Math.max(0, nextAllowedAt - Date.now())
  if (waitMs > 0) await sleep(waitMs)
  nextAllowedAt = Date.now() + 250

  const res = await fetch(url, {
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

  return (await res.json()) as any
}

function parseCoord(doc: any) {
  const lat = doc?.y ? Number.parseFloat(doc.y) : NaN
  const lng = doc?.x ? Number.parseFloat(doc.x) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) < 0.0001 || Math.abs(lng) < 0.0001) return null
  return { lat, lng }
}

async function resolveRegion(query: string, restApiKey: string): Promise<SelectedRegion | null> {
  const addressUrl = new URL("https://dapi.kakao.com/v2/local/search/address.json")
  addressUrl.searchParams.set("query", query)
  addressUrl.searchParams.set("page", "1")
  addressUrl.searchParams.set("size", "1")

  const addressJson = await kakaoFetchJson(addressUrl.toString(), restApiKey)
  const addrDoc = addressJson?.documents?.[0]
  if (addrDoc) {
    const addr = addrDoc?.address ?? addrDoc?.road_address
    const bCode = String(addr?.b_code ?? "")
    const coord = parseCoord(addrDoc)
    if (bCode.length >= 5 && coord) {
      return {
        query,
        lawdCd: bCode.slice(0, 5),
        label: String(addrDoc?.address_name ?? query),
        center: coord,
      }
    }
  }

  const keywordUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json")
  keywordUrl.searchParams.set("query", query)
  keywordUrl.searchParams.set("page", "1")
  keywordUrl.searchParams.set("size", "1")

  const keywordJson = await kakaoFetchJson(keywordUrl.toString(), restApiKey)
  const placeDoc = keywordJson?.documents?.[0]
  if (!placeDoc) return null
  const placeCoord = parseCoord(placeDoc)
  if (!placeCoord) return null

  const regionUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json")
  regionUrl.searchParams.set("x", String(placeCoord.lng))
  regionUrl.searchParams.set("y", String(placeCoord.lat))

  const regionJson = await kakaoFetchJson(regionUrl.toString(), restApiKey)
  const docs = Array.isArray(regionJson?.documents) ? regionJson.documents : []
  const legal = docs.find((r: any) => r?.region_type === "B") ?? docs[0]
  const code = String(legal?.code ?? "")
  if (code.length < 5) return null

  const label =
    [legal?.region_1depth_name, legal?.region_2depth_name, legal?.region_3depth_name].filter(Boolean).join(" ") ||
    String(placeDoc?.place_name ?? query)

  return {
    query,
    lawdCd: code.slice(0, 5),
    label,
    center: placeCoord,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const queryRaw = searchParams.get("query") ?? searchParams.get("q") ?? ""
  const query = normalizeQuery(queryRaw)
  if (!query) return NextResponse.json({ message: "Missing query", region: null }, { status: 400 })

  const restApiKey = process.env.KAKAO_REST_API_KEY
  if (!restApiKey) return NextResponse.json({ message: "Missing KAKAO_REST_API_KEY", region: null }, { status: 501 })

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
      { region: cached.value },
      { headers: { "Cache-Control": "public, max-age=600" } },
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
    const region = await existing.catch(() => null)
    const res = NextResponse.json(
      { region },
      { headers: { "Cache-Control": "public, max-age=600" } },
    )
    if (cacheStorage) {
      try {
        await cacheStorage.put(req, res.clone())
      } catch {
      }
    }
    return res
  }

  const task = resolveRegion(query, restApiKey)
  inFlight.set(query, task)

  try {
    const region = await task
    memoryCache.set(query, { expiresAt: Date.now() + (region ? CACHE_TTL_OK_MS : CACHE_TTL_FAIL_MS), value: region })
    const res = NextResponse.json(
      { region },
      { headers: { "Cache-Control": region ? "public, max-age=604800" : "public, max-age=600" } },
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
        { message: "Kakao region rate limited", region: null, retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }
    return NextResponse.json({ message: err instanceof Error ? err.message : "region_failed", region: null }, { status: 502 })
  } finally {
    inFlight.delete(query)
  }
}

