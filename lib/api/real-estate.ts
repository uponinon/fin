// 공공 데이터 포털 (data.go.kr) API 연동 유틸리티
// API 키는 https://www.data.go.kr/ 에서 발급받아 환경 변수에 설정하세요

// 부동산 실거래가 데이터 타입
export interface RealEstateTransaction {
  id: string
  address: string
  dongName: string // 동 이름
  jibun: string // 지번
  price: number // 거래금액 (만원)
  area: number // 전용면적 (㎡)
  buildYear: number // 건축년도
  dealYear: number // 거래년도
  dealMonth: number // 거래월
  dealDay: number // 거래일
  floor: number // 층
  lat: number // 위도
  lng: number // 경도
  pricePerArea: number // 평당 가격
  changeRate?: number // 가격 변동률 (%)
}

// 가격 변동 통계 데이터 타입
export interface PriceStatistics {
  period: string // 기간 (YYYY-MM)
  avgPrice: number // 평균 가격
  maxPrice: number // 최고 가격
  minPrice: number // 최저 가격
  transactionCount: number // 거래 건수
  changeRate: number // 전월 대비 변동률 (%)
}

// 지역별 가격대 통계
export interface RegionPriceRange {
  region: string
  low: number // 저가 (하위 25%)
  medium: number // 중가 (중위값)
  high: number // 고가 (상위 25%)
  count: number // 거래 건수
}

/**
 * data.go.kr API에서 부동산 실거래가 데이터를 가져옵니다
 * API 문서: https://www.data.go.kr/data/15058747/openapi.do
 *
 * @param lawd_cd 지역코드 (예: 11110 - 서울 종로구)
 * @param deal_ymd 계약년월 (예: 202401)
 * @returns 부동산 거래 데이터 배열
 */
