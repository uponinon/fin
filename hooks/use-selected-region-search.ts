"use client"

import { useCallback, useEffect, useState } from "react"
import { loadKakaoMaps } from "@/lib/kakao/maps"

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY
const STORAGE_KEY = "fin:selected-region:v1"

export type SelectedRegion = {
  query: string
  lawdCd: string
  label: string
  center: { lat: number; lng: number }
}

async function resolveSelectedRegion(query: string): Promise<SelectedRegion> {
  if (!KAKAO_APP_KEY || KAKAO_APP_KEY.trim().length === 0) {
    throw new Error("NEXT_PUBLIC_KAKAO_APP_KEY가 설정되지 않았습니다.")
  }

  const state = await loadKakaoMaps(KAKAO_APP_KEY)
  if (!state.ok) throw new Error(state.message)

  const q = query.trim()
  if (!q) throw new Error("검색어를 입력해 주세요.")

  const geocoder = new window.kakao.maps.services.Geocoder()

  const fromAddressSearch = await new Promise<SelectedRegion | null>((resolve) => {
    geocoder.addressSearch(q, (results: any[], status: any) => {
      if (status !== window.kakao.maps.services.Status.OK || !results?.length) return resolve(null)
      const first = results[0]
      const addr = first?.address ?? first?.road_address
      const bCode = String(addr?.b_code ?? "")
      if (bCode.length < 5) return resolve(null)
      resolve({
        query: q,
        lawdCd: bCode.slice(0, 5),
        label: String(first?.address_name ?? q),
        center: { lat: Number(first.y), lng: Number(first.x) },
      })
    })
  })
  if (fromAddressSearch) return fromAddressSearch

  const places = new window.kakao.maps.services.Places()
  const placeCoord = await new Promise<{ lat: number; lng: number; placeName?: string } | null>((resolve) => {
    places.keywordSearch(q, (results: any[], status: any) => {
      if (status !== window.kakao.maps.services.Status.OK || !results?.length) return resolve(null)
      const first = results[0]
      resolve({ lat: Number(first.y), lng: Number(first.x), placeName: String(first.place_name ?? q) })
    })
  })
  if (!placeCoord) throw new Error("검색 결과가 없습니다. 도로명 주소 또는 지역명을 더 구체적으로 입력해 주세요.")

  const regionCode = await new Promise<{ lawdCd: string; label: string } | null>((resolve) => {
    geocoder.coord2RegionCode(placeCoord.lng, placeCoord.lat, (results: any[], status: any) => {
      if (status !== window.kakao.maps.services.Status.OK || !results?.length) return resolve(null)
      const legal = results.find((r) => r.region_type === "B") ?? results[0]
      const code = String(legal?.code ?? "")
      if (code.length < 5) return resolve(null)
      const label =
        [legal.region_1depth_name, legal.region_2depth_name, legal.region_3depth_name].filter(Boolean).join(" ") ||
        placeCoord.placeName ||
        q
      resolve({ lawdCd: code.slice(0, 5), label })
    })
  })
  if (!regionCode) throw new Error("지역 코드를 찾지 못했습니다. 다른 검색어로 시도해 주세요.")

  return {
    query: q,
    lawdCd: regionCode.lawdCd,
    label: regionCode.label,
    center: { lat: placeCoord.lat, lng: placeCoord.lng },
  }
}

export function useSelectedRegionSearch() {
  const [selectedRegion, setSelectedRegionState] = useState<SelectedRegion | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SelectedRegion
      if (!parsed?.lawdCd || !parsed?.center) return
      setSelectedRegionState(parsed)
      setSearchQuery(parsed.query ?? "")
    } catch {
    }
  }, [])

  const setSelectedRegion = useCallback((region: SelectedRegion | null) => {
    setSelectedRegionState(region)
    try {
      if (region) localStorage.setItem(STORAGE_KEY, JSON.stringify(region))
    } catch {
    }
  }, [])

  const search = useCallback(async () => {
    const region = await resolveSelectedRegion(searchQuery)
    setSelectedRegion(region)
    return region
  }, [searchQuery, setSelectedRegion])

  return {
    selectedRegion,
    setSelectedRegion,
    searchQuery,
    setSearchQuery,
    search,
  }
}
