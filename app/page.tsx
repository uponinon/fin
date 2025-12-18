"use client"

import { useMemo } from "react"
import { HeaderBar } from "@/components/home/header-bar"
import { HomeTabs } from "@/components/home/home-tabs"
import { SearchFilterCard } from "@/components/home/search-filter-card"
import { useHomeDashboard } from "@/hooks/use-home-dashboard"

export default function HomePage() {
  const dashboard = useHomeDashboard()

  const selectedPosition = useMemo(() => {
    const id = dashboard.selected.selectedTransaction?.id
    if (!id) return undefined
    return dashboard.positionsById[id]
  }, [dashboard.selected.selectedTransaction?.id, dashboard.positionsById])

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        searchQuery={dashboard.regionSearch.searchQuery}
        onChangeSearchQuery={dashboard.regionSearch.setSearchQuery}
        onSearch={dashboard.handleSearch}
        onRefresh={dashboard.handleRefresh}
        onHome={dashboard.handleGoHome}
        isLoading={dashboard.market.isLoading}
        canRefresh={Boolean(dashboard.regionSearch.selectedRegion || dashboard.regionSearch.searchQuery.trim())}
      />

      <main className="container mx-auto px-4 py-8">
        <SearchFilterCard
          selectedRegion={dashboard.regionSearch.selectedRegion}
          searchQuery={dashboard.regionSearch.searchQuery}
          onChangeSearchQuery={dashboard.regionSearch.setSearchQuery}
          onSearch={dashboard.handleSearch}
          isLoading={dashboard.market.isLoading}
          periodMode={dashboard.period.mode}
          presetMonths={dashboard.period.presetMonths}
          onChangePresetMonths={dashboard.period.setPresetMonths}
          onChangePeriodMode={dashboard.period.setMode}
          onEnsureCustomDefaults={dashboard.period.ensureCustomDefaults}
          customStartDate={dashboard.period.customStartDate}
          customEndDate={dashboard.period.customEndDate}
          onChangeCustomStartDate={dashboard.period.setCustomStartDate}
          onChangeCustomEndDate={dashboard.period.setCustomEndDate}
          priceRange={dashboard.filters.priceRange}
          onChangePriceRange={dashboard.filters.setPriceRange}
          computedPriceMin={dashboard.filters.computedPriceMin}
          computedPriceMax={dashboard.filters.computedPriceMax}
          showOnlyInViewport={dashboard.filters.showOnlyInViewport}
          onChangeShowOnlyInViewport={dashboard.filters.setShowOnlyInViewport}
          mapBounds={dashboard.mapBounds}
          visibleCount={dashboard.filters.viewportFiltered.length}
          totalCount={dashboard.market.transactions.length}
          onFitAll={dashboard.handleFitAll}
        />

        {dashboard.market.isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold">데이터를 불러오는 중...</div>
              <div className="text-sm text-muted-foreground">공공 데이터/목업 데이터를 가져오고 있습니다.</div>
            </div>
          </div>
        ) : (
          <HomeTabs
            activeTab={dashboard.activeTab}
            onChangeTab={dashboard.setActiveTab}
            selectedRegionCenter={dashboard.regionSearch.selectedRegion?.center}
            mapBounds={dashboard.mapBounds}
            onViewportChange={dashboard.setMapBounds}
            onPositionsChange={dashboard.setPositionsById}
            fitBoundsSignal={dashboard.fitBoundsSignal}
            priceFiltered={dashboard.filters.priceFiltered}
            viewportFiltered={dashboard.filters.viewportFiltered}
            selectedTransaction={dashboard.selected.selectedTransaction}
            selectedPosition={selectedPosition}
            onSelectTransaction={dashboard.handleSelectTransaction}
            regionData={dashboard.regionData}
            statistics={dashboard.market.statistics}
            selectedPropertyLabel={dashboard.propertyTrend.selectedPropertyLabel}
            isPropertyTrendLoading={dashboard.propertyTrend.isPropertyTrendLoading}
            selectedPropertyStatistics={dashboard.propertyTrend.selectedPropertyStatistics}
            propertyTrendMonths={dashboard.propertyTrendMonths}
            onChangePropertyTrendMonths={dashboard.handleChangePropertyTrendMonths}
            onUseFilterPeriodForPropertyTrend={dashboard.handleUseFilterPeriodForPropertyTrend}
            errorMessage={dashboard.market.errorMessage}
          />
        )}
      </main>
    </div>
  )
}
