// 공공데이터포털(data.go.kr) 기반 부동산 데이터 유틸
//
// 주의:
// - data.go.kr(국토교통부 실거래가) API는 보통 CORS/키 노출 이슈가 있어 브라우저에서 직접 호출하지 않는 편이 안전합니다.
// - 이 프로젝트는 `app/api/real-estate/route.ts`(서버)에서 외부 API를 호출하도록 연결해두었고,
//   외부 API 파싱 부분은 TODO로 비워두었습니다(키만 넣으면 바로 연결 가능하도록 자리만 마련).

export interface RealEstateTransaction {
  id: string
  address: string
  dongName: string
  jibun: string
  price: number // 만원 단위 (예: 50000 = 5억)
  area: number // ㎡
  buildYear: number
  dealYear: number
  dealMonth: number
  dealDay: number
  floor: number
  lat: number
  lng: number
  pricePerArea: number // 만원/평(대략)
  changeRate?: number // (%)
}

export interface PriceStatistics {
  period: string // YYYY-MM
  avgPrice: number
  maxPrice: number
  minPrice: number
  transactionCount: number
  changeRate: number // 전월 대비 (%)
}

export interface RegionPriceRange {
  region: string
  low: number
  medium: number
  high: number
  count: number
}

export async function fetchRealEstateData(lawdCd: string, dealYmd: string): Promise<RealEstateTransaction[]> {
  try {
    const params = new URLSearchParams({ lawdCd, dealYmd })
    const res = await fetch(`/api/real-estate?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`내부 API 호출 실패: ${res.status}`)
    const json = (await res.json()) as { items: RealEstateTransaction[] }
    if (!json?.items) throw new Error("응답 형식이 올바르지 않습니다.")
    return json.items
  } catch (error) {
    console.warn("data.go.kr 연동 전(또는 오류) - 목업 데이터를 사용합니다.", error)
    return generateMockData(lawdCd, dealYmd)
  }
}

export async function fetchPriceStatistics(lawdCd: string, months = 12): Promise<PriceStatistics[]> {
  try {
    const params = new URLSearchParams({ lawdCd, months: String(months) })
    const res = await fetch(`/api/real-estate/stats?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`내부 통계 API 호출 실패: ${res.status}`)
    const json = (await res.json()) as { items: PriceStatistics[] }
    return json.items ?? []
  } catch {
    return []
  }
}

export async function fetchPriceStatisticsRange(
  lawdCd: string,
  startDate: string,
  endDate: string,
): Promise<PriceStatistics[]> {
  try {
    const params = new URLSearchParams({ lawdCd, startDate, endDate })
    const res = await fetch(`/api/real-estate/stats?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`내부 통계 API 호출 실패: ${res.status}`)
    const json = (await res.json()) as { items: PriceStatistics[] }
    return json.items ?? []
  } catch {
    return []
  }
}

export function calculateRegionPriceRanges(data: RealEstateTransaction[]): RegionPriceRange[] {
  const regionMap = new Map<string, number[]>()

  data.forEach((item) => {
    const key = item.dongName || "기타"
    if (!regionMap.has(key)) regionMap.set(key, [])
    regionMap.get(key)!.push(item.price)
  })

  const results: RegionPriceRange[] = []
  regionMap.forEach((prices, region) => {
    prices.sort((a, b) => a - b)
    const count = prices.length
    results.push({
      region,
      low: prices[Math.floor(count * 0.25)],
      medium: prices[Math.floor(count * 0.5)],
      high: prices[Math.floor(count * 0.75)],
      count,
    })
  })

  return results.sort((a, b) => b.medium - a.medium)
}

export function getPriceColor(price: number): string {
  if (price >= 150000) return "#dc2626" // 15억+
  if (price >= 100000) return "#ea580c" // 10억+
  if (price >= 70000) return "#f59e0b" // 7억+
  if (price >= 50000) return "#10b981" // 5억+
  return "#3b82f6" // 5억 미만
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return "-"
  if (price >= 10000) {
    const eok = Math.floor(price / 10000)
    const man = price % 10000
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억`
  }
  return `${price.toLocaleString()}만원`
}

export function formatArea(areaM2: number): string {
  if (!Number.isFinite(areaM2)) return "-"
  const pyeong = areaM2 * 0.3025
  return `${areaM2.toFixed(1)}㎡ (${Math.floor(pyeong)}평)`
}

export function formatChangeRate(rate: number): string {
  if (!Number.isFinite(rate)) return "-"
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${rate.toFixed(2)}%`
}

function generateMockData(lawdCd: string, dealYmd: string): RealEstateTransaction[] {
  const mockData: RealEstateTransaction[] = []
  const basePrice = 50000 // 5억(만원)

  const year = Number.parseInt(dealYmd.slice(0, 4), 10)
  const month = Number.parseInt(dealYmd.slice(4, 6), 10)

  const regions = [
    { name: "강남구", lat: 37.5172, lng: 127.0473, priceMultiplier: 2.0 },
    { name: "서초구", lat: 37.4837, lng: 127.0324, priceMultiplier: 1.8 },
    { name: "송파구", lat: 37.5145, lng: 127.1059, priceMultiplier: 1.5 },
    { name: "마포구", lat: 37.5663, lng: 126.9019, priceMultiplier: 1.3 },
    { name: "영등포구", lat: 37.5264, lng: 126.8963, priceMultiplier: 1.2 },
  ]

  regions.forEach((region, regionIdx) => {
    for (let i = 0; i < 20; i++) {
      const price = Math.floor(basePrice * region.priceMultiplier * (0.7 + Math.random() * 0.6))
      const area = 60 + Math.random() * 80 // 60~140㎡
      const pricePerArea = Math.floor(price / (area * 0.3025)) // 만원/평(대략)

      mockData.push({
        id: `${lawdCd}-${dealYmd}-${regionIdx}-${i}`,
        address: `서울특별시 ${region.name} ${i + 1}번지`,
        dongName: region.name,
        jibun: `${100 + i}-${Math.floor(Math.random() * 20)}`,
        price,
        area: Math.floor(area * 10) / 10,
        buildYear: 2000 + Math.floor(Math.random() * 23),
        dealYear: year,
        dealMonth: month,
        dealDay: Math.floor(Math.random() * 28) + 1,
        floor: Math.floor(Math.random() * 20) + 1,
        lat: region.lat + (Math.random() - 0.5) * 0.03,
        lng: region.lng + (Math.random() - 0.5) * 0.03,
        pricePerArea,
        changeRate: (Math.random() - 0.5) * 20,
      })
    }
  })

  return mockData
}
