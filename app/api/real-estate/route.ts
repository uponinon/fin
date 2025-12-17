import { NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { expiresAt: number; items: any[] }>()

// data.go.kr(국토교통부 실거래가) 연동은 서버에서 처리하는 것을 권장합니다.
//
// TODO:
// - `DATA_GO_KR_SERVICE_KEY`(일반 인증키/서비스키)를 `.env.local`에 넣으세요.
// - 아래 `fetchFromDataGoKr`에서 실제 API 호출 + XML 파싱 후,
//   프론트에서 쓰는 형태(RealEstateTransaction[])로 매핑해서 반환하세요.
//
// 참고(예시 API):
// - 국토교통부_아파트매매 실거래가 자료
// - https://www.data.go.kr/data/15058747/openapi.do

// 아래는 “연결 지점”만 마련해 둔 스켈레톤입니다.
// 실제 구현 시에는 fast-xml-parser/xml2js 등으로 XML을 파싱해서 items로 변환하세요.
//
// async function fetchFromDataGoKr(lawdCd: string, dealYmd: string, serviceKey: string) {
//   const endpoint =
//     "http://openapi.molit.go.kr:8081/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade"
//
//   // 주의: serviceKey는 data.go.kr에서 “Encoding” 값으로 받는 것을 권장합니다.
//   // (이미 URL 인코딩된 키를 다시 encodeURIComponent 하면 인증 실패할 수 있습니다.)
//   const params = new URLSearchParams({
//     serviceKey,
//     LAWD_CD: lawdCd,
//     DEAL_YMD: dealYmd,
//     numOfRows: "100",
//     pageNo: "1",
//   })
//
//   const res = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" })
//   if (!res.ok) throw new Error(`data.go.kr 호출 실패: ${res.status}`)
//   const xml = await res.text()
//
//   // TODO: XML 파싱 -> 결과 매핑(좌표는 별도 지오코딩/행정동 중심좌표 매핑 필요)
//   // return mappedItems
// }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lawdCd = searchParams.get("lawdCd")
  const dealYmd = searchParams.get("dealYmd")

  if (!lawdCd || !dealYmd) {
    return NextResponse.json({ message: "lawdCd, dealYmd가 필요합니다.", items: [] }, { status: 400 })
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { message: "DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다.", items: [] },
      { status: 400 },
    )
  }

  try {
    const cacheKey = `${lawdCd}:${dealYmd}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ items: cached.items })
    }

    // 일부 환경에서 8081 포트가 차단될 수 있어(사내망/샌드박스 등) HTTPS 엔드포인트를 사용합니다.
    // 참고: https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade
    const endpoint = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"

    // 주의: serviceKey는 data.go.kr에서 “Encoding” 값으로 받는 것을 권장합니다.
    // (이미 URL 인코딩된 키를 다시 encodeURIComponent 하면 인증 실패할 수 있습니다.)
    const params = new URLSearchParams({
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      numOfRows: "100",
      pageNo: "1",
    })

    const url = `${endpoint}?serviceKey=${serviceKey}&${params.toString()}`
    const res = await fetch(url, { cache: "no-store" })
    const xml = await res.text()
    if (!res.ok) {
      const hint = xml ? ` (${xml.slice(0, 80)})` : ""
      throw new Error(`data.go.kr 호출 실패: ${res.status}${hint}`)
    }

    const parser = new XMLParser({
      ignoreAttributes: true,
      trimValues: true,
    })
    const parsed = parser.parse(xml) as any
    const items = parsed?.response?.body?.items?.item ?? []
    const list = Array.isArray(items) ? items : [items]

    const mapped = list
      .filter(Boolean)
      .map((item: any, idx: number) => {
        const rawPrice = String(item.dealAmount ?? "").replaceAll(",", "").replaceAll(" ", "")
        const price = Number.parseInt(rawPrice || "0", 10)
        const area = Number.parseFloat(String(item.excluUseAr ?? "0"))

        const dongName = String(item.umdNm ?? "").trim()
        const jibun = String(item.jibun ?? "").trim()
        const apartment = String(item.aptNm ?? "").trim()
        const sggHint = String(item.estateAgentSggNm ?? "").trim() // 예: "서울 강남구"
        const address = [sggHint, dongName, jibun, apartment].filter(Boolean).join(" ")

        const dealYear = Number.parseInt(String(item.dealYear ?? "0"), 10)
        const dealMonth = Number.parseInt(String(item.dealMonth ?? "0"), 10)
        const dealDay = Number.parseInt(String(item.dealDay ?? "0"), 10)
        const floor = Number.parseInt(String(item.floor ?? "0"), 10)
        const buildYear = Number.parseInt(String(item.buildYear ?? "0"), 10)

        const pyeong = area * 0.3025
        const pricePerArea = pyeong > 0 ? Math.floor(price / pyeong) : 0

        return {
          id: `${lawdCd}-${dealYmd}-${idx}`,
          address,
          dongName,
          jibun,
          price,
          area,
          buildYear,
          dealYear,
          dealMonth,
          dealDay,
          floor,
          // 실거래가 API는 좌표를 제공하지 않는 경우가 많습니다.
          // 지도 표시는 클라이언트에서 Kakao 지도 Geocoder(services)로 주소->좌표를 변환합니다.
          lat: 0,
          lng: 0,
          pricePerArea,
        }
      })

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, items: mapped })
    return NextResponse.json({ items: mapped })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "알 수 없는 오류", items: [] },
      { status: 500 },
    )
  }
}
