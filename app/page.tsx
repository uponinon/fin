"use client"

import { useEffect, useMemo, useState } from "react"
import { KakaoMap } from "@/components/map/kakao-map"
import { PriceTrendChart } from "@/components/charts/price-trend-chart"
import { RegionComparison } from "@/components/regions/region-comparison"
import { TransactionList } from "@/components/transactions/transaction-list"
import {
  type PriceStatistics,
  type RealEstateTransaction,
  type RegionPriceRange,
  calculateRegionPriceRanges,
  fetchPriceStatistics,
  fetchRealEstateData,
  formatArea,
  formatPrice,
} from "@/lib/api/real-estate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3Icon, HomeIcon, MapIcon, RefreshCwIcon, TrendingUpIcon } from "lucide-react"

export default function HomePage() {
  const [transactions, setTransactions] = useState<RealEstateTransaction[]>([])
  const [statistics, setStatistics] = useState<PriceStatistics[]>([])
  const [regionData, setRegionData] = useState<RegionPriceRange[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<RealEstateTransaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dealYmd = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    return `${year}${month}`
  }, [])

  // TODO: 지역 선택 UI를 붙이면 lawdCd를 사용자 입력으로 바꾸세요.
  // 예시) 11680 = 서울 강남구
  const lawdCd = "11680"

  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [transactionData, statsData] = await Promise.all([
        fetchRealEstateData(lawdCd, dealYmd),
        fetchPriceStatistics(lawdCd, 12),
      ])
      setTransactions(transactionData)
      setStatistics(statsData)
      setRegionData(calculateRegionPriceRanges(transactionData))
      setSelectedTransaction(transactionData[0] ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "데이터 로드 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">부동산 가격 추적</h1>
                <p className="text-sm text-muted-foreground">공공 API 기반 실시간(준실시간) 가격 분석 대시보드</p>
              </div>
            </div>
            <Button onClick={loadData} disabled={isLoading} size="sm">
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <RefreshCwIcon className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div className="text-lg font-semibold">데이터를 불러오는 중...</div>
              <div className="text-sm text-muted-foreground">공공 데이터/목업 데이터를 가져오고 있습니다.</div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="map" className="space-y-6">
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
                <HomeIcon className="w-4 h-4" />
                거래 목록
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[520px]">
                  <KakaoMap data={transactions} onMarkerClick={setSelectedTransaction} />
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
                            전용면적 {formatArea(selectedTransaction.area)} · {selectedTransaction.buildYear}년 ·{" "}
                            {selectedTransaction.floor}층
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
            </TabsContent>

            <TabsContent value="trend">
              <PriceTrendChart data={statistics} />
            </TabsContent>

            <TabsContent value="region">
              <RegionComparison data={regionData} />
            </TabsContent>

            <TabsContent value="list">
              <TransactionList data={transactions} maxItems={50} onSelect={setSelectedTransaction} />
            </TabsContent>
          </Tabs>
        )}

        <Card className="mt-8 border-accent bg-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              API 연동 안내
            </CardTitle>
            <CardDescription>현재는 연동 전/오류 시 목업 데이터로 화면이 동작합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-2">필수 키</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Kakao Maps JavaScript 키: `.env.local`에 `NEXT_PUBLIC_KAKAO_APP_KEY` 설정 (발급: `https://developers.kakao.com`)
                </li>
                <li>
                  공공데이터포털 서비스키: `.env.local`에 `DATA_GO_KR_SERVICE_KEY` 설정 (발급: `https://www.data.go.kr`)
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">연동 구현 위치(빈칸)</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>`app/api/real-estate/route.ts`에서 외부 API 호출 + XML 파싱 TODO</li>
                <li>`lib/api/real-estate.ts`는 내부 API 호출 실패 시 목업으로 폴백</li>
              </ul>
            </div>
            <div className="text-muted-foreground">
              참고: data.go.kr의 서비스키는 URL 인코딩된 값이 필요할 수 있습니다(문서의 “일반 인증키(Encoding)” 사용 권장).
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

