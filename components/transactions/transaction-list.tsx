"use client"

import { type RealEstateTransaction, formatArea, formatChangeRate, formatPrice } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, HomeIcon, MapPinIcon } from "lucide-react"

interface TransactionListProps {
  data: RealEstateTransaction[]
  maxItems?: number
  onSelect?: (transaction: RealEstateTransaction) => void
}

export function TransactionList({ data, maxItems = 10, onSelect }: TransactionListProps) {
  const displayData = data.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 거래 목록</CardTitle>
        <CardDescription>
          전체 {data.length}건 중 {displayData.length}건 표시
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect?.(t)}
              className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
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
                      {t.changeRate >= 0 ? <ArrowUpIcon className="w-3.5 h-3.5" /> : <ArrowDownIcon className="w-3.5 h-3.5" />}
                      <span>{formatChangeRate(t.changeRate)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

