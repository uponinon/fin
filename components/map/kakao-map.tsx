"use client"

import { useEffect, useRef, useState } from "react"
import { type RealEstateTransaction, getPriceColor } from "@/lib/api/real-estate"
import { Card } from "@/components/ui/card"

// Kakao Maps JavaScript API 타입 선언
declare global {
  interface Window {
    kakao: any
  }
}

interface KakaoMapProps {
  data: RealEstateTransaction[]
  onMarkerClick?: (transaction: RealEstateTransaction) => void
}

export function KakaoMap({ data, onMarkerClick }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Kakao Maps API 스크립트 로드
  useEffect(() => {
    // TODO: 실제 Kakao JavaScript API 키를 입력하세요
    // API 키 발급: https://developers.kakao.com/
    const KAKAO_API_KEY = "여기에_카카오_앱_키를_입력하세요"

    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`
    script.async = true

    script.onload = () => {
      window.kakao.maps.load(() => {
        setIsLoaded(true)
      })
    }

    script.onerror = () => {
      console.error("❌ Kakao Maps API 로드 실패. API 키를 확인하세요.")
      setIsLoaded(false)
    }

    document.head.appendChild(script)

    return () => {
      // 클린업
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance) return

    // 서울 중심 좌표
    const centerLat = 37.5665
    const centerLng = 126.978

    try {
      const container = mapRef.current
      const options = {
        center: new window.kakao.maps.LatLng(centerLat, centerLng),
        level: 7, // 확대 레벨
      }

      const map = new window.kakao.maps.Map(container, options)
      setMapInstance(map)

      // 지도 컨트롤 추가
      const zoomControl = new window.kakao.maps.ZoomControl()
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT)
    } catch (error) {
      console.error("지도 초기화 오류:", error)
    }
  }, [isLoaded, mapInstance])

  // 마커 표시
  useEffect(() => {
    if (!mapInstance || !window.kakao) return

    // 기존 마커 제거
    markers.forEach((marker) => marker.setMap(null))

    // 새 마커 생성
    const newMarkers = data.map((transaction) => {
      const position = new window.kakao.maps.LatLng(transaction.lat, transaction.lng)
      const color = getPriceColor(transaction.price)

      // 커스텀 마커 HTML
      const markerContent = `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
        ">
          ${Math.floor(transaction.price / 10000)}억
        </div>
      `

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        zIndex: 1,
      })

      customOverlay.setMap(mapInstance)

      // 클릭 이벤트 (오버레이는 직접 이벤트 바인딩 필요)
      if (onMarkerClick) {
        const element = customOverlay.getContent()
        if (element) {
          element.addEventListener("click", () => {
            onMarkerClick(transaction)
          })
        }
      }

      return customOverlay
    })

    setMarkers(newMarkers)

    // 지도 범위 조정 (모든 마커가 보이도록)
    if (data.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds()
      data.forEach((transaction) => {
        bounds.extend(new window.kakao.maps.LatLng(transaction.lat, transaction.lng))
      })
      mapInstance.setBounds(bounds)
    }
  }, [mapInstance, data])

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

      {/* 범례 */}
      <Card className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold mb-2">가격대별 색상</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#3b82f6]" />
            <span>5억 미만</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10b981]" />
            <span>5억 ~ 7억</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#f59e0b]" />
            <span>7억 ~ 10억</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ea580c]" />
            <span>10억 ~ 15억</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#dc2626]" />
            <span>15억 이상</span>
          </div>
        </div>
      </Card>

      {/* 데이터 카운트 */}
      <Card className="absolute top-4 left-4 px-4 py-2 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold">
          총 <span className="text-primary">{data.length}</span>건의 거래
        </div>
      </Card>
    </div>
  )
}
