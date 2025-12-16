import { NextResponse } from "next/server"

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

  // 아직 실제 연동은 비워둡니다(요청하신 '빈칸+주석' 형태).
  // 키만 넣고 바로 붙일 수 있도록 서버 엔드포인트 구조만 잡아둔 상태입니다.
  return NextResponse.json(
    {
      message: "TODO: data.go.kr 연동 구현 필요 (fetchFromDataGoKr + XML 파싱).",
      items: [],
    },
    { status: 501 },
  )
}
