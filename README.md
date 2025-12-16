# fin

공공데이터포털(data.go.kr) + Kakao Maps 기반 부동산 가격 추적 대시보드(Next.js).

## 실행

1) `.env.example`을 복사해서 `.env.local` 생성
2) 아래 값 채우기

- `NEXT_PUBLIC_KAKAO_APP_KEY`: Kakao Developers JavaScript 키
- `DATA_GO_KR_SERVICE_KEY`: data.go.kr 서비스키(일반 인증키 Encoding 권장)

3) 설치/실행

```bash
pnpm i
pnpm dev
```

## 공공 API 연동(현재 TODO)

`app/api/real-estate/route.ts`에 외부 API 호출 + XML 파싱 로직을 구현하면,
프론트는 자동으로 실데이터를 표시합니다(실패 시 목업 데이터로 폴백).

