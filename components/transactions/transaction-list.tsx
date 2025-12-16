"use client"

import { type RealEstateTransaction, formatPrice, formatChangeRate } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, HomeIcon, CalendarIcon, MapPinIcon } from "lucide-react"

interface TransactionListProps {
  data: RealEstateTransaction[]
  maxItems?: number
}

export function TransactionList({ data, maxItems = 10 }: TransactionListProps) {
  const displayData = data.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 거래 목록</CardTitle>
        <CardDescription>
          {data.length}건의 거래 중 최근 {displayData.length}건 표시
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* 주소 */}
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-semibold">{transaction.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.dongName} {transaction.jibun}
                      </div>
                    </div>
                  </div>

                  {/* 세부 정보 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HomeIcon className="w-3.5 h-3.5" />
                      <span>{transaction.area.toFixed(1)}㎡</span>
                      <span className="text-xs">({Math.floor(transaction.area * 0.3025)}평)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>
                        {transaction.dealYear}.{String(transaction.dealMonth).padStart(2, "0")}.
                        {String(transaction.dealDay).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      {transaction.buildYear}년 · {transaction.floor}층
                    </div>
                  </div>
                </div>

                {/* 가격 정보 */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-primary">{formatPrice(transaction.price)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    평당 {Math.floor(transaction.pricePerArea).toLocaleString()}만
                  </div>
                  {transaction.changeRate !== undefined && (
                    <div
                      className={`flex items-center justify-end gap-1 text-sm mt-2 font-medium ${
                        transaction.changeRate >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {transaction.changeRate >= 0 ? (
                        <ArrowUpIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{formatChangeRate(transaction.changeRate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
