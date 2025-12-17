"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { computeRecentDealYmds } from "@/hooks/use-period-filter"
import { fetchRealEstateData, type PriceStatistics, type RealEstateTransaction } from "@/lib/api/real-estate"

function getPropertyMatchKeys(t: RealEstateTransaction | null) {
  if (!t) return { full: "", loose: "" }
  const areaKey = Math.round((t.area || 0) * 10)
  const full = `${t.dongName}|${t.jibun}|${t.address}|${areaKey}`
  const loose = `${t.dongName}|${t.jibun}|${areaKey}`
  return { full, loose }
}

export function usePropertyTrend() {
  const [selectedPropertyStatistics, setSelectedPropertyStatistics] = useState<PriceStatistics[]>([])
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(null)
  const [isPropertyTrendLoading, setIsPropertyTrendLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadPropertyTrend = useCallback(async (lawdCd: string, base: RealEstateTransaction) => {
    if (abortRef.current) abortRef.current.abort()
    const aborter = new AbortController()
    abortRef.current = aborter

    setIsPropertyTrendLoading(true)
    setSelectedPropertyStatistics([])
    setSelectedPropertyLabel(base.address || null)

    try {
      const dealYmds = computeRecentDealYmds(12).reverse()
      const keys = getPropertyMatchKeys(base)

      const monthTxs = await Promise.all(dealYmds.map((ymd) => fetchRealEstateData(lawdCd, ymd)))
      if (aborter.signal.aborted) return

      const results: PriceStatistics[] = []
      for (let i = 0; i < dealYmds.length; i++) {
        const ymd = dealYmds[i]
        const period = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}`
        const list = monthTxs[i] ?? []
        const matches = list.filter((t) => {
          const k = getPropertyMatchKeys(t)
          return k.full === keys.full || k.loose === keys.loose
        })
        const prices = matches.map((m) => m.price).filter((p) => Number.isFinite(p) && p > 0)
        if (!prices.length) continue
        const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length)
        const maxPrice = Math.max(...prices)
        const minPrice = Math.min(...prices)
        const prev = results[results.length - 1]
        const changeRate = prev ? ((avgPrice - prev.avgPrice) / prev.avgPrice) * 100 : 0
        results.push({ period, avgPrice, maxPrice, minPrice, transactionCount: prices.length, changeRate })
      }

      if (!aborter.signal.aborted) setSelectedPropertyStatistics(results)
    } catch (e) {
      if (!aborter.signal.aborted) toast.error(e instanceof Error ? e.message : "선택 매물 추이를 불러오지 못했습니다.")
    } finally {
      if (!aborter.signal.aborted) setIsPropertyTrendLoading(false)
    }
  }, [])

  return {
    selectedPropertyStatistics,
    selectedPropertyLabel,
    isPropertyTrendLoading,
    loadPropertyTrend,
  }
}

