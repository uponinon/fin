"use client"

import { useEffect, useRef } from "react"

export function useKakaoSelectedMarker(
  enabled: boolean,
  map: any,
  selectedId?: string,
  selectedPosition?: { lat: number; lng: number },
) {
  const overlayRef = useRef<any>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)
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
      if (overlayRef.current) {
        try {
          overlayRef.current.setMap(null)
        } catch {
        }
        overlayRef.current = null
      }
      elementRef.current = null
      lastPannedIdRef.current = null
      return
    }

    try {
      const pos = new (window as any).kakao.maps.LatLng(selectedPosition!.lat, selectedPosition!.lng)

      if (!overlayRef.current) {
        const el = document.createElement("div")
        el.style.width = "14px"
        el.style.height = "14px"
        el.style.borderRadius = "9999px"
        el.style.background = "#2563eb"
        el.style.border = "3px solid white"
        el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)"
        el.style.transform = "translate(-50%, -50%)"
        el.style.pointerEvents = "none"
        elementRef.current = el

        overlayRef.current = new (window as any).kakao.maps.CustomOverlay({
          position: pos,
          content: el,
          yAnchor: 0.5,
          xAnchor: 0.5,
          zIndex: 9999,
        })
        overlayRef.current.setMap(map)
      } else {
        overlayRef.current.setPosition(pos)
        overlayRef.current.setMap(map)
      }

      if (selectedId && selectedId !== lastPannedIdRef.current) {
        lastPannedIdRef.current = selectedId
        map.panTo(pos)
      }
    } catch {
    }
  }, [enabled, map, selectedId, selectedPosition?.lat, selectedPosition?.lng])
}
