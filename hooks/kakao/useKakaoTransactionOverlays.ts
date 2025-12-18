"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getPriceColor, type RealEstateTransaction } from "@/lib/api/real-estate"
import type { KakaoGeocoderQueue, GeocodeProgress } from "@/lib/kakao/geocode"

type MarkerProgress = GeocodeProgress

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

export function useKakaoTransactionOverlays(options: {
  enabled: boolean
  map: any
  data: RealEstateTransaction[]
  geocodeQueueRef: React.RefObject<KakaoGeocoderQueue | null>
  autoFitBounds: boolean
  userInteractedRef: React.RefObject<boolean>
  onMarkerClick?: (t: RealEstateTransaction) => void
  onPositionsChange?: (positions: Record<string, { lat: number; lng: number }>) => void
}) {
  const { enabled, map, data, geocodeQueueRef, autoFitBounds, userInteractedRef, onMarkerClick, onPositionsChange } = options

  const overlaysRef = useRef<any[]>([])
  const boundsUpdateTimerRef = useRef<any>(null)
  const positionsByIdRef = useRef<Record<string, { lat: number; lng: number }>>({})
  const positionsNotifyTimerRef = useRef<any>(null)
  const lastDataBoundsRef = useRef<any>(null)
  const autoFittedRef = useRef(false)

  const onMarkerClickRef = useRef<typeof onMarkerClick>(onMarkerClick)
  const onPositionsChangeRef = useRef<typeof onPositionsChange>(onPositionsChange)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  }, [onMarkerClick])
  useEffect(() => {
    onPositionsChangeRef.current = onPositionsChange
  }, [onPositionsChange])

  const [markerProgress, setMarkerProgress] = useState<MarkerProgress>({
    total: 0,
    resolved: 0,
    queued: 0,
    inFlight: 0,
    failed: 0,
  })

  useEffect(() => {
    positionsByIdRef.current = {}
    if (positionsNotifyTimerRef.current) {
      clearTimeout(positionsNotifyTimerRef.current)
      positionsNotifyTimerRef.current = null
    }
  }, [data])

  useEffect(() => {
    if (!enabled || !map) return

    autoFittedRef.current = false
    overlaysRef.current.forEach((o) => {
      try {
        o.setMap(null)
      } catch {
      }
    })
    overlaysRef.current = []
    if (boundsUpdateTimerRef.current) {
      clearTimeout(boundsUpdateTimerRef.current)
      boundsUpdateTimerRef.current = null
    }

    const queue = geocodeQueueRef.current
    const bounds = new (window as any).kakao.maps.LatLngBounds()
    lastDataBoundsRef.current = bounds

    const schedulePositionsNotify = () => {
      const cb = onPositionsChangeRef.current
      if (!cb) return
      if (positionsNotifyTimerRef.current) return
      positionsNotifyTimerRef.current = setTimeout(() => {
        positionsNotifyTimerRef.current = null
        cb({ ...positionsByIdRef.current })
      }, 100)
    }

    const scheduleBoundsUpdate = () => {
      if (boundsUpdateTimerRef.current) return
      boundsUpdateTimerRef.current = setTimeout(() => {
        boundsUpdateTimerRef.current = null
        if (overlaysRef.current.length > 0 && autoFitBounds && !userInteractedRef.current && !autoFittedRef.current) {
          try {
            map.setBounds(bounds)
            autoFittedRef.current = true
          } catch {
          }
        }
      }, 250)
    }

    const isValidCoord = (lat: number, lng: number) =>
      Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001

    const createOverlay = (t: RealEstateTransaction, lat: number, lng: number) => {
      positionsByIdRef.current[t.id] = { lat, lng }
      schedulePositionsNotify()

      const position = new (window as any).kakao.maps.LatLng(lat, lng)
      const color = getPriceColor(t.price)

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
      el.textContent = `${Math.floor(t.price / 10000)}억`

      el.addEventListener("click", () => onMarkerClickRef.current?.(t))

      const overlay = new (window as any).kakao.maps.CustomOverlay({ position, content: el, zIndex: 1 })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
      bounds.extend(position)
    }

    const needGeocode: RealEstateTransaction[] = []
    data.forEach((t) => {
      if (isValidCoord(t.lat, t.lng)) {
        createOverlay(t, t.lat, t.lng)
      } else {
        needGeocode.push(t)
      }
    })
    scheduleBoundsUpdate()

    if (!queue) {
      setMarkerProgress({ total: needGeocode.length, resolved: 0, queued: 0, inFlight: 0, failed: 0 })
      return
    }

    const addressMap = new Map<string, RealEstateTransaction[]>()
    needGeocode.forEach((t) => {
      const address = geocodeQueryFromTransaction(t)
      if (!address) return
      if (!addressMap.has(address)) addressMap.set(address, [])
      addressMap.get(address)!.push(t)
    })

    const uniqueAddresses = Array.from(addressMap.keys())
    setMarkerProgress({
      total: uniqueAddresses.length,
      resolved: 0,
      queued: uniqueAddresses.length,
      inFlight: 0,
      failed: 0,
    })

    let cancelled = false
    const tickProgress = () => {
      if (!queue) return
      const p = queue.getProgress()
      setMarkerProgress((prev) => ({
        total: prev.total,
        resolved: p.resolved,
        queued: p.queued,
        inFlight: p.inFlight,
        failed: p.failed,
      }))
    }
    const progressTimer = setInterval(tickProgress, 200)

    const firstBatch = uniqueAddresses.slice(0, 30)
    const rest = uniqueAddresses.slice(30)

    const run = async (addresses: string[]) => {
      for (const addr of addresses) {
        if (cancelled) return
        const cached = queue.getCached(addr)
        if (cached) {
          const txs = addressMap.get(addr) ?? []
          txs.forEach((t) => createOverlay(t, cached.lat, cached.lng))
          scheduleBoundsUpdate()
          continue
        }

        const coord = await queue.geocode(addr)
        if (!coord) continue
        const txs = addressMap.get(addr) ?? []
        txs.forEach((t) => createOverlay(t, coord.lat, coord.lng))
        scheduleBoundsUpdate()
      }
    }

    ;(async () => {
      await run(firstBatch)
      await run(rest)
    })()

    return () => {
      cancelled = true
      clearInterval(progressTimer)
      if (boundsUpdateTimerRef.current) {
        clearTimeout(boundsUpdateTimerRef.current)
        boundsUpdateTimerRef.current = null
      }
      if (positionsNotifyTimerRef.current) {
        clearTimeout(positionsNotifyTimerRef.current)
        positionsNotifyTimerRef.current = null
      }
      overlaysRef.current.forEach((o) => {
        try {
          o.setMap(null)
        } catch {
        }
      })
      overlaysRef.current = []
    }
  }, [enabled, map, data, autoFitBounds, geocodeQueueRef, userInteractedRef])

  const fitToLastBounds = useMemo(() => {
    return () => {
      if (!enabled || !map) return
      const b = lastDataBoundsRef.current
      if (!b) return
      try {
        map.setBounds(b)
      } catch {
      }
    }
  }, [enabled, map])

  return { markerProgress, fitToLastBounds }
}
