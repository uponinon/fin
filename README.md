# 떡락도 rock이다

공공데이터포털(data.go.kr) 실거래가 데이터를 지도/차트로 탐색하는 부동산 가격 추적 대시보드입니다.

## 기능

- 지역 검색(도로명 주소/키워드) → 행정코드(`LAWD_CD`) 자동 결정
- 기간 필터: 최근 1/3/6/12개월 + 직접 기간 설정(최대 12개월 제한, 초과 시 안내 팝업)
- 가격 범위 슬라이더(최저~최고) + “지도에 보이는 거래만” 필터(현재 지도 bounds 기준)
- 최근 거래 목록 페이지네이션(10건 단위)
- 거래 선택 시: 선택 매물 위치 지도 마커 표시 + 가격추이 탭 자동 이동(최근 12개월)
- 지역별 가격 분포(하위/중위/상위 3색 구분)

## 기술 스택

- Next.js(App Router), React, TypeScript
- TailwindCSS + Radix UI(필요 컴포넌트만 유지)
- Kakao Maps JavaScript SDK(지도/지오코딩), Recharts(차트), Sonner(토스트)

## 시작하기

### 1) 환경 변수

`.env.example`를 복사해 `.env.local`을 만들고 아래 값을 채우세요.

- `NEXT_PUBLIC_KAKAO_APP_KEY`: Kakao Developers JavaScript 키(지도/검색/지오코딩)
- `KAKAO_REST_API_KEY`: Kakao Local REST API 키(서버 프록시 지오코딩/캐시, 마커 429 방지용)
- `DATA_GO_KR_SERVICE_KEY`(선택): data.go.kr 서비스키(서버 API 연동용)

### 2) 설치/실행

```bash
npm install
npm run dev
```

- 개발 서버 포트: `http://localhost:3001`

### 3) 빌드

```bash
npm run build
```

## 공공데이터 API 연동(현재는 스켈레톤)

data.go.kr 실거래가 API는 브라우저에서 직접 호출하면 CORS/키 노출 문제가 생길 수 있어, 서버 라우트에서 호출하도록 구성했습니다.

- 구현 위치: `app/api/real-estate/route.ts`
- 프론트 호출 유틸: `lib/api/real-estate.ts`

현재 `app/api/real-estate/route.ts`에는 “연결 지점”만 마련되어 있고, 실제 XML 파싱/매핑은 TODO로 남겨두었습니다.

## 지도/마커 구현 구조

지도 컴포넌트가 커지지 않도록 hook 단위로 분리했습니다.

- `components/map/kakao-map.tsx`: 컨테이너(조합)
- `hooks/kakao/useKakaoMapsSdk.ts`: SDK 로드 + 지오코딩 큐 준비
- `hooks/kakao/useKakaoMapInstance.ts`: 지도 인스턴스 생성/이벤트
- `hooks/kakao/useKakaoTransactionOverlays.ts`: 거래 마커(overlay) 생성/지오코딩/자동 fit 관리
- `hooks/kakao/useKakaoSelectedMarker.ts`: 선택 매물 마커 + panTo

## Cloudflare Pages 배포

Cloudflare Pages의 `@cloudflare/next-on-pages`는 `next >= 14.3`를 요구합니다.

권장 설정 예시:

- Build command: `npm run pages:build`
- Output directory: `.vercel/output/static`

배포 로그에 `npx wrangler deploy`가 실행되며 `Missing entry-point` 에러가 난다면, Worker 배포(`wrangler deploy`)가 아니라 Pages 배포(`wrangler pages deploy`)로 설정해야 합니다.

- Deploy command(사용하는 경우): `npm run pages:deploy`

`Output directory ".vercel/output/static" not found`가 나오면, 빌드 명령이 `next build`만 실행되고 `@cloudflare/next-on-pages`가 실행되지 않은 경우입니다. Pages 대시보드에서 Build command가 반드시 `npm run pages:build`로 설정되어야 합니다.

## 트러블슈팅

- 지도가 로드되지 않음: Kakao Developers에 배포 도메인(또는 로컬 도메인)이 등록되어 있는지 확인
- `ERR_BLOCKED_BY_CLIENT`: 광고 차단 확장 프로그램이 Kakao SDK 요청을 차단할 수 있음
- 데이터가 적어 보임: 기간/가격/“지도에 보이는 거래만” 필터가 적용되어 있는지 확인
