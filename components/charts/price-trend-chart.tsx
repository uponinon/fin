"use client"

import { type PriceStatistics, formatChangeRate } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface PriceTrendChartProps {
  data: PriceStatistics[]
}

export function PriceTrendChart({ data }: PriceTrendChartProps) {
  // 차트 데이터 포맷 변환
  const chartData = data.map((stat) => ({
    period: stat.period,
    평균가격: Math.floor(stat.avgPrice / 10000), // 억원 단위
    최고가: Math.floor(stat.maxPrice / 10000),
    최저가: Math.floor(stat.minPrice / 10000),
    거래건수: stat.transactionCount,
    변동률: stat.changeRate,
  }))

  // 가장 최근 월 데이터
  const latestData = data[data.length - 1]
  const previousData = data[data.length - 2]

  return (
    <Card>
      <CardHeader>
        <CardTitle>가격 추이 분석</CardTitle>
        <CardDescription>최근 12개월간 부동산 거래 가격 변동</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 주요 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">평균 가격</div>
            <div className="text-2xl font-bold">{Math.floor(latestData.avgPrice / 10000)}억</div>
            <div className={`text-sm mt-1 ${latestData.changeRate >= 0 ? "text-success" : "text-destructive"}`}>
              {formatChangeRate(latestData.changeRate)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">최고가</div>
            <div className="text-2xl font-bold">{Math.floor(latestData.maxPrice / 10000)}억</div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">최저가</div>
            <div className="text-2xl font-bold">{Math.floor(latestData.minPrice / 10000)}억</div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground mb-1">거래 건수</div>
            <div className="text-2xl font-bold">{latestData.transactionCount}</div>
            {previousData && (
              <div
                className={`text-sm mt-1 ${
                  latestData.transactionCount >= previousData.transactionCount ? "text-success" : "text-destructive"
                }`}
              >
                {latestData.transactionCount - previousData.transactionCount > 0 ? "+" : ""}
                {latestData.transactionCount - previousData.transactionCount}건
              </div>
            )}
          </div>
        </div>

        {/* 차트 */}
        <ResponsiveContainer width="100%" height={400}>
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
              label={{ value: "가격 (억원)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: any, name: string) => {
                if (name === "변동률") return [formatChangeRate(value), name]
                if (name === "거래건수") return [value + "건", name]
                return [value + "억원", name]
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="최고가"
              stroke="hsl(var(--destructive))"
              fill="url(#colorMax)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="평균가격"
              stroke="hsl(var(--primary))"
              fill="url(#colorAvg)"
              strokeWidth={3}
            />
            <Area type="monotone" dataKey="최저가" stroke="hsl(var(--success))" fill="url(#colorMin)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
