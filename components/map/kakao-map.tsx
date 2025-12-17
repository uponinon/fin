"use client"

import { useEffect, useMemo, useRef } from "react"
import { type RealEstateTransaction } from "@/lib/api/real-estate"
import { Card } from "@/components/ui/card"
import { KakaoMapHud } from "@/components/map/kakao-map-hud"
import { useKakaoMapsSdk } from "@/hooks/kakao/useKakaoMapsSdk"
import { useKakaoMapInstance } from "@/hooks/kakao/useKakaoMapInstance"
import { useKakaoSelectedMarker } from "@/hooks/kakao/useKakaoSelectedMarker"
import { useKakaoTransactionOverlays } from "@/hooks/kakao/useKakaoTransactionOverlays"

declare global {
  interface Window {
    kakao?: any
  }
}

interface KakaoMapProps {
  data: RealEstateTransaction[]
  center?: { lat: number; lng: number }
  onMarkerClick?: (transaction: RealEstateTransaction) => void
  onViewportChange?: (bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => void
  onPositionsChange?: (positions: Record<string, { lat: number; lng: number }>) => void
  fitBoundsSignal?: number
  autoFitBounds?: boolean
  selectedId?: string
  selectedPosition?: { lat: number; lng: number }
}

export function KakaoMap({
  data,
  center,
  onMarkerClick,
  onViewportChange,
  onPositionsChange,
  fitBoundsSignal,
  autoFitBounds = true,
  selectedId,
  selectedPosition,
}: KakaoMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const { phase, geocodeQueueRef, sdkDebug } = useKakaoMapsSdk()

  const mapEnabled = phase.phase === "map_ready"
  const { mapRef, userInteractedRef } = useKakaoMapInstance(mapEnabled, mapElementRef, onViewportChange)

  const overlays = useKakaoTransactionOverlays({
    enabled: mapEnabled,
    map: mapRef.current,
    data,
    geocodeQueueRef,
    autoFitBounds,
    userInteractedRef,
    onMarkerClick,
    onPositionsChange,
  })

  useEffect(() => {
    if (!mapEnabled) return
    const map = mapRef.current
    if (!map) return
    if (!center) return
    userInteractedRef.current = false
    try {
      map.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
    } catch {
    }
  }, [mapEnabled, mapRef, userInteractedRef, center?.lat, center?.lng])

  useEffect(() => {
    if (!mapEnabled) return
    if (!fitBoundsSignal) return
    overlays.fitToLastBounds()
  }, [mapEnabled, fitBoundsSignal, overlays])

  useKakaoSelectedMarker(mapEnabled, mapRef.current, selectedId, selectedPosition)

  const legend = useMemo(
    () => [
      { label: "5억 미만", color: "#3b82f6" },
      { label: "5억 ~ 7억", color: "#10b981" },
      { label: "7억 ~ 10억", color: "#f59e0b" },
      { label: "10억 ~ 15억", color: "#ea580c" },
      { label: "15억 이상", color: "#dc2626" },
    ],
    [],
  )

  if (phase.phase === "missing_key") {
    return (
      <Card className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도 API 키가 필요합니다</div>
          <div className="text-sm text-muted-foreground">{phase.message}</div>
        </div>
      </Card>
    )
  }

  if (phase.phase === "sdk_failed") {
    const origin = sdkDebug?.origin ?? ""
    const sdkUrl = sdkDebug?.sdkUrl ?? ""
    const hasScript = sdkDebug?.hasScript ?? false
    const hasKakao = sdkDebug?.hasKakao ?? false
    const hasKakaoMaps = sdkDebug?.hasKakaoMaps ?? false

    return (
      <Card className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도 로드 실패</div>
          <div className="text-sm text-muted-foreground">
            {phase.message}
            <br />
            (도메인 등록/광고차단/네트워크를 확인하세요)
          </div>
          {origin ? (
            <div className="text-xs text-muted-foreground">
              현재 접속 도메인: <span className="font-mono">{origin}</span>
              <br />
              Kakao Developers → 내 애플리케이션 → 플랫폼(Web) → 사이트 도메인에 위 값을 추가하세요.
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">
            상태: script태그 {hasScript ? "있음" : "없음"}, window.kakao {hasKakao ? "있음" : "없음"}, window.kakao.maps{" "}
            {hasKakaoMaps ? "있음" : "없음"}
          </div>
          {sdkUrl ? (
            <div className="pt-2 space-y-2">
              <a className="text-xs text-primary hover:underline" href={sdkUrl} target="_blank" rel="noreferrer">
                SDK URL 직접 열어보기(새 탭)
              </a>
              <div className="text-[10px] text-muted-foreground">
                브라우저 DevTools → Network에서 `sdk.js`를 검색해 상태코드를 확인하세요.
                <br />
                `ERR_BLOCKED_BY_CLIENT`면 광고차단/보안프로그램이 차단 중입니다.
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    )
  }

  if (phase.phase === "sdk_loading") {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도를 불러오는 중...</div>
          <div className="text-sm text-muted-foreground">Kakao Maps SDK를 다운로드/초기화하고 있습니다.</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapElementRef} className="w-full h-full rounded-lg overflow-hidden" />
      <KakaoMapHud legend={legend} totalCount={data.length} markerProgress={overlays.markerProgress} />
    </div>
  )
}
