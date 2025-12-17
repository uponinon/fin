"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

export type PeriodMode = "preset" | "custom"

export type PeriodFilterState = {
  mode: PeriodMode
  presetMonths: number
  customStartDate: Date | null
  customEndDate: Date | null
}

const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

export function formatDateLabel(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

export function toDateParam(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function computeRecentDealYmds(months: number) {
  const safeMonths = Number.isFinite(months) ? Math.max(1, Math.min(12, Math.floor(months))) : 3
  const now = new Date()
  const res: string[] = []
  for (let i = 0; i < safeMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    res.push(`${y}${m}`)
  }
  return res
}

export function collectDealYmdsBetween(start: Date, end: Date) {
  const res: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, "0")
    res.push(`${y}${m}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return res
}

export function validateAndNormalizeCustomRange(start: Date, end: Date) {
  const normalized = normalizeCustomRange(start, end)
  if (normalized.capped) toast.error("최대 조회기간은 12개월입니다.")
  return normalized
}

export function normalizeCustomRange(start: Date, end: Date) {
  const normalizedStart = start <= end ? start : end
  const normalizedEnd = start <= end ? end : start
  const maxEndMonth = new Date(normalizedStart.getFullYear(), normalizedStart.getMonth() + 11, 1)
  const maxEnd = endOfMonth(maxEndMonth)
  if (normalizedEnd > maxEnd) {
    return { start: normalizedStart, end: maxEnd, capped: true }
  }
  return { start: normalizedStart, end: normalizedEnd, capped: false }
}

export function usePeriodFilter(initialMonths = 3) {
  const [mode, setMode] = useState<PeriodMode>("preset")
  const [presetMonths, setPresetMonths] = useState<number>(initialMonths)
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)

  const ensureCustomDefaults = useCallback(() => {
    if (customStartDate && customEndDate) return
    const end = new Date()
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    setCustomStartDate(start)
    setCustomEndDate(end)
  }, [customStartDate, customEndDate])

  const normalizedCustom = useMemo(() => {
    if (mode !== "custom" || !customStartDate || !customEndDate) return null
    return normalizeCustomRange(customStartDate, customEndDate)
  }, [mode, customStartDate, customEndDate])

  const dealYmds = useMemo(() => {
    if (mode === "custom" && normalizedCustom) {
      return collectDealYmdsBetween(normalizedCustom.start, normalizedCustom.end)
    }
    return computeRecentDealYmds(presetMonths)
  }, [mode, normalizedCustom, presetMonths])

  const statisticsParams = useMemo(() => {
    if (mode === "custom" && normalizedCustom) {
      return { startDate: toDateParam(normalizedCustom.start), endDate: toDateParam(normalizedCustom.end) } as const
    }
    return { months: presetMonths } as const
  }, [mode, normalizedCustom, presetMonths])

  return {
    mode,
    setMode,
    presetMonths,
    setPresetMonths,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    ensureCustomDefaults,
    normalizedCustom,
    dealYmds,
    statisticsParams,
  }
}
