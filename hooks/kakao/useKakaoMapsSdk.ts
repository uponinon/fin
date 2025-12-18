"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { loadKakaoMaps, type KakaoMapsLoadState } from "@/lib/kakao/maps"
import { KakaoGeocoderQueue, RateLimitError } from "@/lib/kakao/geocode"

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
        const fallbackGeocoder = new window.kakao.maps.services.Geocoder()

        const geocodeFn = async (address: string) => {
          try {
            const url = `/api/kakao/geocode?query=${encodeURIComponent(address)}`
            const res = await fetch(url, { cache: "no-store" })
            if (res.status === 429) {
              const retryAfterSec = Number.parseInt(res.headers.get("Retry-After") ?? "5", 10)
              throw new RateLimitError((Number.isFinite(retryAfterSec) ? retryAfterSec : 5) * 1000)
            }
            if (res.ok) {
              const json = (await res.json()) as { coord: { lat: number; lng: number } | null }
              const c = json?.coord
              if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) return c
              return null
            }
            if (res.status !== 501) return null
          } catch (e) {
            if (e instanceof RateLimitError) throw e
          }

          return await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            fallbackGeocoder.addressSearch(address, (result: any, status: any) => {
              const servicesStatus = (window as any).kakao?.maps?.services?.Status
              const ok = servicesStatus ? status === servicesStatus.OK : false
              const first = ok ? result?.[0] : null
              const lat = first?.y ? Number.parseFloat(first.y) : NaN
              const lng = first?.x ? Number.parseFloat(first.x) : NaN
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return resolve(null)
              if (Math.abs(lat) < 0.0001 || Math.abs(lng) < 0.0001) return resolve(null)
              resolve({ lat, lng })
            })
          })
        }

        geocodeQueueRef.current = new KakaoGeocoderQueue(geocodeFn, { concurrency: 1, minDelayMs: 200, maxRetries: 5, baseRetryDelayMs: 1000 })
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
