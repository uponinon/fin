"use client"

import { type PriceStatistics, formatChangeRate, formatPrice } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"

interface PriceTrendChartProps {
  data: PriceStatistics[]
}

export function PriceTrendChart({ data }: PriceTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>가격 추이</CardTitle>
          <CardDescription>최근 데이터가 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const chartData = data.map((stat) => ({
    period: stat.period,
    avgEok: Math.floor(stat.avgPrice / 10000),
    maxEok: Math.floor(stat.maxPrice / 10000),
    minEok: Math.floor(stat.minPrice / 10000),
    count: stat.transactionCount,
    changeRate: stat.changeRate,
  }))

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]

  const biggestDrop = data.reduce<{ period: string; rate: number } | null>((acc, cur) => {
    if (!Number.isFinite(cur.changeRate)) return acc
    if (cur.changeRate >= 0) return acc
    if (!acc || cur.changeRate < acc.rate) return { period: cur.period, rate: cur.changeRate }
    return acc
  }, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>가격 추이 분석</CardTitle>
        <CardDescription>최근 {data.length}개월간 평균/최고/최저 거래가 변동</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">평균 거래가</div>
            <div className="text-2xl font-bold">{formatPrice(latest.avgPrice)}</div>
            <div className={`text-sm mt-1 ${latest.changeRate >= 0 ? "text-success" : "text-destructive"}`}>
              전월 대비 {formatChangeRate(latest.changeRate)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">최고가</div>
            <div className="text-2xl font-bold">{formatPrice(latest.maxPrice)}</div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">최저가</div>
            <div className="text-2xl font-bold">{formatPrice(latest.minPrice)}</div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">거래 건수</div>
            <div className="text-2xl font-bold">{latest.transactionCount}</div>
            {previous ? (
              <div
                className={`text-sm mt-1 ${
                  latest.transactionCount >= previous.transactionCount ? "text-success" : "text-destructive"
                }`}
              >
                전월 대비 {latest.transactionCount - previous.transactionCount > 0 ? "+" : ""}
                {latest.transactionCount - previous.transactionCount}건
              </div>
            ) : null}
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">최근 폭락(최대)</div>
            {biggestDrop ? (
              <>
                <div className="text-lg font-bold">{biggestDrop.period}</div>
                <div className="text-sm mt-1 text-destructive">{formatChangeRate(biggestDrop.rate)}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">하락 구간 없음</div>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="period" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "가격(억원)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: any, name: string) => {
                if (name === "거래 건수") return [`${value}건`, name]
                return [`${value}억`, name]
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="maxEok" name="최고가" stroke="hsl(var(--destructive))" fill="url(#colorMax)" strokeWidth={2} />
            <Area type="monotone" dataKey="avgEok" name="평균가" stroke="hsl(var(--primary))" fill="url(#colorAvg)" strokeWidth={3} />
            <Area type="monotone" dataKey="minEok" name="최저가" stroke="hsl(var(--success))" fill="url(#colorMin)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

