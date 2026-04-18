"use client"

import { useEffect, useState } from "react"
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts"
import { AlertTriangle } from "lucide-react"

interface AnalyticsData {
  range: { days: number; since: string; until: string }
  totals: { mentions: number; engagement: number; reach: number }
  sentiment: { positive: number; neutral: number; negative: number }
  status: Record<string, number>
  timeseries: { day: string; total: number; positive: number; neutral: number; negative: number; engagement: number }[]
  topPlatforms: { platform: string; count: number }[]
  topTerms: { term: string; count: number }[]
  topAuthors: { handle: string; name: string | null; count: number; platform: string }[]
  negativeSpike: { today: number; avg7d: number } | null
}

const SENTIMENT_COLORS = {
  positive: "#10b981",
  neutral: "#6b7280",
  negative: "#ef4444",
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1da1f2",
  instagram: "#e1306c",
  facebook: "#1877f2",
  telegram: "#0088cc",
  vkontakte: "#0077ff",
  youtube: "#ff0000",
  tiktok: "#010101",
}

interface Props {
  orgId: string | number | undefined
  days?: number
}

export function SocialAnalyticsPanel({ orgId, days = 30 }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [range, setRange] = useState(days)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const headers = { "x-organization-id": String(orgId) }
    fetch(`/api/v1/social/analytics?days=${range}`, { headers })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [orgId, range])

  if (loading) {
    return <div className="rounded-lg border bg-card p-5 animate-pulse h-64" />
  }
  if (!data) return null

  const hasData = data.totals.mentions > 0
  const sentimentPie = [
    { name: "positive", value: data.sentiment.positive, fill: SENTIMENT_COLORS.positive },
    { name: "neutral", value: data.sentiment.neutral, fill: SENTIMENT_COLORS.neutral },
    { name: "negative", value: data.sentiment.negative, fill: SENTIMENT_COLORS.negative },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-4">
      {data.negativeSpike && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span>
            <b>Negative spike today</b> — {data.negativeSpike.today} negative mentions vs 7-day avg {data.negativeSpike.avg7d}.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Analytics</h3>
        <div className="flex items-center gap-1 text-xs">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-2.5 py-1 rounded-md border ${range === d ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No mentions in the last {range} days.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="text-xs font-semibold mb-3 text-muted-foreground">Mentions over time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="All" />
                <Line type="monotone" dataKey="negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={1.5} dot={false} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h4 className="text-xs font-semibold mb-3 text-muted-foreground">Sentiment</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentimentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {sentimentPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h4 className="text-xs font-semibold mb-3 text-muted-foreground">Top platforms</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topPlatforms} layout="vertical" margin={{ left: 40, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.topPlatforms.map((p, i) => <Cell key={i} fill={PLATFORM_COLORS[p.platform] || "#6b7280"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h4 className="text-xs font-semibold mb-3 text-muted-foreground">Top authors</h4>
            {data.topAuthors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No author data yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topAuthors.slice(0, 8).map(a => (
                  <li key={a.handle} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[a.platform] || "#6b7280" }} />
                      <span className="font-medium truncate">{a.name || a.handle}</span>
                      <span className="text-muted-foreground truncate">@{a.handle}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{a.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.topTerms.length > 0 && (
            <div className="rounded-lg border bg-card p-4 md:col-span-2">
              <h4 className="text-xs font-semibold mb-3 text-muted-foreground">Top matched keywords</h4>
              <div className="flex flex-wrap gap-2">
                {data.topTerms.map(t => (
                  <span key={t.term} className="inline-flex items-center gap-1.5 text-xs rounded-full border bg-background px-3 py-1">
                    <span className="font-medium">{t.term}</span>
                    <span className="text-muted-foreground tabular-nums">· {t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
