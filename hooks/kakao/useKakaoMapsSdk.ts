"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { loadKakaoMaps, type KakaoMapsLoadState } from "@/lib/kakao/maps"
import { KakaoGeocoderQueue } from "@/lib/kakao/geocode"

type MapPhase =
  | { phase: "missing_key"; message: string }
  | { phase: "sdk_loading" }
  | { phase: "sdk_failed"; message: string }
  | { phase: "map_ready" }

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY

export function useKakaoMapsSdk() {
  const [phase, setPhase] = useState<MapPhase>(() => {
    if (!KAKAO_APP_KEY || KAKAO_APP_KEY.trim().length === 0) {
      return { phase: "missing_key", message: "NEXT_PUBLIC_KAKAO_APP_KEY가 설정되지 않았습니다." }
    }
    return { phase: "sdk_loading" }
  })

  const geocodeQueueRef = useRef<KakaoGeocoderQueue | null>(null)

  useEffect(() => {
    if (!KAKAO_APP_KEY || KAKAO_APP_KEY.trim().length === 0) {
      setPhase({ phase: "missing_key", message: "NEXT_PUBLIC_KAKAO_APP_KEY가 설정되지 않았습니다." })
      return
    }

    let cancelled = false
    setPhase({ phase: "sdk_loading" })

    loadKakaoMaps(KAKAO_APP_KEY).then((state: KakaoMapsLoadState) => {
      if (cancelled) return
      if (!state.ok) {
        setPhase({
          phase: state.reason === "missing_key" ? "missing_key" : "sdk_failed",
          message: state.message,
        })
        return
      }

      try {
        const geocoder = new window.kakao.maps.services.Geocoder()
        geocodeQueueRef.current = new KakaoGeocoderQueue(geocoder, {
          concurrency: 1,
          minDelayMs: 1000,
          maxRetries: 5,
          baseRetryDelayMs: 1500,
        })
      } catch {
        geocodeQueueRef.current = null
      }

      setPhase({ phase: "map_ready" })
    })

    return () => {
      cancelled = true
    }
  }, [])

  const sdkDebug = useMemo(() => {
    if (phase.phase !== "sdk_failed") return null
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const sdkUrl = KAKAO_APP_KEY
      ? `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_APP_KEY)}&autoload=false&libraries=services`
      : ""
    const hasScript =
      typeof document !== "undefined" &&
      Boolean(document.querySelector('script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]'))
    const hasKakao = typeof window !== "undefined" && Boolean((window as any).kakao)
    const hasKakaoMaps = typeof window !== "undefined" && Boolean((window as any).kakao?.maps)
    return { origin, sdkUrl, hasScript, hasKakao, hasKakaoMaps }
  }, [phase.phase])

  return { phase, geocodeQueueRef, sdkDebug }
}
