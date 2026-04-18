"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import {
  Sparkles, Users, TrendingUp, TrendingDown, Minus, MessageSquare, Tag, RefreshCw, Download, ArrowLeft,
} from "lucide-react"

type Entity = "contacts" | "leads"

interface ContactsAgg {
  total: number
  active: number
  withBrand: number
  withCategory: number
  avgEngagement: number
  growth: { last30: number; prev30: number; pct: number | null }
  byCategory: Array<{ category: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  topBrands: Array<{ brand: string; count: number }>
  sms: { everReceived: number; last30: number; last90: number; coverage: number }
  weekly: Array<{ week: string; count: number }>
  engagementByCategory: Array<{ category: string; avg_score: number; count: number }>
}

interface LeadsAgg {
  total: number
  avgScore: number
  growth: { last30: number; prev30: number; pct: number | null }
  byCategory: Array<{ category: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  topBrands: Array<{ brand: string; count: number }>
  weekly: Array<{ week: string; count: number }>
}

const CATEGORY_COLORS: Record<string, string> = {
  vip: "#a855f7",
  partner: "#14b8a6",
  prospect: "#f59e0b",
  regular: "#3b82f6",
  inactive: "#94a3b8",
  "(none)": "#cbd5e1",
}

const SOURCE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#6366f1", "#a855f7", "#14b8a6", "#ec4899", "#94a3b8"]

export default function InsightsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}
  const [entity, setEntity] = useState<Entity>(searchParams?.get("entity") === "leads" ? "leads" : "contacts")
  const [data, setData] = useState<ContactsAgg | LeadsAgg | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)

  const load = (refresh = false) => {
    setLoading(true)
    fetch(`/api/v1/analytics/segments?entity=${entity}${refresh ? "&refresh=1" : ""}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, orgId])

  const fetchInsights = async () => {
    if (!data) return
    setInsightsLoading(true)
    setInsights([])
    try {
      const res = await fetch("/api/v1/analytics/segments/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ entity, aggregate: data, locale: "ru" }),
      })
      const json = await res.json()
      if (json.success) setInsights(json.data.insights || [])
    } finally {
      setInsightsLoading(false)
    }
  }

  const drillTo = (filter: string) => {
    router.push(`/${entity}?${filter}`)
  }

  const exportCsv = () => {
    if (!data) return
    const rows: string[] = []
    rows.push("type,key,count")
    for (const r of data.byCategory) rows.push(`category,${r.category},${r.count}`)
    for (const r of data.bySource) rows.push(`source,${r.source},${r.count}`)
    for (const r of data.topBrands) rows.push(`brand,${r.brand},${r.count}`)
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entity}-segments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const weeklyFormatted = useMemo(() => {
    return (data?.weekly || []).map(w => ({
      week: new Date(w.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: w.count,
    }))
  }, [data])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${entity}`)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to {entity}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Segment insights</h1>
          <p className="text-sm text-muted-foreground">Breakdown by category, source, brand. SMS attribution. Growth trend.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-muted rounded-lg">
            <button onClick={() => setEntity("contacts")} className={`px-3 py-1 text-sm rounded-md ${entity === "contacts" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Contacts</button>
            <button onClick={() => setEntity("leads")} className={`px-3 py-1 text-sm rounded-md ${entity === "leads" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Leads</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(true)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="grid grid-cols-2 gap-3"><div className="h-72 bg-muted rounded-lg" /><div className="h-72 bg-muted rounded-lg" /></div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={Users} label={`Total ${entity}`} value={data.total} />
            <StatTile
              icon={data.growth.pct == null || data.growth.pct >= 0 ? TrendingUp : TrendingDown}
              label="New 30d"
              value={data.growth.last30}
              sub={data.growth.pct == null ? "—" : (data.growth.pct >= 0 ? "+" : "") + data.growth.pct + "% vs prev 30d"}
              subColor={data.growth.pct == null ? "text-muted-foreground" : data.growth.pct >= 0 ? "text-green-600" : "text-red-500"}
            />
            <StatTile icon={Tag} label="With brand" value={(data as any).withBrand ?? (data as any).topBrands.length} sub={`${(data as any).topBrands.length} unique`} />
            {entity === "contacts" ? (
              <StatTile icon={MessageSquare} label="SMS coverage" value={`${(data as ContactsAgg).sms.coverage}%`} sub={`${(data as ContactsAgg).sms.everReceived} / ${data.total}`} />
            ) : (
              <StatTile icon={Sparkles} label="Avg score" value={(data as LeadsAgg).avgScore} />
            )}
          </div>

          {/* AI insights */}
          <div className="rounded-lg border bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <Sparkles className="h-4 w-4" /> AI insights
              </h2>
              <Button variant="outline" size="sm" onClick={fetchInsights} disabled={insightsLoading}>
                {insightsLoading ? "Analyzing…" : insights.length ? "Regenerate" : "Generate"}
              </Button>
            </div>
            {insights.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {insights.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-violet-500">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Click Generate to ask Claude Haiku to summarize the current aggregate.</p>
            )}
          </div>

          {/* Category + Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">By category</h2>
              {data.byCategory.length === 0 || data.byCategory.every(r => r.category === "(none)") ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No {entity} have a category yet. Assign one from the detail page or import.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.byCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e: any) => `${e.category} (${e.count})`}
                      onClick={(e: any) => e?.category && e.category !== "(none)" && drillTo(`category=${e.category}`)}
                    >
                      {data.byCategory.map((r, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[r.category] || "#cbd5e1"} style={{ cursor: r.category === "(none)" ? "default" : "pointer" }} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">By source</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.bySource}>
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" onClick={(e: any) => e?.source && e.source !== "(none)" && drillTo(`source=${e.source}`)}>
                    {data.bySource.map((r, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} style={{ cursor: r.source === "(none)" ? "default" : "pointer" }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top brands + Weekly timeseries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Top 10 brands</h2>
              {data.topBrands.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No brand values set yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, data.topBrands.length * 30)}>
                  <BarChart data={data.topBrands} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="brand" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#6366f1"
                      style={{ cursor: "pointer" }}
                      onClick={(e: any) => e?.brand && drillTo(`search=${encodeURIComponent(e.brand)}`)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">New {entity} per week (12 weeks)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyFormatted}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Contacts-specific: SMS + Engagement */}
          {entity === "contacts" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" /> SMS attribution
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-2xl font-bold">{(data as ContactsAgg).sms.everReceived}</p>
                    <p className="text-[11px] text-muted-foreground">Ever received</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-2xl font-bold">{(data as ContactsAgg).sms.last30}</p>
                    <p className="text-[11px] text-muted-foreground">Last 30 days</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-2xl font-bold">{(data as ContactsAgg).sms.last90}</p>
                    <p className="text-[11px] text-muted-foreground">Last 90 days</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${(data as ContactsAgg).sms.coverage}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(data as ContactsAgg).sms.coverage}% of contacts have SMS attribution
                </p>
                {(data as ContactsAgg).sms.everReceived === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                    No SMS campaigns recorded. Run one from <code className="bg-muted px-1 rounded">/campaigns</code>.
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">Engagement by category</h2>
                <div className="space-y-2">
                  {(data as ContactsAgg).engagementByCategory.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize text-[10px] w-20 justify-center">{r.category}</Badge>
                      <div className="flex-1 h-3 bg-muted rounded overflow-hidden relative">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(100, r.avg_score)}%`,
                            backgroundColor: CATEGORY_COLORS[r.category] || "#cbd5e1",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right font-medium">{r.avg_score}</span>
                      <span className="text-[10px] text-muted-foreground w-16 text-right">({r.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, sub, subColor }: { icon: any; label: string; value: number | string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subColor || "text-muted-foreground"}`}>{sub}</p>}
    </div>
  )
}
