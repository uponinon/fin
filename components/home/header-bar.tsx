"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HomeIcon, RefreshCwIcon, SearchIcon } from "lucide-react"

type Props = {
  searchQuery: string
  onChangeSearchQuery: (value: string) => void
  onSearch: () => void
  onRefresh: () => void
  onHome?: () => void
  isLoading: boolean
  canRefresh: boolean
}

export function HeaderBar({ searchQuery, onChangeSearchQuery, onSearch, onRefresh, onHome, isLoading, canRefresh }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onHome}
              className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="홈으로"
            >
              <HomeIcon className="w-6 h-6 text-primary-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">떡락도 rock이다</h1>
              <p className="text-sm text-muted-foreground">공공 API 기반 실시간(준실시간) 가격 분석 대시보드</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder="지역(구/동) 또는 도로명 주소 검색"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch()
                }}
                className="w-[360px]"
              />
              <Button onClick={onSearch} disabled={isLoading} size="sm" variant="secondary">
                <SearchIcon className="w-4 h-4 mr-2" />
                검색
              </Button>
            </div>
            <Button onClick={onRefresh} disabled={isLoading || !canRefresh} size="sm">
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
