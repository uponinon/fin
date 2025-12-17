"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchPriceStatistics, fetchPriceStatisticsRange, fetchRealEstateData, type PriceStatistics, type RealEstateTransaction } from "@/lib/api/real-estate"

type StatsParams = { months: number } | { startDate: string; endDate: string }

export function useMarketData(lawdCd: string | null | undefined, dealYmds: string[], statsParams: StatsParams) {
  const [transactions, setTransactions] = useState<RealEstateTransaction[]>([])
  const [statistics, setStatistics] = useState<PriceStatistics[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const canLoad = useMemo(() => Boolean(lawdCd && dealYmds.length > 0), [lawdCd, dealYmds.length])

  const load = useCallback(async () => {
    if (!lawdCd) return
    if (!dealYmds.length) return

    if (abortRef.current) abortRef.current.abort()
    const aborter = new AbortController()
    abortRef.current = aborter

    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [transactionChunks, statsData] = await Promise.all([
        Promise.all(dealYmds.map((ymd) => fetchRealEstateData(lawdCd, ymd))),
        "months" in statsParams
          ? fetchPriceStatistics(lawdCd, statsParams.months)
          : fetchPriceStatisticsRange(lawdCd, statsParams.startDate, statsParams.endDate),
      ])
      if (aborter.signal.aborted) return
      setTransactions(transactionChunks.flat())
      setStatistics(statsData)
    } catch (error) {
      if (aborter.signal.aborted) return
      setErrorMessage(error instanceof Error ? error.message : "데이터 로드 중 오류가 발생했습니다.")
    } finally {
      if (!aborter.signal.aborted) setIsLoading(false)
    }
  }, [lawdCd, dealYmds, statsParams])

  useEffect(() => {
    if (!canLoad) return
    void load()
  }, [canLoad, load])

  return {
    transactions,
    statistics,
    isLoading,
    errorMessage,
    reload: load,
    setErrorMessage,
  }
}

