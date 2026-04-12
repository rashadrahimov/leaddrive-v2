"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Building2, Users, FileText, X, Trash2, Ban, Plus, Pencil, Ticket, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"
import { DEFAULT_CURRENCY } from "@/lib/constants"
import { toast } from "sonner"

interface LeadCompany {
  id: string
  name: string
  website?: string
  industry?: string
  email?: string
  phone?: string
  description?: string
  category: string
  leadStatus: string
  leadScore: number
  leadTemperature?: string
  userCount: number
  annualRevenue?: number
  createdAt?: string
  contacts?: Array<{ id: string; fullName: string; email?: string; phone?: string; position?: string }>
  deals?: Array<{ id: string; title: string; stage: string; valueAmount?: number }>
  _count?: { contacts: number; deals: number }
}

interface LeadDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: LeadCompany | null
  orgId?: string
  onSaved?: () => void
}

// statusLabels defined inside component with translations

const statusColors: Record<string, string> = {
  new: "bg-blue-500", contacted: "bg-yellow-500", qualified: "bg-purple-500",
  converted: "bg-green-500", rejected: "bg-muted-foreground/40", cancelled: "bg-red-500",
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export function LeadDetailModal({ open, onOpenChange, company, orgId, onSaved }: LeadDetailModalProps) {
  const router = useRouter()
  const t = useTranslations("leads")
  const locale = useLocale()

  const statusLabels: Record<string, string> = {
    new: t("ldmStatusNew"), contacted: t("ldmStatusContacted"), qualified: t("ldmStatusQualified"),
    converted: t("ldmStatusConverted"), rejected: t("ldmStatusRejected"), cancelled: t("ldmStatusCancelled"),
  }

  const [activeTab, setActiveTab] = useState("details")

  // Activity state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState("note")
  const [activitySubject, setActivitySubject] = useState("")
  const [activityDesc, setActivityDesc] = useState("")
  const [activitySaving, setActivitySaving] = useState(false)

  // About state
  const [editingAbout, setEditingAbout] = useState(false)
  const [aboutText, setAboutText] = useState("")

  // Activities & Tickets
  const [activities, setActivities] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  // Full company data loaded from API
  const [fullData, setFullData] = useState<any>(null)

  useEffect(() => {
    if (open && company) {
      setActiveTab("details")
      setAboutText(company.description || "")
      setFullData(null)
      setTickets([])
      // Load full company data with contacts and deals
      fetch(`/api/v1/companies/${company.id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      }).then(r => r.json()).then(json => {
        if (json.success && json.data) {
          setFullData(json.data)
          if (json.data.description) setAboutText(json.data.description)
        }
      }).catch(() => {})
    }
  }, [open, company])

  if (!company) return null

  // Universal field update + reload
  const updateField = async (fields: Record<string, any>) => {
    await fetch(`/api/v1/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
      body: JSON.stringify(fields),
    })
    // Reload full data
    const res = await fetch(`/api/v1/companies/${company.id}`, { headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
    const json = await res.json()
    if (json.success && json.data) setFullData(json.data)
    onSaved?.()
  }

  const saveAbout = async () => {
    await updateField({ description: aboutText })
    setEditingAbout(false)
  }

  const changeStatus = async (newStatus: string) => {
    await updateField({ leadStatus: newStatus, ...(newStatus === "converted" ? { category: "client" } : {}) })
  }

  const editField = (label: string, field: string, currentValue: any, isNumber = false) => {
    const val = prompt(`${label}:`, String(currentValue || ""))
    if (val === null) return
    updateField({ [field]: isNumber ? (parseInt(val) || 0) : val })
  }

  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/v1/activities?companyId=${company.id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) setActivities(json.data.activities || [])
    } catch (err) { console.error(err) }
  }

  const saveActivity = async () => {
    if (!activitySubject.trim()) return
    setActivitySaving(true)
    try {
      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({
          type: activityType,
          subject: activitySubject,
          description: activityDesc,
          companyId: company.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setShowActivityForm(false)
        setActivitySubject("")
        setActivityDesc("")
        loadActivities()
      } else {
        toast.error(t("ldmSaveError") + ": " + (json.error || ""))
      }
    } catch (e) {
      toast.error(t("ldmNetworkError"))
    } finally { setActivitySaving(false) }
  }

  const loadTickets = async () => {
    setTicketsLoading(true)
    try {
      const res = await fetch(`/api/v1/tickets?companyId=${company.id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) setTickets(json.data?.tickets || [])
    } catch (err) { console.error(err) } finally { setTicketsLoading(false) }
  }

  const currentScore = fullData?.leadScore ?? company.leadScore ?? 0
  const temp = fullData?.leadTemperature || company.leadTemperature || "cold"
  const grade = getGrade(currentScore)

  const tabs = [
    { id: "details", label: t("modalDetails") },
    { id: "contacts", label: t("modalContacts") },
    { id: "deals", label: t("modalDeals") },
    { id: "activity", label: t("modalActivity") },
    { id: "contracts", label: t("modalContracts") },
    { id: "tickets", label: t("modalTickets") },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xl font-bold">{company.name}</span>
              <div className="flex items-center gap-2 mt-1">
                {company.website && <span className="text-sm text-primary">{company.website}</span>}
                <Badge variant="outline">{statusLabels[company.leadStatus] || company.leadStatus}</Badge>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted transition-colors -mt-1 -mr-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "activity" && !activities.length) loadActivities(); if (tab.id === "tickets" && !tickets.length) loadTickets() }}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Details */}
        {activeTab === "details" && (
          <div className="space-y-4">
            {/* Quick status change */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t("ldmFunnelStatus")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["new", "contacted", "qualified", "converted", "rejected", "cancelled"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-all ${
                      (fullData?.leadStatus || company.leadStatus) === s
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Info grid — all fields clickable to edit */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmEmail"), "email", fullData?.email || company.email)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmEmail")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.email || company.email || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmPhone"), "phone", fullData?.phone || company.phone)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmPhone")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.phone || company.phone || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmWebsite"), "website", fullData?.website || company.website)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmWebsite")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.website || company.website || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmIndustry"), "industry", fullData?.industry || company.industry)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmIndustry")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.industry || company.industry || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(`${t("ldmEstimatedValue")} (₼)`, "annualRevenue", fullData?.annualRevenue || company.annualRevenue, true)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmEstimatedValue")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{(fullData?.annualRevenue || company.annualRevenue) ? `${(fullData?.annualRevenue || company.annualRevenue).toLocaleString()} ₼` : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmUsers"), "userCount", fullData?.userCount ?? company.userCount, true)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmUsers")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.userCount ?? company.userCount ?? 0}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmCreated")}</span>
                <span className="text-xs">{(fullData?.createdAt || company.createdAt) ? new Date(fullData?.createdAt || company.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmDaysInBase")}</span>
                <span className="text-xs">{(fullData?.createdAt || company.createdAt) ? `${Math.floor((Date.now() - new Date(fullData?.createdAt || company.createdAt).getTime()) / 86400000)} ${t("ldmDays")}` : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">SLA</span>
                <span className="text-xs">
                  {(fullData as any)?.slaPolicy ? (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{(fullData as any).slaPolicy.name}</span>
                  ) : t("ldmSlaDefault")}
                </span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Score", "leadScore", fullData?.leadScore ?? company.leadScore, true)}>
                <span className="text-[10px] text-muted-foreground block">Score <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className={`text-xs font-bold ${(fullData?.leadTemperature || company.leadTemperature) === "hot" ? "text-red-500" : (fullData?.leadTemperature || company.leadTemperature) === "warm" ? "text-orange-500" : "text-blue-500"}`}>
                  {((fullData?.leadTemperature || company.leadTemperature) || "cold").toUpperCase()} {fullData?.leadScore ?? company.leadScore}
                </span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmContacts")}</span>
                <span className="text-xs">{fullData?.contacts?.length || company._count?.contacts || 0}</span>
              </div>
            </div>

            {/* FIX #2: About section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm">{t("ldmAboutCompany")}</h4>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingAbout(!editingAbout)}>
                  <Pencil className="h-3 w-3 mr-1" /> {editingAbout ? t("ldmEditCancel") : t("ldmEdit")}
                </Button>
              </div>
              {editingAbout ? (
                <div className="space-y-2">
                  <Textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={3} />
                  <Button size="sm" onClick={saveAbout}>{t("ldmSave")}</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded min-h-[40px]">
                  {company.description || aboutText || t("ldmNoDescription")}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-lg font-bold">{fullData?.contacts?.length || company._count?.contacts || 0}</p>
                <p className="text-[10px] text-muted-foreground">{t("ldmKeyPeople")}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-lg font-bold">{(fullData?.deals || company.deals)?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">{t("ldmDeals")}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-lg font-bold">{fullData?.contracts?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">{t("ldmContracts")}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className={cn("text-lg font-bold", grade.color.replace("bg-", "text-").replace(" text-white", ""))}>{grade.letter}</p>
                <p className="text-[10px] text-muted-foreground">{currentScore}/100</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Contacts */}
        {activeTab === "contacts" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{t("ldmKeyPeople")} ({fullData?.contacts?.length || company._count?.contacts || 0})</h4>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => { onOpenChange(false); router.push(`/contacts?new=1&companyId=${company.id}`) }}>
                <Plus className="h-3 w-3" /> {t("ldmAdd")}
              </Button>
            </div>
            {(fullData?.contacts || company.contacts) && (fullData?.contacts || company.contacts).length > 0 ? (
              <div className="space-y-1.5">
                {(fullData?.contacts || company.contacts).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {c.fullName?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.position || ""} {c.email ? `· ${c.email}` : ""}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 ml-2 flex-shrink-0">
                      <button onClick={() => { onOpenChange(false); router.push(`/contacts/${c.id}`) }} className="p-1 rounded hover:bg-muted" title={t("ldmEdit")}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button onClick={async () => {
                        if (!confirm(t("ldmConfirmDeleteContact", { name: c.fullName }))) return
                        await fetch(`/api/v1/contacts/${c.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
                        const res = await fetch(`/api/v1/companies/${company.id}`, { headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
                        const json = await res.json()
                        if (json.success) setFullData(json.data)
                        onSaved?.()
                      }} className="p-1 rounded hover:bg-red-50" title={t("ldmDelete")}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">{t("ldmNoContacts")}</p>}
          </div>
        )}

        {/* Tab: Deals */}
        {activeTab === "deals" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{t("ldmDeals")} ({(fullData?.deals || company.deals)?.length || 0})</h4>
              {(fullData?.deals || company.deals)?.length > 0 && (
                <p className="text-xs font-medium text-primary">
                  Pipeline: {(fullData?.deals || company.deals).reduce((sum: number, d: any) => sum + (d.valueAmount || 0), 0).toLocaleString()} ₼
                </p>
              )}
            </div>
            {(fullData?.deals || company.deals) && (fullData?.deals || company.deals).length > 0 ? (
              (fullData?.deals || company.deals).map((d: any) => (
                <div key={d.id} className="flex justify-between items-center text-xs p-2.5 bg-muted/30 rounded border border-transparent hover:border-border transition-colors cursor-pointer"
                  onClick={() => { onOpenChange(false); router.push(`/deals/${d.id}`) }}>
                  <span className="font-medium">{d.name || d.title}</span>
                  <div className="flex gap-1.5 items-center">
                    {d.valueAmount ? <span className="font-medium">{d.valueAmount.toLocaleString()} ₼</span> : null}
                    <Badge variant="outline" className="text-[10px]">{d.stage}</Badge>
                  </div>
                </div>
              ))
            ) : <p className="text-xs text-muted-foreground py-4 text-center">{t("ldmNoDeals")}</p>}
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <Button size="sm" className="gap-1" onClick={() => { setShowActivityForm(!showActivityForm); if (!activities.length) loadActivities() }}>
              <Plus className="h-3 w-3" /> {t("ldmRecord")}
            </Button>

            {showActivityForm && (
              <Card>
                <CardContent className="pt-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t("ldmActType")}</Label>
                      <Select value={activityType} onChange={e => setActivityType(e.target.value)}>
                        <option value="note">📝 {t("ldmActNote")}</option>
                        <option value="call">📞 {t("ldmActCall")}</option>
                        <option value="email">📧 {t("ldmActEmail")}</option>
                        <option value="meeting">🤝 {t("ldmActMeeting")}</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("ldmActSubject")}</Label>
                      <Input value={activitySubject} onChange={e => setActivitySubject(e.target.value)} placeholder={t("ldmActSubjectPlaceholder")} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("ldmActDescription")}</Label>
                    <Textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)} rows={2} placeholder={t("ldmActDetailsPlaceholder")} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveActivity} disabled={activitySaving || !activitySubject.trim()}>
                      {activitySaving ? t("ldmActSaving") : t("ldmSave")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowActivityForm(false)}>{t("ldmEditCancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activities list */}
            {activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                    <span>{a.type === "call" ? "📞" : a.type === "email" ? "📧" : a.type === "meeting" ? "🤝" : "📝"}</span>
                    <div className="flex-1">
                      <p className="font-medium">{a.subject}</p>
                      {a.description && <p className="text-muted-foreground">{a.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showActivityForm ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">{t("ldmNoActivities")}</p>
                <p className="text-xs mt-1">{t("ldmNoActivitiesHint")}</p>
                <Button size="sm" variant="link" className="mt-2" onClick={loadActivities}>{t("ldmRefresh")}</Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab: Contracts */}
        {activeTab === "contracts" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{t("ldmContracts")} ({fullData?.contracts?.length || 0})</h4>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => { onOpenChange(false); router.push(`/contracts?new=1&companyId=${company.id}`) }}>
                <Plus className="h-3 w-3" /> {t("ldmAdd")}
              </Button>
            </div>
            {fullData?.contracts && fullData.contracts.length > 0 ? (
              fullData.contracts.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center text-xs p-2.5 bg-muted/30 rounded border border-transparent hover:border-border transition-colors cursor-pointer"
                  onClick={() => { onOpenChange(false); router.push(`/contracts/${c.id}`) }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.title || c.contractNumber || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{c.startDate ? new Date(c.startDate).toLocaleDateString() : ""} {c.endDate ? `— ${new Date(c.endDate).toLocaleDateString()}` : ""}</p>
                  </div>
                  <div className="flex gap-1.5 items-center ml-2">
                    {c.totalValue ? <span className="font-medium">{c.totalValue.toLocaleString()} ₼</span> : null}
                    <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[10px]">{c.status || "draft"}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("ldmNoContracts")}</p>
                <p className="text-xs mt-1">{t("ldmNoContractsHint")}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Tickets */}
        {activeTab === "tickets" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{t("ldmTickets")} ({tickets.length})</h4>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => { onOpenChange(false); router.push(`/tickets?new=1&companyId=${company.id}`) }}>
                <Plus className="h-3 w-3" /> {t("ldmAdd")}
              </Button>
            </div>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length > 0 ? (
              tickets.map((tk: any) => (
                <div key={tk.id} className="flex justify-between items-center text-xs p-2.5 bg-muted/30 rounded border border-transparent hover:border-border transition-colors cursor-pointer"
                  onClick={() => { onOpenChange(false); router.push(`/tickets/${tk.id}`) }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{tk.ticketNumber}</span>
                      <p className="font-medium truncate">{tk.subject}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {tk.createdAt ? new Date(tk.createdAt).toLocaleDateString() : ""}
                      {tk.assigneeName ? ` · ${tk.assigneeName}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 items-center ml-2">
                    <Badge variant={tk.priority === "critical" ? "destructive" : tk.priority === "high" ? "default" : "outline"} className="text-[10px]">
                      {tk.priority || "medium"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{tk.status || "new"}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("ldmNoTickets")}</p>
                <p className="text-xs mt-1">{t("ldmNoTicketsHint")}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons — FIX #7: contracts filtered by company */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="gap-1 text-green-700 border-green-200 hover:bg-green-50"
            onClick={() => { onOpenChange(false); router.push(`/contracts?search=${encodeURIComponent(company.name)}`) }}>
            <FileText className="h-3 w-3" /> {t("ldmContractsBtn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
            onClick={() => { onOpenChange(false); router.push(`/companies/${company.id}`) }}>
            <Pencil className="h-3 w-3" /> {t("ldmEditBtn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
            onClick={async () => {
              if (!confirm(t("ldmConfirmDeactivate", { name: company.name }))) return
              await changeStatus("cancelled")
              onOpenChange(false)
            }}>
            <Ban className="h-3 w-3" /> {t("ldmDeactivate")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-200 hover:bg-red-50"
            onClick={async () => {
              if (!confirm(t("ldmConfirmDelete", { name: company.name }))) return
              await fetch(`/api/v1/companies/${company.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
              onOpenChange(false)
              onSaved?.()
            }}>
            <Trash2 className="h-3 w-3" /> {t("ldmDelete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