export async function fetchRealEstateData(lawd_cd: string, deal_ymd: string): Promise<RealEstateTransaction[]> {
  // TODO: 실제 API 키를 환경 변수에 설정하세요
  // const API_KEY = process.env.NEXT_PUBLIC_DATA_GO_KR_API_KEY;
  const API_KEY = "여기에_API_키를_입력하세요"

  if (!API_KEY || API_KEY === "여기에_API_키를_입력하세요") {
    console.warn("⚠️ data.go.kr API 키가 설정되지 않았습니다. 목업 데이터를 사용합니다.")
    return generateMockData(lawd_cd, deal_ymd)
  }

  try {
    // 실제 API 엔드포인트 예시 (아파트 실거래가 조회)
    const API_URL =
      "http://openapi.molit.go.kr:8081/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade"

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      LAWD_CD: lawd_cd,
      DEAL_YMD: deal_ymd,
      numOfRows: "100",
      pageNo: "1",
    })

    const response = await fetch(`${API_URL}?${params}`)

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`)
    }

    const data = await response.text()

    // TODO: XML 파싱 로직 구현
    // data.go.kr API는 XML 형식으로 응답을 반환합니다
    // xml2js 또는 fast-xml-parser 라이브러리를 사용하여 파싱하세요

    console.log("API 응답:", data)

    // 파싱된 데이터를 RealEstateTransaction 타입으로 변환
    return parseAPIResponse(data)
  } catch (error) {
    console.error("API 호출 오류:", error)
    // 오류 발생 시 목업 데이터 반환
    return generateMockData(lawd_cd, deal_ymd)
  }
}

/**
 * XML API 응답을 파싱하여 RealEstateTransaction 배열로 변환
 */
function parseAPIResponse(xmlData: string): RealEstateTransaction[] {
  // TODO: XML 파싱 로직 구현
  // 예시: xml2js 라이브러리 사용
  // const parser = new xml2js.Parser();
  // const result = await parser.parseStringPromise(xmlData);

  // 임시로 빈 배열 반환
  return []
}

/**
 * 개발 및 테스트를 위한 목업 데이터 생성
 */
function generateMockData(lawd_cd: string, deal_ymd: string): RealEstateTransaction[] {
  const mockData: RealEstateTransaction[] = []
  const basePrice = 50000 // 기본 가격 5억원

  // 서울 주요 지역 좌표 (예시)
  const regions = [
    { name: "강남구", lat: 37.5172, lng: 127.0473, priceMultiplier: 2.0 },
    { name: "서초구", lat: 37.4837, lng: 127.0324, priceMultiplier: 1.8 },
    { name: "송파구", lat: 37.5145, lng: 127.1059, priceMultiplier: 1.5 },
    { name: "마포구", lat: 37.5663, lng: 126.9019, priceMultiplier: 1.3 },
    { name: "영등포구", lat: 37.5264, lng: 126.8963, priceMultiplier: 1.2 },
  ]

  regions.forEach((region, regionIdx) => {
    // 각 지역당 20개의 거래 데이터 생성
    for (let i = 0; i < 20; i++) {
      const price = Math.floor(basePrice * region.priceMultiplier * (0.7 + Math.random() * 0.6))
      const area = 60 + Math.random() * 80 // 60~140㎡
      const pricePerArea = Math.floor(price / (area * 0.3025)) // 만원/평

      mockData.push({
        id: `${regionIdx}-${i}`,
        address: `서울시 ${region.name} ${i + 1}단지`,
        dongName: region.name,
        jibun: `${100 + i}-${Math.floor(Math.random() * 20)}`,
        price,
        area: Math.floor(area * 10) / 10,
        buildYear: 2000 + Math.floor(Math.random() * 23),
        dealYear: Number.parseInt(deal_ymd.substring(0, 4)),
        dealMonth: Number.parseInt(deal_ymd.substring(4, 6)),
        dealDay: Math.floor(Math.random() * 28) + 1,
        floor: Math.floor(Math.random() * 20) + 1,
        lat: region.lat + (Math.random() - 0.5) * 0.03,
        lng: region.lng + (Math.random() - 0.5) * 0.03,
        pricePerArea,
        changeRate: (Math.random() - 0.5) * 20, // -10% ~ +10%
      })
    }
  })

  return mockData
}

/**
 * 최근 N개월간의 가격 변동 통계를 가져옵니다
 */
export async function fetchPriceStatistics(lawd_cd: string, months = 12): Promise<PriceStatistics[]> {
  const statistics: PriceStatistics[] = []
  const currentDate = new Date()

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(currentDate)
    targetDate.setMonth(targetDate.getMonth() - i)

    const year = targetDate.getFullYear()
    const month = (targetDate.getMonth() + 1).toString().padStart(2, "0")
    const period = `${year}${month}`

    // 해당 월의 데이터 가져오기
    const data = await fetchRealEstateData(lawd_cd, period)

    if (data.length > 0) {
      const prices = data.map((d) => d.price)
      const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length)
      const maxPrice = Math.max(...prices)
      const minPrice = Math.min(...prices)

      // 전월 대비 변동률 계산
      let changeRate = 0
      if (i > 0 && statistics[i - 1]) {
        changeRate = ((avgPrice - statistics[i - 1].avgPrice) / statistics[i - 1].avgPrice) * 100
      }

      statistics.push({
        period: `${year}-${month}`,
        avgPrice,
        maxPrice,
        minPrice,
        transactionCount: data.length,
        changeRate,
      })
    }
  }

  return statistics.reverse() // 오래된 순서로 정렬
}

/**
 * 지역별 가격대 통계를 계산합니다
 */
export function calculateRegionPriceRanges(data: RealEstateTransaction[]): RegionPriceRange[] {
  const regionMap = new Map<string, number[]>()

  // 지역별 가격 데이터 그룹화
  data.forEach((item) => {
    if (!regionMap.has(item.dongName)) {
      regionMap.set(item.dongName, [])
    }
    regionMap.get(item.dongName)!.push(item.price)
  })

  // 통계 계산
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

  return results.sort((a, b) => b.medium - a.medium) // 중위값 기준 내림차순
}

/**
 * 가격대별 색상을 반환합니다 (지도 마커용)
 */
export function getPriceColor(price: number): string {
  if (price >= 150000) return "#dc2626" // 15억 이상 - 빨강 (고가)
  if (price >= 100000) return "#ea580c" // 10억 이상 - 주황
  if (price >= 70000) return "#f59e0b" // 7억 이상 - 노랑
  if (price >= 50000) return "#10b981" // 5억 이상 - 초록
  return "#3b82f6" // 5억 미만 - 파랑 (저가)
}

/**
 * 가격을 한국 통화 형식으로 포맷합니다
 */
export function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000)
    const man = Math.floor(price % 10000)
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`
  }
  return `${price}만원`
}

/**
 * 변동률을 표시 형식으로 포맷합니다
 */
export function formatChangeRate(rate: number): string {
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${rate.toFixed(2)}%`
}
