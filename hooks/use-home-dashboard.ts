"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { calculateRegionPriceRanges, type RealEstateTransaction } from "@/lib/api/real-estate"
import { useMarketData } from "@/hooks/use-market-data"
import { usePeriodFilter } from "@/hooks/use-period-filter"
import { usePropertyTrend } from "@/hooks/use-property-trend"
import { useSelectedRegionSearch } from "@/hooks/use-selected-region-search"
import { useSelectedTransaction } from "@/hooks/use-selected-transaction"
import { useTransactionFilters } from "@/hooks/use-transaction-filters"

type MapBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null

export function useHomeDashboard() {
  const [activeTab, setActiveTab] = useState<"map" | "trend" | "region" | "list">("map")
  const [mapBounds, setMapBounds] = useState<MapBounds>(null)
  const [positionsById, setPositionsById] = useState<Record<string, { lat: number; lng: number }>>({})
  const [fitBoundsSignal, setFitBoundsSignal] = useState(0)
  const [propertyTrendMonths, setPropertyTrendMonths] = useState(12)

  const regionSearch = useSelectedRegionSearch()
  const period = usePeriodFilter(3)

  const market = useMarketData(regionSearch.selectedRegion?.lawdCd, period.dealYmds, period.statisticsParams)
  const filters = useTransactionFilters(market.transactions, mapBounds, positionsById)

  const regionData = useMemo(() => calculateRegionPriceRanges(filters.viewportFiltered), [filters.viewportFiltered])
  const selected = useSelectedTransaction(filters.viewportFiltered)
  const propertyTrend = usePropertyTrend()

  useEffect(() => {
    if (!selected.selectedTransaction) return
    if (!selected.lastUserSelectedIdRef.current) return
    if (selected.selectedTransaction.id !== selected.lastUserSelectedIdRef.current) return
    if (regionSearch.selectedRegion?.lawdCd) {
      void propertyTrend.loadPropertyTrend(regionSearch.selectedRegion.lawdCd, selected.selectedTransaction, propertyTrendMonths)
    }
  }, [
    selected.selectedTransaction?.id,
    regionSearch.selectedRegion?.lawdCd,
    propertyTrend.loadPropertyTrend,
    propertyTrendMonths,
  ])

  const handleSearch = useCallback(async () => {
    market.setErrorMessage(null)
    try {
      await regionSearch.search()
    } catch (e) {
      market.setErrorMessage(e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.")
    }
  }, [market, regionSearch])

  const handleRefresh = useCallback(() => {
    if (regionSearch.selectedRegion?.lawdCd) market.reload()
    else void handleSearch()
  }, [handleSearch, market, regionSearch.selectedRegion?.lawdCd])

  const handleFitAll = useCallback(() => setFitBoundsSignal((v) => v + 1), [])

  const handleGoHome = useCallback(() => {
    setActiveTab("map")
    setFitBoundsSignal((v) => v + 1)
  }, [])

  const handleSelectTransaction = useCallback(
    (t: RealEstateTransaction) => {
      selected.lastUserSelectedIdRef.current = t.id
      selected.setSelectedTransaction(t)
      setActiveTab("trend")
    },
    [selected],
  )

  const handleChangePropertyTrendMonths = useCallback(
    (months: number) => {
      const safeMonths = Number.isFinite(months) ? Math.max(1, Math.min(12, Math.floor(months))) : 12
      setPropertyTrendMonths(safeMonths)
      if (regionSearch.selectedRegion?.lawdCd && selected.selectedTransaction) {
        void propertyTrend.loadPropertyTrend(regionSearch.selectedRegion.lawdCd, selected.selectedTransaction, safeMonths)
      }
    },
    [propertyTrend.loadPropertyTrend, regionSearch.selectedRegion?.lawdCd, selected.selectedTransaction],
  )

  const handleUseFilterPeriodForPropertyTrend = useCallback(() => {
    const months = Math.max(1, Math.min(12, period.dealYmds.length || 12))
    handleChangePropertyTrendMonths(months)
  }, [handleChangePropertyTrendMonths, period.dealYmds.length])

  return {
    activeTab,
    setActiveTab,
    mapBounds,
    setMapBounds,
    positionsById,
    setPositionsById,
    fitBoundsSignal,
    handleFitAll,
    regionSearch,
    period,
    market,
    filters,
    regionData,
    selected,
    propertyTrend,
    propertyTrendMonths,
    handleChangePropertyTrendMonths,
    handleUseFilterPeriodForPropertyTrend,
    handleSearch,
    handleRefresh,
    handleGoHome,
    handleSelectTransaction,
  }
}
