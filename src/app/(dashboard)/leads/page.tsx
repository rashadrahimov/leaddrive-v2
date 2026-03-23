"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { LeadForm } from "@/components/lead-form"
import { LeadConvertDialog } from "@/components/lead-convert-dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { LeadItemModal } from "@/components/lead-item-modal"
import {
  UserPlus, Plus, Search, Pencil, Trash2, ArrowRight,
  Brain, Phone, Mail, Building2, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface Lead {
  id: string
  contactName: string
  companyName: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: string
  priority: string
  score: number
  scoreDetails: any
  estimatedValue: number | null
  notes: string | null
  lastScoredAt: string | null
  createdAt: string
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

const priorityColors: Record<string, string> = {
  low: "text-gray-500", medium: "text-yellow-600", high: "text-red-600",
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export default function LeadsPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const t = useTranslations("leads")
  const tc = useTranslations("common")

  const statusLabels: Record<string, string> = {
    new: t("statusNew"), contacted: t("statusContacted"), qualified: t("statusQualified"),
    converted: t("statusConverted"), lost: t("statusLost"),
  }
  const sourceLabels: Record<string, string> = {
    website: t("sourceWebsite"), referral: t("sourceReferral"), cold_call: t("sourceColdCall"),
    linkedin: t("sourceLinkedin"), email: t("sourceEmail"),
  }
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("score_desc")
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Lead | undefined>()
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/v1/leads?limit=500&includeConverted=true", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setLeads(json.data.leads || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/leads/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchLeads()
  }

  // Filter & sort
  const filtered = leads.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.contactName.toLowerCase().includes(q) ||
        (l.companyName || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "score_desc": return b.score - a.score
      case "score_asc": return a.score - b.score
      case "name_asc": return a.contactName.localeCompare(b.contactName)
      case "name_desc": return b.contactName.localeCompare(a.contactName)
      case "company_asc": return (a.companyName || "").localeCompare(b.companyName || "")
      case "company_desc": return (b.companyName || "").localeCompare(a.companyName || "")
      case "conversion_desc": {
        const ca = (a.scoreDetails as any)?.conversionProb ?? Math.round(a.score * 0.85)
        const cb = (b.scoreDetails as any)?.conversionProb ?? Math.round(b.score * 0.85)
        return cb - ca
      }
      case "conversion_asc": {
        const ca = (a.scoreDetails as any)?.conversionProb ?? Math.round(a.score * 0.85)
        const cb = (b.scoreDetails as any)?.conversionProb ?? Math.round(b.score * 0.85)
        return ca - cb
      }
      case "source_asc": return (a.source || "").localeCompare(b.source || "")
      case "source_desc": return (b.source || "").localeCompare(a.source || "")
      case "status_asc": return a.status.localeCompare(b.status)
      case "status_desc": return b.status.localeCompare(a.status)
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default: return 0
    }
  })

  // Stats
  const statusCounts: Record<string, number> = {}
  leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1 })
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0
  const hotLeads = leads.filter(l => l.score >= 80).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded-lg w-full" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")} ({leads.length})</h1>
            <p className="text-sm text-muted-foreground">
              {t("avgScore")}: {avgScore}/100 · {t("hotLeads")}: {hotLeads}
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> {t("newLead")}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          {t("all")} ({leads.length})
        </Button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
          >
            {label} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[180px]">
          <option value="score_desc">{t("sortScoreDesc")}</option>
          <option value="score_asc">{t("sortScoreAsc")}</option>
          <option value="name_asc">{t("sortNameAsc")}</option>
          <option value="name_desc">{t("sortNameDesc")}</option>
          <option value="newest">{t("sortNewest")}</option>
        </Select>
      </div>

      {/* Leads table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {[
                { key: "score", label: t("colScore"), className: "w-16 px-4" },
                { key: "name", label: t("colLead"), className: "px-4" },
                { key: "company", label: t("colCompany"), className: "px-4" },
                { key: null, label: t("colContacts"), className: "px-4" },
                { key: "conversion", label: t("colConversion"), className: "px-3" },
                { key: "source", label: t("colSource"), className: "px-3" },
                { key: "status", label: t("colStatus"), className: "px-3" },
              ].map(col => {
                const isActive = col.key && sortBy.startsWith(col.key)
                const isDesc = sortBy.endsWith("_desc")
                const SortIcon = !col.key ? null : isActive ? (isDesc ? ArrowDown : ArrowUp) : ArrowUpDown
                return (
                  <th
                    key={col.label}
                    className={cn(
                      "py-3 text-left font-medium text-muted-foreground select-none",
                      col.className,
                      col.key && "cursor-pointer hover:text-foreground transition-colors"
                    )}
                    onClick={col.key ? () => {
                      if (isActive) {
                        setSortBy(`${col.key}_${isDesc ? "asc" : "desc"}`)
                      } else {
                        setSortBy(`${col.key}_desc`)
                      }
                    } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {SortIcon && <SortIcon className={cn("h-3 w-3", isActive ? "text-primary" : "opacity-40")} />}
                    </span>
                  </th>
                )
              })}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                {search ? t("noResults") : t("noLeads")}
              </td></tr>
            ) : filtered.map(lead => {
              const grade = getGrade(lead.score)
              return (
                <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold", grade.color)}>
                        {grade.letter}
                      </span>
                      <span className="font-bold text-sm">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{lead.contactName}</span>
                    {lead.estimatedValue ? (
                      <span className="text-xs text-muted-foreground ml-2">${lead.estimatedValue.toLocaleString()}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {lead.companyName ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {lead.companyName}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {lead.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </span>
                      )}
                      {!lead.email && !lead.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      const convProb = (lead.scoreDetails as any)?.conversionProb ?? Math.round(lead.score * 0.85)
                      return (
                        <span className={cn("text-xs font-bold", convProb >= 50 ? "text-green-600" : convProb >= 30 ? "text-yellow-600" : "text-red-500")}>
                          {convProb}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">
                    {lead.source ? sourceLabels[lead.source] || lead.source : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[lead.status] || "bg-gray-100")}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {lead.status !== "converted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs text-green-600 hover:text-green-700"
                          onClick={() => setConvertLead(lead)}
                          title={t("convertTooltip")}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => { setEditData(lead); setShowForm(true) }}
                        title={tc("edit")}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => { setDeleteId(lead.id); setDeleteName(lead.contactName) }}
                        title={tc("delete")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Lead Form */}
      <LeadForm
        open={showForm}
        onOpenChange={open => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchLeads}
        initialData={editData}
        orgId={orgId}
      />

      {/* Convert Dialog */}
      {convertLead && (
        <LeadConvertDialog
          open={!!convertLead}
          onOpenChange={open => { if (!open) setConvertLead(null) }}
          onConverted={fetchLeads}
          lead={convertLead}
          orgId={orgId}
        />
      )}

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteLead")}
        itemName={deleteName}
      />

      {/* Lead Detail Modal */}
      <LeadItemModal
        open={!!selectedLead}
        onOpenChange={open => { if (!open) setSelectedLead(null) }}
        lead={selectedLead}
        orgId={orgId}
        onSaved={fetchLeads}
        onConvert={lead => { setSelectedLead(null); setConvertLead(lead) }}
      />
    </div>
  )
}
