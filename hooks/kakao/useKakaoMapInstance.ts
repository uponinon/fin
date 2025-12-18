"use client"

import { useEffect, useRef, useState } from "react"

type MapBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }

export function useKakaoMapInstance(
  enabled: boolean,
  mapElementRef: React.RefObject<HTMLDivElement | null>,
  onViewportChange?: (bounds: MapBounds) => void,
) {
  const [map, setMap] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const userInteractedRef = useRef(false)
  const viewportNotifyTimerRef = useRef<any>(null)
  const onViewportChangeRef = useRef<typeof onViewportChange>(onViewportChange)
  const mapEventHandlersRef = useRef<{ dragstart?: any; zoomstart?: any; idle?: any } | null>(null)

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    if (!enabled) return
    if (!mapElementRef.current) return
    if (mapRef.current) return

    const instance = new (window as any).kakao.maps.Map(mapElementRef.current, {
      center: new (window as any).kakao.maps.LatLng(37.5665, 126.978),
      level: 7,
      draggable: true,
      scrollwheel: true,
      disableDoubleClick: false,
    })
    mapRef.current = instance
    setMap(instance)

    const zoomControl = new (window as any).kakao.maps.ZoomControl()
    instance.addControl(zoomControl, (window as any).kakao.maps.ControlPosition.RIGHT)

    try {
      const dragstart = () => {
        userInteractedRef.current = true
      }
      const zoomstart = () => {
        userInteractedRef.current = true
      }
      const idle = () => {
        const cb = onViewportChangeRef.current
        if (!cb) return
        if (viewportNotifyTimerRef.current) return
        viewportNotifyTimerRef.current = setTimeout(() => {
          viewportNotifyTimerRef.current = null
          try {
            const b = instance.getBounds()
            const sw = b.getSouthWest()
            const ne = b.getNorthEast()
            cb({ sw: { lat: sw.getLat(), lng: sw.getLng() }, ne: { lat: ne.getLat(), lng: ne.getLng() } })
          } catch {
          }
        }, 50)
      }

      mapEventHandlersRef.current = { dragstart, zoomstart, idle }
      ;(window as any).kakao.maps.event.addListener(instance, "dragstart", dragstart)
      ;(window as any).kakao.maps.event.addListener(instance, "zoom_start", zoomstart)
      ;(window as any).kakao.maps.event.addListener(instance, "idle", idle)
    } catch {
    }

    return () => {
      try {
        const h = mapEventHandlersRef.current
        if (h?.dragstart) (window as any).kakao.maps.event.removeListener(instance, "dragstart", h.dragstart)
        if (h?.zoomstart) (window as any).kakao.maps.event.removeListener(instance, "zoom_start", h.zoomstart)
        if (h?.idle) (window as any).kakao.maps.event.removeListener(instance, "idle", h.idle)
        mapEventHandlersRef.current = null
      } catch {
      }
      if (viewportNotifyTimerRef.current) {
        clearTimeout(viewportNotifyTimerRef.current)
        viewportNotifyTimerRef.current = null
      }
    }
  }, [enabled, mapElementRef])

  return { map, mapRef, userInteractedRef }
}

