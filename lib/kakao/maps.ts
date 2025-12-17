let kakaoMapsLoadPromise: Promise<void> | null = null

export type KakaoMapsLoadState =
  | { ok: true }
  | { ok: false; reason: "missing_key" | "load_failed"; message: string }

export function loadKakaoMaps(appKey: string): Promise<KakaoMapsLoadState> {
  if (!appKey || appKey.trim().length === 0) {
    return Promise.resolve({
      ok: false,
      reason: "missing_key",
      message: "NEXT_PUBLIC_KAKAO_APP_KEY가 설정되지 않았습니다.",
    })
  }

  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, reason: "load_failed", message: "브라우저 환경이 아닙니다." })
  }

  if ((window as any).kakao?.maps) {
    return Promise.resolve({ ok: true })
  }

  if (!kakaoMapsLoadPromise) {
    kakaoMapsLoadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-maps-sdk="true"]')
      if (existing && (existing.hasAttribute("crossorigin") || existing.dataset.kakaoMapsSdkStatus === "error")) {
        existing.remove()
      }
      if (existing && !existing.hasAttribute("crossorigin") && existing.dataset.kakaoMapsSdkStatus !== "error") {
        existing.addEventListener("load", () => resolve(), { once: true })
        existing.addEventListener("error", () => reject(new Error("Kakao Maps SDK 로드 실패")), { once: true })
        return
      }

      const script = document.createElement("script")
      script.dataset.kakaoMapsSdk = "true"
      script.dataset.kakaoMapsSdkStatus = "loading"
      script.async = true
      // Kakao 측 도메인 검증은 Referer/Origin에 의존하는 경우가 있어 origin만 보내도록 고정합니다.
      // (일부 브라우저/확장프로그램에서 기본 policy가 변경되면 401이 나는 케이스가 있음)
      script.referrerPolicy = "origin"
      // 주소→좌표 변환(services) 사용
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
      script.onload = () => {
        script.dataset.kakaoMapsSdkStatus = "loaded"
        resolve()
      }
      script.onerror = () => {
        script.dataset.kakaoMapsSdkStatus = "error"
        reject(new Error("Kakao Maps SDK 로드 실패"))
      }
      document.head.appendChild(script)
    })
  }

  return kakaoMapsLoadPromise
    .then(
      () =>
        new Promise<KakaoMapsLoadState>((resolve) => {
          ;(window as any).kakao.maps.load(() => resolve({ ok: true }))
        }),
    )
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Kakao Maps SDK 로드 실패"
      return { ok: false, reason: "load_failed", message }
    })
}
