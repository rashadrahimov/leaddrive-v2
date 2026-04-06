"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Building2, Users, Handshake, UserPlus, CheckSquare, FileText } from "lucide-react"

interface SearchItem {
  id: string
  type: "company" | "contact" | "deal" | "lead" | "task" | "contract"
  name: string
  subtitle?: string
  href: string
}

const typeIcons: Record<string, React.ElementType> = {
  company: Building2, contact: Users, deal: Handshake, lead: UserPlus, task: CheckSquare, contract: FileText,
}

export function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.data || [])
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => { setSelectedIndex(0) }, [results])

  function handleSelect(item: SearchItem) {
    router.push(item.href)
    setOpen(false)
    setQuery("")
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    if (e.key === "Enter" && results[selectedIndex]) { handleSelect(results[selectedIndex]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search companies, contacts, deals..."
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
            ) : query.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Type at least 2 characters to search</div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              results.map((item, i) => {
                const Icon = typeIcons[item.type] || Search
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      i === selectedIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.name}</div>
                      {item.subtitle && <div className="text-xs text-muted-foreground">{item.subtitle}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">{item.type}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
