"use client"

import { useEffect, useRef, useState } from "react"
import { type RealEstateTransaction } from "@/lib/api/real-estate"

export function useSelectedTransaction(viewportFiltered: RealEstateTransaction[]) {
  const [selectedTransaction, setSelectedTransaction] = useState<RealEstateTransaction | null>(null)
  const lastUserSelectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    setSelectedTransaction((prev) => {
      if (!viewportFiltered.length) return null
      if (prev && viewportFiltered.some((t) => t.id === prev.id)) return prev
      if (prev && lastUserSelectedIdRef.current && prev.id === lastUserSelectedIdRef.current) return prev
      return viewportFiltered[0]
    })
  }, [viewportFiltered])

  const selectTransaction = (t: RealEstateTransaction) => {
    lastUserSelectedIdRef.current = t.id
    setSelectedTransaction(t)
  }

  return {
    selectedTransaction,
    setSelectedTransaction: selectTransaction,
    lastUserSelectedIdRef,
  }
}

