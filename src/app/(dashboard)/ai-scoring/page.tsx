"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Brain, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScoredLead {
  id: string
  contactName: string
  companyName: string | null
  source: string | null
  status: string
  score: number
  grade: string
  conversionProb: number
  lastScoredAt: string | null
  estimatedValue: number | null
}

const gradeColors: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
}

const gradeBgLight: Record<string, string> = {
  A: "bg-green-50 dark:bg-green-900/20",
  B: "bg-blue-50 dark:bg-blue-900/20",
  C: "bg-yellow-50 dark:bg-yellow-900/20",
  D: "bg-orange-50 dark:bg-orange-900/20",
  F: "bg-red-50 dark:bg-red-900/20",
}

export default function AILeadScoringPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [leads, setLeads] = useState<ScoredLead[]>([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [scoringId, setScoringId] = useState<string | null>(null)

  const fetchLeads = async () => {
    if (!orgId) return
    try {
      const res = await fetch("/api/v1/lead-scoring", {
        headers: { "x-organization-id": String(orgId) },
      })
      const json = await res.json()
      if (json.success) setLeads(json.data.leads)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [orgId])

  async function scoreAll() {
    setScoring(true)
    try {
      await fetch("/api/v1/lead-scoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({}),
      })
      await fetchLeads()
    } catch {} finally { setScoring(false) }
  }

  async function scoreOne(leadId: string) {
    setScoringId(leadId)
    try {
      await fetch("/api/v1/lead-scoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ leadId }),
      })
      await fetchLeads()
    } catch {} finally { setScoringId(null) }
  }

  // Grade distribution
  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  leads.forEach(l => { gradeCounts[l.grade] = (gradeCounts[l.grade] || 0) + 1 })
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0
  const avgConversion = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.conversionProb, 0) / leads.length) : 0
  const totalScored = leads.filter(l => l.lastScoredAt).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Lead Scoring</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Lead Scoring</h1>
            <p className="text-sm text-muted-foreground">AI-скоринг лидов — автоматическая оценка и ранжирование</p>
          </div>
        </div>
        <Button onClick={scoreAll} disabled={scoring} className="gap-2">
          {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Оценить все лиды с AI
        </Button>
      </div>

      {/* Grade cards — like v1 */}
      <div className="grid grid-cols-5 gap-3">
        {(["A", "B", "C", "D", "F"] as const).map(grade => (
          <div key={grade} className={cn("rounded-lg p-5 text-center", gradeBgLight[grade])}>
            <div className={cn("text-4xl font-bold", {
              "text-green-600": grade === "A",
              "text-blue-600": grade === "B",
              "text-yellow-600": grade === "C",
              "text-orange-600": grade === "D",
              "text-red-600": grade === "F",
            })}>
              {grade}
            </div>
            <div className="text-2xl font-bold mt-1">{gradeCounts[grade]}</div>
            <div className="text-xs text-muted-foreground">лидов</div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-8 text-sm">
        <span>Средний балл: <strong className="text-primary">{avgScore}/100</strong></span>
        <span>Ср. вероятность конверсии: <strong className="text-primary">{avgConversion}%</strong></span>
        <span>Всего оценено: <strong className="text-primary">{totalScored}</strong></span>
      </div>

      {/* Lead table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Топ-перспективы / Top Perspektivlər</h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Грейд</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Балл</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Лид</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Источник</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Конверсия</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">AI Прогноз</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Нет лидов</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold", gradeColors[lead.grade])}>
                      {lead.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">{lead.score}</td>
                  <td className="px-4 py-3 font-medium">{lead.contactName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.companyName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.source || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-medium", lead.conversionProb >= 50 ? "text-green-600" : "text-red-500")}>
                      {lead.conversionProb}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={scoringId === lead.id}
                      onClick={() => scoreOne(lead.id)}
                    >
                      {scoringId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Пересчитать
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
