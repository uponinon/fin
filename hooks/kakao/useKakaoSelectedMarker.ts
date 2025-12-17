"use client"

import { useEffect, useRef } from "react"

export function useKakaoSelectedMarker(
  enabled: boolean,
  map: any,
  selectedId?: string,
  selectedPosition?: { lat: number; lng: number },
) {
  const markerRef = useRef<any>(null)
  const lastPannedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !map) return

    const isValid =
      Boolean(selectedPosition) &&
      Number.isFinite(selectedPosition!.lat) &&
      Number.isFinite(selectedPosition!.lng) &&
      Math.abs(selectedPosition!.lat) > 0.0001 &&
      Math.abs(selectedPosition!.lng) > 0.0001

    if (!isValid) {
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null)
        } catch {
        }
        markerRef.current = null
      }
      lastPannedIdRef.current = null
      return
    }

    try {
      const pos = new (window as any).kakao.maps.LatLng(selectedPosition!.lat, selectedPosition!.lng)
      if (!markerRef.current) {
        markerRef.current = new (window as any).kakao.maps.Marker({ position: pos, zIndex: 9999 })
        markerRef.current.setMap(map)
      } else {
        markerRef.current.setPosition(pos)
        markerRef.current.setMap(map)
      }

      if (selectedId && selectedId !== lastPannedIdRef.current) {
        lastPannedIdRef.current = selectedId
        map.panTo(pos)
      }
    } catch {
    }
  }, [enabled, map, selectedId, selectedPosition?.lat, selectedPosition?.lng])
}
