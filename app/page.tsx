"use client"

import { useEffect, useState } from "react"
import { KakaoMap } from "@/components/map/kakao-map"
import { PriceTrendChart } from "@/components/charts/price-trend-chart"
import { TransactionList } from "@/components/transactions/transaction-list"
import { RegionComparison } from "@/components/regions/region-comparison"
import {
  type RealEstateTransaction,
  type PriceStatistics,
  type RegionPriceRange,
  fetchRealEstateData,
  fetchPriceStatistics,
  calculateRegionPriceRanges,
} from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCwIcon, TrendingUpIcon, MapIcon, BarChart3Icon, HomeIcon } from "lucide-react"

export default function HomePage() {
  const [transactions, setTransactions] = useState<RealEstateTransaction[]>([])
  const [statistics, setStatistics] = useState<PriceStatistics[]>([])
  const [regionData, setRegionData] = useState<RegionPriceRange[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<RealEstateTransaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true)
    try {
      // 현재 날짜 기준 데이터 가져오기
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const dealYmd = `${year}${month}`

      // 서울 강남구 지역코드 (예시)
      const lawdCd = "11680"

      // 병렬로 데이터 가져오기
      const [transactionData, statsData] = await Promise.all([
        fetchRealEstateData(lawdCd, dealYmd),
        fetchPriceStatistics(lawdCd, 12),
      ])

      setTransactions(transactionData)
      setStatistics(statsData)
      setRegionData(calculateRegionPriceRanges(transactionData))
    } catch (error) {
      console.error("데이터 로드 오류:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">부동산 가격 추적</h1>
                <p className="text-sm text-muted-foreground">실시간 부동산 시장 분석 대시보드</p>
              </div>
            </div>
            <Button onClick={loadData} disabled={isLoading} size="sm">
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <RefreshCwIcon className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div className="text-lg font-semibold">데이터를 불러오는 중...</div>
              <div className="text-sm text-muted-foreground">공공 데이터 API에서 부동산 정보를 가져오고 있습니다.</div>
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

            {/* 지도 뷰 */}
            <TabsContent value="map" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="h-[600px]">
                    <KakaoMap
                      data={transactions}
                      onMarkerClick={(transaction) => setSelectedTransaction(transaction)}
                    />
                  </Card>
                </div>
                <div>
                  {selectedTransaction ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>선택한 매물</CardTitle>
                        <CardDescription>클릭한 거래의 상세 정보</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">주소</div>
                          <div className="font-semibold">{selectedTransaction.address}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedTransaction.dongName} {selectedTransaction.jibun}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">거래가격</div>
                          <div className="text-3xl font-bold text-primary">
                            {Math.floor(selectedTransaction.price / 10000)}억
                            {selectedTransaction.price % 10000 > 0 && ` ${selectedTransaction.price % 10000}만원`}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">전용면적</div>
                            <div className="font-semibold">{selectedTransaction.area.toFixed(1)}㎡</div>
                            <div className="text-xs text-muted-foreground">
                              ({Math.floor(selectedTransaction.area * 0.3025)}평)
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">층수</div>
                            <div className="font-semibold">{selectedTransaction.floor}층</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">건축년도</div>
                          <div className="font-semibold">{selectedTransaction.buildYear}년</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">거래일자</div>
                          <div className="font-semibold">
                            {selectedTransaction.dealYear}.{String(selectedTransaction.dealMonth).padStart(2, "0")}.
                            {String(selectedTransaction.dealDay).padStart(2, "0")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-full flex items-center justify-center">
                      <CardContent className="text-center py-12">
                        <MapIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <div className="text-lg font-semibold mb-2">매물을 선택하세요</div>
                        <div className="text-sm text-muted-foreground">
                          지도에서 마커를 클릭하면
                          <br />
                          상세 정보를 확인할 수 있습니다.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 가격 추이 */}
            <TabsContent value="trend">
              <PriceTrendChart data={statistics} />
            </TabsContent>

            {/* 지역 비교 */}
            <TabsContent value="region">
              <RegionComparison data={regionData} />
            </TabsContent>

            {/* 거래 목록 */}
            <TabsContent value="list">
              <TransactionList data={transactions} maxItems={50} />
            </TabsContent>
          </Tabs>
        )}

        {/* API 설정 안내 카드 */}
        <Card className="mt-8 border-accent bg-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              API 설정 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-2">🔑 필요한 API 키</div>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>공공데이터포털 API 키</strong>
                  <div className="ml-6 mt-1">
                    - 발급 사이트:{" "}
                    <a
                      href="https://www.data.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      https://www.data.go.kr
                    </a>
                    <br />- 필요 API: 국토교통부 아파트매매 실거래가 조회 서비스
                    <br />- 설정 위치:{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">lib/api/real-estate.ts</code> 파일의{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">API_KEY</code> 변수
                  </div>
                </li>
                <li>
                  <strong>Kakao Maps JavaScript API 키</strong>
                  <div className="ml-6 mt-1">
                    - 발급 사이트:{" "}
                    <a
                      href="https://developers.kakao.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      https://developers.kakao.com
                    </a>
                    <br />- 설정 위치:{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">components/map/kakao-map.tsx</code> 파일의{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">KAKAO_API_KEY</code> 변수
                  </div>
                </li>
              </ol>
            </div>
            <div>
              <div className="font-semibold mb-2">📝 참고 사항</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>현재는 목업(Mock) 데이터를 사용하여 UI를 표시하고 있습니다.</li>
                <li>실제 API 키를 입력하면 실시간 부동산 데이터를 확인할 수 있습니다.</li>
                <li>data.go.kr API는 XML 형식으로 응답하므로, xml2js 등의 파싱 라이브러리가 필요합니다.</li>
                <li>지역코드(lawd_cd)는 행정표준코드관리시스템에서 확인할 수 있습니다.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 푸터 */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>부동산 가격 추적 대시보드 - 공공데이터포털 API 활용</p>
          <p className="mt-1">데이터 출처: 국토교통부 실거래가 공개시스템</p>
        </div>
      </footer>
    </div>
  )
}
