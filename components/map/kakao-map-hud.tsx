"use client"

import { Card } from "@/components/ui/card"
import type { GeocodeProgress } from "@/lib/kakao/geocode"

type LegendItem = { label: string; color: string }

type Props = {
  legend: LegendItem[]
  totalCount: number
  markerProgress: GeocodeProgress
}

export function KakaoMapHud({ legend, totalCount, markerProgress }: Props) {
  const hasMarkerWork =
    markerProgress.total > 0 && (markerProgress.queued > 0 || markerProgress.inFlight > 0 || markerProgress.resolved === 0)
  const isLimited = totalCount > 0 && markerProgress.total > 0 && markerProgress.total < totalCount

  return (
    <>
      <Card className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold mb-2">가격대별 색상</div>
        <div className="space-y-1 text-xs">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="absolute top-4 left-4 px-4 py-2 bg-card/95 backdrop-blur">
        <div className="text-sm font-semibold">총 {totalCount}건의 거래</div>
      </Card>

      {hasMarkerWork ? (
        <Card className="absolute top-4 right-4 px-4 py-2 bg-card/95 backdrop-blur">
          <div className="text-sm font-semibold">마커 준비 중</div>
          <div className="text-xs text-muted-foreground">
            {markerProgress.resolved}/{markerProgress.total} (대기 {markerProgress.queued}, 진행 {markerProgress.inFlight}, 실패{" "}
            {markerProgress.failed})
          </div>
          {isLimited ? (
            <div className="text-[10px] text-muted-foreground pt-1">Kakao 지오코딩 제한으로 일부 마커만 표시됩니다.</div>
          ) : null}
        </Card>
      ) : null}
    </>
  )
}
