"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { type RealEstateTransaction, getPriceColor } from "@/lib/api/real-estate"
import { Card } from "@/components/ui/card"

declare global {
  interface Window {
    kakao?: any
  }
}

interface KakaoMapProps {
  data: RealEstateTransaction[]
  onMarkerClick?: (transaction: RealEstateTransaction) => void
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY

export function KakaoMap({ data, onMarkerClick }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [overlays, setOverlays] = useState<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const hasKey = Boolean(KAKAO_APP_KEY && KAKAO_APP_KEY.trim().length > 0)

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

  // Kakao Maps JS SDK 로드
  useEffect(() => {
    if (!hasKey) return

    if (window.kakao?.maps) {
      setIsLoaded(true)
      return
    }

    // TODO: Kakao Developers에서 JavaScript 키 발급 후 `.env.local`에 설정하세요.
    // NEXT_PUBLIC_KAKAO_APP_KEY=...
    const script = document.createElement("script")
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_APP_KEY!)}&autoload=false`
    script.async = true

    script.onload = () => {
      window.kakao.maps.load(() => setIsLoaded(true))
    }

    script.onerror = () => {
      console.error("Kakao Maps API 로드 실패. 앱 키/도메인 설정을 확인하세요.")
      setIsLoaded(false)
    }

    document.head.appendChild(script)
    return () => script.remove()
  }, [hasKey])

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance) return

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 7,
    })
    setMapInstance(map)

    const zoomControl = new window.kakao.maps.ZoomControl()
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT)
  }, [isLoaded, mapInstance])

  // 마커(오버레이) 렌더링
  useEffect(() => {
    if (!mapInstance || !window.kakao?.maps) return

    overlays.forEach((overlay) => overlay.setMap(null))

    const newOverlays = data.map((transaction) => {
      const position = new window.kakao.maps.LatLng(transaction.lat, transaction.lng)
      const color = getPriceColor(transaction.price)

      const el = document.createElement("div")
      el.style.background = color
      el.style.width = "32px"
      el.style.height = "32px"
      el.style.borderRadius = "50%"
      el.style.border = "3px solid white"
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"
      el.style.cursor = "pointer"
      el.style.display = "flex"
      el.style.alignItems = "center"
      el.style.justifyContent = "center"
      el.style.fontSize = "10px"
      el.style.fontWeight = "700"
      el.style.color = "white"
      el.textContent = `${Math.floor(transaction.price / 10000)}억`

      if (onMarkerClick) el.addEventListener("click", () => onMarkerClick(transaction))

      const overlay = new window.kakao.maps.CustomOverlay({ position, content: el, zIndex: 1 })
      overlay.setMap(mapInstance)
      return overlay
    })

    setOverlays(newOverlays)

    if (data.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds()
      data.forEach((transaction) => {
        bounds.extend(new window.kakao.maps.LatLng(transaction.lat, transaction.lng))
      })
      mapInstance.setBounds(bounds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, data, onMarkerClick])

  if (!hasKey) {
    return (
      <Card className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도 API 키가 필요합니다</div>
          <div className="text-sm text-muted-foreground">
            `.env.local`에 `NEXT_PUBLIC_KAKAO_APP_KEY`를 설정하면 지도가 표시됩니다.
          </div>
        </div>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">지도를 불러오는 중...</div>
          <div className="text-sm text-muted-foreground">Kakao Maps API를 로드하고 있습니다.</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />

      <Card className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold mb-2">가격대별 색상</div>
        <div className="space-y-1 text-xs">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="absolute top-4 left-4 px-4 py-2 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold">
          총 <span className="text-primary">{data.length}</span>건의 거래
        </div>
      </Card>
    </div>
  )
}

