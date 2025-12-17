"use client"

import { useEffect, useMemo, useState } from "react"
import { type RealEstateTransaction } from "@/lib/api/real-estate"

export function useTransactionFilters(
  transactions: RealEstateTransaction[],
  mapBounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null,
  positionsById: Record<string, { lat: number; lng: number }>,
) {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [showOnlyInViewport, setShowOnlyInViewport] = useState(true)

  const allPrices = useMemo(() => transactions.map((t) => t.price).filter((p) => Number.isFinite(p)), [transactions])
  const computedPriceMin = useMemo(() => (allPrices.length ? Math.min(...allPrices) : 0), [allPrices])
  const computedPriceMax = useMemo(() => (allPrices.length ? Math.max(...allPrices) : 0), [allPrices])

  useEffect(() => {
    if (!computedPriceMax) {
      setPriceRange([0, 0])
      return
    }
    setPriceRange([computedPriceMin, computedPriceMax])
  }, [computedPriceMin, computedPriceMax])

  const priceFiltered = useMemo(() => {
    if (!priceRange[1]) return transactions
    const [min, max] = priceRange
    return transactions.filter((t) => t.price >= min && t.price <= max)
  }, [transactions, priceRange])

  const viewportFiltered = useMemo(() => {
    if (!showOnlyInViewport) return priceFiltered
    if (!mapBounds) return priceFiltered
    return priceFiltered.filter((t) => {
      const pos = positionsById[t.id]
      if (!pos) return false
      return (
        pos.lat >= mapBounds.sw.lat &&
        pos.lat <= mapBounds.ne.lat &&
        pos.lng >= mapBounds.sw.lng &&
        pos.lng <= mapBounds.ne.lng
      )
    })
  }, [priceFiltered, showOnlyInViewport, mapBounds, positionsById])

  return {
    priceRange,
    setPriceRange,
    showOnlyInViewport,
    setShowOnlyInViewport,
    computedPriceMin,
    computedPriceMax,
    priceFiltered,
    viewportFiltered,
  }
}

