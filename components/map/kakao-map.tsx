"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { RealEstateTransaction } from "@/lib/api/real-estate"
import { Card } from "@/components/ui/card"
import { useKakaoMapsSdk } from "@/hooks/kakao/useKakaoMapsSdk"
import { useKakaoMapInstance } from "@/hooks/kakao/useKakaoMapInstance"
import { useKakaoSelectedMarker } from "@/hooks/kakao/useKakaoSelectedMarker"

declare global {
  interface Window {
    kakao?: any
  }
}

type MapBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }

interface KakaoMapProps {
  data: RealEstateTransaction[]
  center?: { lat: number; lng: number }
  onViewportChange?: (bounds: MapBounds) => void
  onPositionsChange?: (positions: Record<string, { lat: number; lng: number }>) => void
  fitBoundsSignal?: number
  autoFitBounds?: boolean
  selectedId?: string
  selectedPosition?: { lat: number; lng: number }
  selectedTransaction?: RealEstateTransaction | null
}

function isValidCoord(pos?: { lat: number; lng: number }) {
  return (
    Boolean(pos) &&
    Number.isFinite(pos!.lat) &&
    Number.isFinite(pos!.lng) &&
    Math.abs(pos!.lat) > 0.0001 &&
    Math.abs(pos!.lng) > 0.0001
  )
}

function geocodeQueryFromTransaction(t: RealEstateTransaction) {
  const address = String(t.address ?? "").trim()
  const dongName = String(t.dongName ?? "").trim()
  const jibun = String(t.jibun ?? "").trim()

  if (!address || !dongName || !jibun) return address || `${dongName} ${jibun}`.trim()

  const idx = address.indexOf(dongName)
  if (idx < 0) return address

  const prefix = address.slice(0, idx + dongName.length)
  const withoutCommaPrefix = prefix.split(",").pop()?.trim() || prefix.trim()
  return `${withoutCommaPrefix} ${jibun}`.trim()
}

export function KakaoMap({
  data,
  center,
  onViewportChange,
  onPositionsChange,
  fitBoundsSignal,
  autoFitBounds = true,
  selectedId,
  selectedPosition,
  selectedTransaction,
}: KakaoMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const { phase, geocodeQueueRef, sdkDebug } = useKakaoMapsSdk()

  const mapEnabled = phase.phase === "map_ready"
  const { map, userInteractedRef } = useKakaoMapInstance(mapEnabled, mapElementRef, onViewportChange)

  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const lastRequestedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!mapEnabled) return
    if (!map) return
    if (!selectedId) {
      setSelectedCoord(undefined)
      lastRequestedIdRef.current = null
      return
    }

    if (isValidCoord(selectedPosition)) {
      setSelectedCoord(selectedPosition)
      return
    }

    if (selectedTransaction && selectedTransaction.id === selectedId) {
      const direct = { lat: selectedTransaction.lat, lng: selectedTransaction.lng }
      if (isValidCoord(direct)) {
        setSelectedCoord(direct)
        onPositionsChange?.({ [selectedId]: direct })
        return
      }
    }

    const queue = geocodeQueueRef.current
    if (!queue || !selectedTransaction || selectedTransaction.id !== selectedId) return
    if (lastRequestedIdRef.current === selectedId) return
    lastRequestedIdRef.current = selectedId

    let cancelled = false
    const query = geocodeQueryFromTransaction(selectedTransaction)

    void (async () => {
      const coord = await queue.geocode(query)
      if (cancelled) return
      if (!coord) return
      setSelectedCoord(coord)
      onPositionsChange?.({ [selectedId]: coord })
    })()

    return () => {
      cancelled = true
    }
  }, [
    mapEnabled,
    map,
    selectedId,
    selectedPosition?.lat,
    selectedPosition?.lng,
    selectedTransaction?.id,
    geocodeQueueRef,
    onPositionsChange,
  ])

  useEffect(() => {
    if (!mapEnabled) return
    if (!map) return
    if (!center) return
    userInteractedRef.current = false
    try {
      map.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
    } catch {
    }
  }, [mapEnabled, map, userInteractedRef, center?.lat, center?.lng])

  useEffect(() => {
    if (!mapEnabled) return
    if (!fitBoundsSignal) return
    if (!map) return
    if (!center) return
    userInteractedRef.current = false
    try {
      map.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
      if (autoFitBounds) map.setLevel(6)
    } catch {
    }
  }, [mapEnabled, fitBoundsSignal, map, userInteractedRef, center?.lat, center?.lng, autoFitBounds])

  useKakaoSelectedMarker(mapEnabled, map, selectedId, selectedCoord)

  const legend = useMemo(
    () => [
      { label: "5억 미만", color: "#3b82f6" },
      { label: "5억~7억", color: "#10b981" },
      { label: "7억~10억", color: "#f59e0b" },
      { label: "10억~15억", color: "#ea580c" },
      { label: "15억 이상", color: "#dc2626" },
    ],
    [],
  )

  if (phase.phase === "missing_key") {
    return (
      <Card className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도 API 키가 필요합니다.</div>
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
                DevTools → Network에서 `sdk.js` 상태코드를 확인하세요.
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
          <div className="text-lg font-semibold">지도를 불러오는 중..</div>
          <div className="text-sm text-muted-foreground">Kakao Maps SDK를 다운로드/초기화하고 있습니다.</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapElementRef} className="w-full h-full rounded-lg overflow-hidden" />

      <div className="absolute left-3 bottom-3 z-10">
        <Card className="p-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            가격 마커는 표시하지 않습니다. 거래 목록에서 매물을 선택하면 해당 위치만 마킹됩니다.
          </div>
        </Card>
      </div>

      <div className="hidden">{data.length}</div>
    </div>
  )
}
