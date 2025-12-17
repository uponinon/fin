"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { type PeriodMode, formatDateLabel, validateAndNormalizeCustomRange } from "@/hooks/use-period-filter"
import type { SelectedRegion } from "@/hooks/use-selected-region-search"
import { formatPrice } from "@/lib/api/real-estate"
import { SearchIcon } from "lucide-react"

type MapBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null

type Props = {
  selectedRegion: SelectedRegion | null
  searchQuery: string
  onChangeSearchQuery: (value: string) => void
  onSearch: () => void
  isLoading: boolean

  periodMode: PeriodMode
  presetMonths: number
  onChangePresetMonths: (months: number) => void
  onChangePeriodMode: (mode: PeriodMode) => void
  onEnsureCustomDefaults: () => void
  customStartDate: Date | null
  customEndDate: Date | null
  onChangeCustomStartDate: (d: Date | null) => void
  onChangeCustomEndDate: (d: Date | null) => void

  priceRange: [number, number]
  onChangePriceRange: (range: [number, number]) => void
  computedPriceMin: number
  computedPriceMax: number

  showOnlyInViewport: boolean
  onChangeShowOnlyInViewport: (value: boolean) => void
  mapBounds: MapBounds

  visibleCount: number
  totalCount: number
  onFitAll: () => void
}

export function SearchFilterCard(props: Props) {
  const {
    selectedRegion,
    searchQuery,
    onChangeSearchQuery,
    onSearch,
    isLoading,
    periodMode,
    presetMonths,
    onChangePresetMonths,
    onChangePeriodMode,
    onEnsureCustomDefaults,
    customStartDate,
    customEndDate,
    onChangeCustomStartDate,
    onChangeCustomEndDate,
    priceRange,
    onChangePriceRange,
    computedPriceMin,
    computedPriceMax,
    showOnlyInViewport,
    onChangeShowOnlyInViewport,
    mapBounds,
    visibleCount,
    totalCount,
    onFitAll,
  } = props

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>검색 · 필터</span>
          {selectedRegion ? (
            <span className="text-sm font-normal text-muted-foreground">
              선택됨: {selectedRegion.label} (LAWD_CD {selectedRegion.lawdCd})
            </span>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">지역을 검색해서 시작하세요.</span>
          )}
        </CardTitle>
        <CardDescription>지역을 바꾸고, 기간/가격 범위/지도 영역으로 거래를 좁혀볼 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Input
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="예) 강남구 / 서면역 / 부산광역시 부산진구 부전동"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch()
            }}
          />
          <Select
            value={periodMode === "custom" ? "custom" : String(presetMonths)}
            onValueChange={(v) => {
              if (v === "custom") {
                onChangePeriodMode("custom")
                onEnsureCustomDefaults()
                return
              }
              onChangePeriodMode("preset")
              onChangePresetMonths(Number.parseInt(v, 10))
            }}
          >
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">최근 1개월</SelectItem>
              <SelectItem value="3">최근 3개월</SelectItem>
              <SelectItem value="6">최근 6개월</SelectItem>
              <SelectItem value="12">최근 12개월</SelectItem>
              <SelectItem value="custom">직접 설정</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button onClick={onSearch} disabled={isLoading} variant="secondary">
              <SearchIcon className="w-4 h-4 mr-2" />
              검색
            </Button>
            <Button onClick={onFitAll} disabled={!totalCount} variant="outline">
              거래 전체 보기
            </Button>
          </div>
        </div>

        {periodMode === "custom" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">시작일</div>
                <div className="text-xs text-muted-foreground">{customStartDate ? formatDateLabel(customStartDate) : "-"}</div>
              </div>
              <Calendar
                mode="single"
                selected={customStartDate ?? undefined}
                onSelect={(d) => {
                  if (!d) return
                  const end = customEndDate ?? d
                  const next = validateAndNormalizeCustomRange(d, end)
                  onChangeCustomStartDate(next.start)
                  onChangeCustomEndDate(next.end)
                }}
                disabled={{ after: new Date() }}
              />
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">종료일</div>
                <div className="text-xs text-muted-foreground">{customEndDate ? formatDateLabel(customEndDate) : "-"}</div>
              </div>
              <Calendar
                mode="single"
                selected={customEndDate ?? undefined}
                onSelect={(d) => {
                  if (!d) return
                  const start = customStartDate ?? d
                  const next = validateAndNormalizeCustomRange(start, d)
                  onChangeCustomStartDate(next.start)
                  onChangeCustomEndDate(next.end)
                }}
                disabled={{ after: new Date() }}
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">가격 범위</div>
              <div className="text-xs text-muted-foreground">
                {priceRange[1] ? `${formatPrice(priceRange[0])} ~ ${formatPrice(priceRange[1])}` : "-"}
              </div>
            </div>
            <Slider
              value={[priceRange[0], priceRange[1]]}
              min={computedPriceMin}
              max={computedPriceMax}
              step={1000}
              onValueChange={(v) => onChangePriceRange([Number(v[0] ?? 0), Number(v[1] ?? 0)])}
              disabled={!computedPriceMax}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{computedPriceMax ? formatPrice(computedPriceMin) : "-"}</span>
              <span>{computedPriceMax ? formatPrice(computedPriceMax) : "-"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">표시 조건</div>
              <div className="text-xs text-muted-foreground">
                {visibleCount}건 / 전체 {totalCount}건
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="gap-3">
                <Checkbox checked={showOnlyInViewport} onCheckedChange={(v) => onChangeShowOnlyInViewport(Boolean(v))} />
                지도에 보이는 거래만
              </Label>
              <div className="text-xs text-muted-foreground">{mapBounds ? "지도 영역 적용 중" : "지도 영역 대기 중"}</div>
            </div>
            <div className="text-xs text-muted-foreground">지도를 이동/줌 하면 목록/차트가 현재 화면 범위로 갱신됩니다.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

