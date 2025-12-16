"use client"

import { type RegionPriceRange, formatPrice } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface RegionComparisonProps {
  data: RegionPriceRange[]
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function RegionComparison({ data }: RegionComparisonProps) {
  // 차트 데이터 변환
  const chartData = data.map((item) => ({
    지역: item.region,
    저가: Math.floor(item.low / 10000),
    중가: Math.floor(item.medium / 10000),
    고가: Math.floor(item.high / 10000),
    거래건수: item.count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>지역별 가격 비교</CardTitle>
        <CardDescription>지역별 가격대 분포 (저가 · 중위값 · 고가)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 지역별 통계 테이블 */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">지역</th>
                <th className="text-right p-2 font-semibold">저가 (25%)</th>
                <th className="text-right p-2 font-semibold">중위값 (50%)</th>
                <th className="text-right p-2 font-semibold">고가 (75%)</th>
                <th className="text-right p-2 font-semibold">거래건수</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.region} className="border-b hover:bg-muted/50">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-medium">{item.region}</span>
                    </div>
                  </td>
                  <td className="text-right p-2 text-muted-foreground">{formatPrice(item.low)}</td>
                  <td className="text-right p-2 font-semibold">{formatPrice(item.medium)}</td>
                  <td className="text-right p-2 text-muted-foreground">{formatPrice(item.high)}</td>
                  <td className="text-right p-2 text-muted-foreground">{item.count}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 차트 */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="지역" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
                if (name === "거래건수") return [value + "건", name]
                return [value + "억원", name]
              }}
            />
            <Legend />
            <Bar dataKey="저가" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="중가" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="고가" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
