"use client"

import dynamic from "next/dynamic"
import { KakaoMap } from "@/components/map/kakao-map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PriceStatistics, RealEstateTransaction, RegionPriceRange } from "@/lib/api/real-estate"
import { formatArea, formatPrice } from "@/lib/api/real-estate"
import { BarChart3Icon, MapIcon, TrendingUpIcon } from "lucide-react"

const PriceTrendChart = dynamic(() => import("@/components/charts/price-trend-chart").then((m) => m.PriceTrendChart), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>가격 추이</CardTitle>
        <CardDescription>차트를 불러오는 중...</CardDescription>
      </CardHeader>
    </Card>
  ),
})

const RegionComparison = dynamic(() => import("@/components/regions/region-comparison").then((m) => m.RegionComparison), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>지역 비교</CardTitle>
        <CardDescription>차트를 불러오는 중...</CardDescription>
      </CardHeader>
    </Card>
  ),
})

const TransactionList = dynamic(() => import("@/components/transactions/transaction-list").then((m) => m.TransactionList), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>거래 목록</CardTitle>
        <CardDescription>목록을 불러오는 중...</CardDescription>
      </CardHeader>
    </Card>
  ),
})

type MapBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null

type Props = {
  activeTab: "map" | "trend" | "region" | "list"
  onChangeTab: (tab: "map" | "trend" | "region" | "list") => void

  selectedRegionCenter?: { lat: number; lng: number }

  mapBounds: MapBounds
  onViewportChange: (b: MapBounds) => void
  onPositionsChange: (p: Record<string, { lat: number; lng: number }>) => void
  fitBoundsSignal: number

  priceFiltered: RealEstateTransaction[]
  viewportFiltered: RealEstateTransaction[]
  selectedTransaction: RealEstateTransaction | null
  selectedPosition?: { lat: number; lng: number }
  onSelectTransaction: (t: RealEstateTransaction) => void

  regionData: RegionPriceRange[]
  statistics: PriceStatistics[]

  selectedPropertyLabel: string | null
  isPropertyTrendLoading: boolean
  selectedPropertyStatistics: PriceStatistics[]

  errorMessage: string | null
}

export function HomeTabs(props: Props) {
  const {
    activeTab,
    onChangeTab,
    selectedRegionCenter,
    onViewportChange,
    onPositionsChange,
    fitBoundsSignal,
    priceFiltered,
    viewportFiltered,
    selectedTransaction,
    selectedPosition,
    onSelectTransaction,
    regionData,
    statistics,
    selectedPropertyLabel,
    isPropertyTrendLoading,
    selectedPropertyStatistics,
    errorMessage,
  } = props

  return (
    <Tabs value={activeTab} onValueChange={(v) => onChangeTab(v as any)} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
        <TabsTrigger value="map" className="gap-2">
          <MapIcon className="w-4 h-4" />
          지도
        </TabsTrigger>
        <TabsTrigger value="trend" className="gap-2">
          <TrendingUpIcon className="w-4 h-4" />
          가격 추이
        </TabsTrigger>
        <TabsTrigger value="region" className="gap-2">
          <BarChart3Icon className="w-4 h-4" />
          지역 비교
        </TabsTrigger>
        <TabsTrigger value="list" className="gap-2">
          거래 목록
        </TabsTrigger>
      </TabsList>

      <TabsContent value="map">
        {activeTab === "map" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[600px]">
              <KakaoMap
                data={priceFiltered}
                center={selectedRegionCenter}
                onMarkerClick={onSelectTransaction}
                onViewportChange={onViewportChange}
                onPositionsChange={onPositionsChange}
                fitBoundsSignal={fitBoundsSignal}
                autoFitBounds={true}
                selectedId={selectedTransaction?.id}
                selectedPosition={selectedPosition}
              />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>선택된 거래</CardTitle>
                  <CardDescription>지도 마커 또는 목록을 클릭해 상세를 확인하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTransaction ? (
                    <>
                      <div className="font-semibold">{selectedTransaction.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedTransaction.dongName} {selectedTransaction.jibun}
                      </div>
                      <div className="text-2xl font-bold text-primary">{formatPrice(selectedTransaction.price)}</div>
                      <div className="text-sm text-muted-foreground">
                        전용면적 {formatArea(selectedTransaction.area)} · {selectedTransaction.buildYear}년 · {selectedTransaction.floor}층
                      </div>
                      <div className="text-sm text-muted-foreground">
                        거래일 {selectedTransaction.dealYear}.{String(selectedTransaction.dealMonth).padStart(2, "0")}.
                        {String(selectedTransaction.dealDay).padStart(2, "0")}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">선택된 거래가 없습니다.</div>
                  )}
                </CardContent>
              </Card>

              {errorMessage ? (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <CardTitle>오류</CardTitle>
                    <CardDescription>{errorMessage}</CardDescription>
                  </CardHeader>
                </Card>
              ) : null}
            </div>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="trend">
        {activeTab === "trend" ? (
          selectedTransaction ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>선택 매물 가격 추이 (최근 12개월)</CardTitle>
                  <CardDescription>{selectedPropertyLabel ?? selectedTransaction.address}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {isPropertyTrendLoading ? "불러오는 중..." : `데이터 ${selectedPropertyStatistics.length}개월`}
                </CardContent>
              </Card>
              <PriceTrendChart data={selectedPropertyStatistics} />
            </div>
          ) : (
            <PriceTrendChart data={statistics} />
          )
        ) : null}
      </TabsContent>

      <TabsContent value="region">{activeTab === "region" ? <RegionComparison data={regionData} /> : null}</TabsContent>

      <TabsContent value="list">
        {activeTab === "list" ? (
          <TransactionList
            data={viewportFiltered}
            pageSize={10}
            onSelect={onSelectTransaction}
            selectedId={selectedTransaction?.id ?? null}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  )
}

