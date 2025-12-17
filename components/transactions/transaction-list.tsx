"use client"

import { useEffect, useMemo, useState } from "react"
import { type RealEstateTransaction, formatArea, formatChangeRate, formatPrice } from "@/lib/api/real-estate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, HomeIcon, MapPinIcon } from "lucide-react"

interface TransactionListProps {
  data: RealEstateTransaction[]
  pageSize?: number
  maxItems?: number
  onSelect?: (transaction: RealEstateTransaction) => void
  selectedId?: string | null
}

export function TransactionList({ data, pageSize = 10, maxItems, onSelect, selectedId }: TransactionListProps) {
  const [page, setPage] = useState(1)

  const limited = useMemo(
    () => (Number.isFinite(maxItems) ? data.slice(0, Math.max(0, Math.floor(maxItems!))) : data),
    [data, maxItems],
  )

  const sorted = useMemo(() => {
    const copy = [...limited]
    copy.sort((a, b) => {
      const ad = new Date(a.dealYear, a.dealMonth - 1, a.dealDay).getTime()
      const bd = new Date(b.dealYear, b.dealMonth - 1, b.dealDay).getTime()
      return bd - ad
    })
    return copy
  }, [limited])

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(sorted.length / safePageSize))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [safePageSize, sorted.length])

  const startIdx = (currentPage - 1) * safePageSize
  const displayData = sorted.slice(startIdx, startIdx + safePageSize)

  const pageButtons = useMemo(() => {
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 거래 목록</CardTitle>
        <CardDescription>
          전체 {sorted.length}건 중 {displayData.length}건 표시 (페이지 {currentPage}/{totalPages})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect?.(t)}
              className={`w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                selectedId && t.id === selectedId ? "ring-2 ring-primary/40 border-primary/40" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-semibold">{t.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {t.dongName} {t.jibun}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HomeIcon className="w-3.5 h-3.5" />
                      <span>{formatArea(t.area)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>
                        {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.{String(t.dealDay).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.buildYear}년 · {t.floor}층
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-primary">{formatPrice(t.price)}</div>
                  <div className="text-sm text-muted-foreground mt-1">평당 {Math.floor(t.pricePerArea).toLocaleString()}만원</div>
                  {t.changeRate !== undefined ? (
                    <div
                      className={`flex items-center justify-end gap-1 text-sm mt-2 font-medium ${
                        t.changeRate >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {t.changeRate >= 0 ? (
                        <ArrowUpIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{formatChangeRate(t.changeRate)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <div className="text-xs text-muted-foreground">페이지</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>
                처음
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              {pageButtons.map((p) => (
                <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                끝
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
