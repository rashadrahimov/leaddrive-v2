"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T, index?: number) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchPlaceholder?: string
  searchKey?: string
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
  pageSize?: number
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 0] // 0 = all

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKey = "name",
  onRowClick,
  rowClassName,
  pageSize: defaultPageSize = 20,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortCol, setSortCol] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const t = useTranslations("common")

  const filtered = data.filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    // Search across all string values including nested objects (e.g. company.name)
    const values = Object.values(item).flatMap((v) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.values(v as Record<string, unknown>).map((nv) => String(nv || ""))
      }
      return [String(v || "")]
    })
    return values.some((val) => val.toLowerCase().includes(q))
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0
    const aVal = String(a[sortCol] || "")
    const bVal = String(b[sortCol] || "")
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
    return sortAsc ? cmp : -cmp
  })

  const showAll = pageSize === 0
  const effectivePageSize = showAll ? sorted.length : pageSize
  const totalPages = showAll ? 1 : Math.ceil(sorted.length / pageSize)
  const paginated = showAll ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize)
  const globalOffset = showAll ? 0 : (page - 1) * pageSize

  function toggleSort(key: string) {
    if (sortCol === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(key)
      setSortAsc(true)
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize)
    setPage(1)
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder || t("search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{t("results", { count: filtered.length })}</span>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#1e3a5f]/[0.04] dark:bg-white/[0.04]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.className
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortCol === col.key && (
                      sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr
                key={String(item.id || i)}
                className={cn(
                  "border-b transition-colors hover:bg-[#0ea5a0]/[0.04] dark:hover:bg-[#0ea5a0]/[0.08]",
                  i % 2 === 1 && "bg-muted/20",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(item)
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render ? col.render(item, globalOffset + i) : String(item[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {totalPages > 1 ? t("pageOf", { current: page, total: totalPages }) : `${sorted.length} ${t("results", { count: sorted.length }).split(" ").slice(-1)[0]}`}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  pageSize === size
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {size === 0 ? t("all") || "Hamısı" : size}
              </button>
            ))}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
