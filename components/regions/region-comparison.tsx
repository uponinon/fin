"use client"

import { type RegionPriceRange, formatPrice } from "@/lib/api/real-estate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface RegionComparisonProps {
  data: RegionPriceRange[]
}

const REGION_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const LOW_COLOR = "var(--chart-2)"
const MEDIAN_COLOR = "var(--chart-4)"
const HIGH_COLOR = "var(--chart-3)"

export function RegionComparison({ data }: RegionComparisonProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>지역별 가격 분포</CardTitle>
          <CardDescription>비교할 데이터가 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const chartData = data.map((item) => ({
    region: item.region,
    lowEok: Math.floor(item.low / 10000),
    medianEok: Math.floor(item.medium / 10000),
    highEok: Math.floor(item.high / 10000),
    count: item.count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>지역별 가격 분포</CardTitle>
        <CardDescription>지역별 하위/중위/상위(25/50/75%) 가격 비교</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">지역</th>
                <th className="text-right p-2 font-semibold">하위(25%)</th>
                <th className="text-right p-2 font-semibold">중위(50%)</th>
                <th className="text-right p-2 font-semibold">상위(75%)</th>
                <th className="text-right p-2 font-semibold">거래</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.region} className="border-b hover:bg-muted/50">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: REGION_COLORS[idx % REGION_COLORS.length] }}
                      />
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

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="region" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
              formatter={(value: any, name: string) => [`${value}억`, name]}
            />
            <Legend />
            <Bar dataKey="lowEok" name="하위(25%)" fill={LOW_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="medianEok" name="중위(50%)" fill={MEDIAN_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="highEok" name="상위(75%)" fill={HIGH_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

