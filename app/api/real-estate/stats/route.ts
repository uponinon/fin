import { NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const CACHE_TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { expiresAt: number; items: Array<{ period: string; avgPrice: number; maxPrice: number; minPrice: number; transactionCount: number; changeRate: number }> }>()

function toDealYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}${month}`
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const year = Number.parseInt(m[1], 10)
  const month = Number.parseInt(m[2], 10)
  const day = Number.parseInt(m[3], 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
}

function collectDealYmdsBetween(start: Date, end: Date) {
  const months: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    months.push(toDealYmd(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function toPeriod(dealYmd: string) {
  return `${dealYmd.slice(0, 4)}-${dealYmd.slice(4, 6)}`
}

async function fetchMonth(lawdCd: string, dealYmd: string, serviceKey: string) {
  const endpoint = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
  const params = new URLSearchParams({
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    numOfRows: "100",
    pageNo: "1",
  })
  const url = `${endpoint}?serviceKey=${serviceKey}&${params.toString()}`
  const res = await fetch(url, { cache: "no-store" })
  const xml = await res.text()
  if (!res.ok) throw new Error(`data.go.kr 호출 실패: ${res.status}`)

  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true })
  const parsed = parser.parse(xml) as any
  const items = parsed?.response?.body?.items?.item ?? []
  const list = Array.isArray(items) ? items : [items]

  const prices = list
    .filter(Boolean)
    .map((item: any) => Number.parseInt(String(item.dealAmount ?? "").replaceAll(",", "").replaceAll(" ", "") || "0", 10))
    .filter((p: number) => Number.isFinite(p) && p > 0)

  if (prices.length === 0) return null
  const avgPrice = Math.floor(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
  return {
    period: toPeriod(dealYmd),
    avgPrice,
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    transactionCount: prices.length,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lawdCd = searchParams.get("lawdCd")
  const months = Number.parseInt(searchParams.get("months") ?? "12", 10)
  const startDate = parseDateParam(searchParams.get("startDate"))
  const endDate = parseDateParam(searchParams.get("endDate"))

  if (!lawdCd) {
    return NextResponse.json({ message: "lawdCd가 필요합니다.", items: [] }, { status: 400 })
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY
  if (!serviceKey) {
    return NextResponse.json({ message: "DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다.", items: [] }, { status: 400 })
  }

  let dealYmds: string[] = []
  let cacheKey = ""
  if (startDate && endDate) {
    const start = startDate <= endDate ? startDate : endDate
    const end = startDate <= endDate ? endDate : startDate
    const maxEndMonth = new Date(start.getFullYear(), start.getMonth() + 11, 1)
    const maxEnd = endOfMonth(maxEndMonth)
    if (end > maxEnd) {
      return NextResponse.json({ message: "최대 조회기간은 12개월입니다.", items: [] }, { status: 400 })
    }
    dealYmds = collectDealYmdsBetween(start, end)
    if (dealYmds.length > 12) {
      return NextResponse.json({ message: "최대 조회기간은 12개월입니다.", items: [] }, { status: 400 })
    }
    cacheKey = `${lawdCd}:${dealYmds[0]}:${dealYmds[dealYmds.length - 1]}`
  } else {
    const end = new Date()
    const endYmd = toDealYmd(end)
    const safeMonths = Number.isFinite(months) ? Math.max(1, Math.min(12, months)) : 12
    dealYmds = []
    for (let i = safeMonths - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setMonth(d.getMonth() - i)
      dealYmds.push(toDealYmd(d))
    }
    cacheKey = `${lawdCd}:${endYmd}:${safeMonths}`
  }
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ items: cached.items })
  }

  try {
    const results: Array<{
      period: string
      avgPrice: number
      maxPrice: number
      minPrice: number
      transactionCount: number
      changeRate: number
    }> = []

    for (const dealYmd of dealYmds) {
      const monthData = await fetchMonth(lawdCd, dealYmd, serviceKey)
      if (!monthData) continue

      const prev = results[results.length - 1]
      const changeRate = prev ? ((monthData.avgPrice - prev.avgPrice) / prev.avgPrice) * 100 : 0
      results.push({ ...monthData, changeRate })
    }

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, items: results })
    return NextResponse.json({ items: results })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "알 수 없는 오류", items: [] },
      { status: 500 },
    )
  }
}
