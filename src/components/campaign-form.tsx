"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Send, Trash2, Users, Search, X, Mail, MessageSquare, Calendar, FileText, DollarSign, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignFormData {
  name: string
  description: string
  type: string
  status: string
  subject: string
  templateId: string
  segmentId: string
  scheduledAt: string
  totalRecipients: string
  budget: string
}

interface Contact {
  id: string
  fullName: string
  email: string | null
  source?: string | null
}

interface Template {
  id: string
  name: string
}

interface Segment {
  id: string
  name: string
  contactCount: number
}

interface CampaignFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CampaignFormData> & { id?: string; sentAt?: string; totalSent?: number; totalOpened?: number; totalClicked?: number; recipientMode?: string; recipientIds?: string[]; recipientSource?: string; isAbTest?: boolean; abTestType?: string; testPercentage?: number; testDurationHours?: number; winnerCriteria?: string }
  orgId?: string
  onSend?: () => void
  onDelete?: () => void
  onCreatedAndSend?: (campaignId: string) => void
}

type RecipientMode = "all" | "contacts" | "leads" | "segment" | "source" | "manual"

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-amber-50 text-amber-600 border-amber-200",
  sending: "bg-blue-50 text-blue-600 border-blue-200",
  sent: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
}

export function CampaignForm({ open, onOpenChange, onSaved, initialData, orgId, onSend, onDelete, onCreatedAndSend }: CampaignFormProps) {
  const t = useTranslations("campaigns")
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const ts = useTranslations("segments")
  const tab = useTranslations("abTest")

  const sourceOptions = [
    { value: "website", label: ts("sourceWebsite") },
    { value: "referral", label: ts("sourceReferral") },
    { value: "cold_call", label: ts("sourceColdCall") },
    { value: "email", label: ts("sourceEmail") },
    { value: "social", label: ts("sourceSocial") },
    { value: "event", label: ts("sourceEvent") },
    { value: "other", label: ts("sourceOther") },
  ]

  const statusLabels: Record<string, string> = {
    draft: t("statusDraft"),
    scheduled: t("statusScheduled"),
    sending: t("statusSending"),
    sent: t("statusSent"),
    cancelled: t("statusCancelled"),
  }

  const isEdit = !!initialData?.id
  const [editingSent, setEditingSent] = useState(false)
  const isSent = initialData?.status === "sent" && !editingSent
  const [form, setForm] = useState<CampaignFormData>({
    name: "", description: "", type: "email", status: "draft",
    subject: "", templateId: "", segmentId: "", scheduledAt: "",
    totalRecipients: "", budget: "",
  })
  const [saving, setSaving] = useState(false)
  const [sendAfterSave, setSendAfterSave] = useState(false)
  const [error, setError] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [contactSearch, setContactSearch] = useState("")
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all")
  const [recipientModeChanged, setRecipientModeChanged] = useState(false)
  const [selectedSource, setSelectedSource] = useState("")
  const [selectedSegmentId, setSelectedSegmentId] = useState("")
  const [leadsCount, setLeadsCount] = useState(0)
  // A/B test state
  const [isAbTest, setIsAbTest] = useState(false)
  const [abTestType, setAbTestType] = useState("subject")
  const [testPercentage, setTestPercentage] = useState(20)
  const [testDurationHours, setTestDurationHours] = useState(4)
  const [winnerCriteria, setWinnerCriteria] = useState("open_rate")
  const [variants, setVariants] = useState<Array<{ name: string; subject: string; templateId: string; percentage: number }>>([
    { name: "Variant A", subject: "", templateId: "", percentage: 50 },  // default names, overridden by translations at render
    { name: "Variant B", subject: "", templateId: "", percentage: 50 },  // default names, overridden by translations at render
  ])

  // Load templates, segments and contacts
  useEffect(() => {
    if (open && orgId) {
      setTemplatesLoaded(false)
      fetch("/api/v1/email-templates?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setTemplates(j.data?.templates || j.data || [])
      }).catch(() => {}).finally(() => setTemplatesLoaded(true))

      fetch("/api/v1/segments?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setSegments(j.data?.segments || j.data || [])
      }).catch(() => {})

      fetch("/api/v1/contacts?limit=1000", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setContacts((j.data?.contacts || j.data || []).filter((c: Contact) => c.email))
      }).catch(() => {})

      fetch("/api/v1/leads?limit=1&page=1", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setLeadsCount(j.data?.total || 0)
      }).catch(() => {})
    }
  }, [open, orgId])

  useEffect(() => {
    if (open) {
      const sa = initialData?.scheduledAt ? new Date(initialData.scheduledAt).toISOString().slice(0, 16) : ""
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        type: initialData?.type || "email",
        status: initialData?.status || "draft",
        subject: initialData?.subject || "",
        templateId: initialData?.templateId || "",
        segmentId: initialData?.segmentId || "",
        scheduledAt: sa,
        totalRecipients: String(initialData?.totalRecipients ?? ""),
        budget: String(initialData?.budget ?? ""),
      })
      setError("")
      setContactSearch("")
      setRecipientModeChanged(false)
      setEditingSent(false)
      // Restore recipient mode from saved campaign
      const savedMode = (initialData?.recipientMode as RecipientMode) || (initialData?.segmentId ? "segment" : "all")
      setRecipientMode(savedMode)
      setSelectedSegmentId(initialData?.segmentId || "")
      setSelectedSource(initialData?.recipientSource || "")
      setSelectedContacts(
        savedMode === "manual" && Array.isArray(initialData?.recipientIds)
          ? new Set(initialData!.recipientIds as string[])
          : new Set()
      )
      // Restore A/B test state
      setIsAbTest(!!initialData?.isAbTest)
      setAbTestType(initialData?.abTestType || "subject")
      setTestPercentage(initialData?.testPercentage ?? 20)
      setTestDurationHours(initialData?.testDurationHours ?? 4)
      setWinnerCriteria(initialData?.winnerCriteria || "open_rate")
      // Load existing variants for editing
      if (initialData?.id && initialData?.isAbTest && orgId) {
        fetch(`/api/v1/campaigns/${initialData.id}/variants`, {
          headers: { "x-organization-id": String(orgId) },
        }).then(r => r.json()).then(j => {
          if (j.success && j.data?.length > 0) {
            setVariants(j.data.map((v: any) => ({
              id: v.id,
              name: v.name,
              subject: v.subject || "",
              templateId: v.templateId || "",
              percentage: v.percentage || 50,
            })))
          } else {
            setVariants([
              { name: `${tab("variant")} A`, subject: "", templateId: "", percentage: 50 },
              { name: `${tab("variant")} B`, subject: "", templateId: "", percentage: 50 },
            ])
          }
        }).catch(() => {})
      } else {
        setVariants([
          { name: `${tab("variant")} A`, subject: "", templateId: "", percentage: 50 },
          { name: `${tab("variant")} B`, subject: "", templateId: "", percentage: 50 },
        ])
      }
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError(tc("required")); return }
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/campaigns/${initialData!.id}` : "/api/v1/campaigns"
      const finalRecipients = (isEdit && !recipientModeChanged)
        ? (Number(form.totalRecipients) || recipientCount)
        : recipientCount
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        status: editingSent ? "draft" : form.status,
        subject: form.subject || undefined,
        templateId: form.templateId || undefined,
        segmentId: recipientMode === "segment" ? selectedSegmentId || undefined : undefined,
        recipientMode,
        recipientIds: recipientMode === "manual" ? Array.from(selectedContacts) : [],
        recipientSource: recipientMode === "source" ? selectedSource || undefined : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        totalRecipients: finalRecipients,
        budget: form.budget ? Number(form.budget) : undefined,
        isAbTest,
        abTestType: isAbTest ? abTestType : undefined,
        testPercentage: isAbTest ? testPercentage : undefined,
        testDurationHours: isAbTest ? testDurationHours : undefined,
        winnerCriteria: isAbTest ? winnerCriteria : undefined,
      }
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc("failedToSave"))

      // Save A/B test variants if enabled
      const campaignId = json.data?.id || initialData?.id
      if (isAbTest && campaignId && variants.length >= 2) {
        for (const v of variants as any[]) {
          if (v.id) {
            // Update existing variant
            await fetch(`/api/v1/campaigns/${campaignId}/variants/${v.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
              body: JSON.stringify({ name: v.name, subject: v.subject || undefined, templateId: v.templateId || undefined, percentage: v.percentage }),
            }).catch(() => {})
          } else {
            // Create new variant
            await fetch(`/api/v1/campaigns/${campaignId}/variants`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
              body: JSON.stringify({ name: v.name, subject: v.subject || undefined, templateId: v.templateId || undefined, percentage: v.percentage }),
            }).catch(() => {})
          }
        }
      }

      onSaved()
      if (sendAfterSave && !isEdit && json.data?.id && onCreatedAndSend) {
        onCreatedAndSend(json.data.id)
        setSendAfterSave(false)
      }
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof CampaignFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const sourceFilteredContacts = useMemo(() => {
    if (recipientMode === "source" && selectedSource) return contacts.filter(c => c.source === selectedSource)
    return contacts
  }, [contacts, recipientMode, selectedSource])

  const searchFilteredContacts = useMemo(() => {
    const base = recipientMode === "manual" ? contacts : sourceFilteredContacts
    if (!contactSearch) return base
    const q = contactSearch.toLowerCase()
    return base.filter(c => c.fullName.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
  }, [contacts, sourceFilteredContacts, contactSearch, recipientMode])

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = () => setSelectedContacts(new Set(searchFilteredContacts.map(c => c.id)))
  const selectNone = () => setSelectedContacts(new Set())

  const recipientCount = useMemo(() => {
    if (isEdit && !recipientModeChanged && Number(form.totalRecipients) > 0) return Number(form.totalRecipients)
    switch (recipientMode) {
      case "all": return contacts.length + leadsCount
      case "contacts": return contacts.length
      case "leads": return leadsCount
      case "segment": return segments.find(s => s.id === selectedSegmentId)?.contactCount || 0
      case "source": return sourceFilteredContacts.length
      case "manual": return selectedContacts.size
      default: return 0
    }
  }, [recipientMode, contacts, leadsCount, segments, selectedSegmentId, sourceFilteredContacts, selectedContacts, isEdit, recipientModeChanged, form.totalRecipients])

  const availableSources = useMemo(() => {
    const sources = new Set(contacts.map(c => c.source).filter(Boolean))
    return sourceOptions.filter(o => sources.has(o.value))
  }, [contacts])

  // Template name for sent view
  const templateName = useMemo(() => {
    if (!form.templateId) return null
    return templates.find(t => t.id === form.templateId)?.name || null
  }, [form.templateId, templates])

  // ── Sent campaign: read-only summary ──
  if (isSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{form.name || t("title")}</DialogTitle>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", statusColors[form.status])}>
                {statusLabels[form.status] || form.status}
              </span>
              <button type="button" onClick={() => onOpenChange(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>
        <DialogContent>
          {form.description && (
            <p className="text-sm text-muted-foreground mb-4">{form.description}</p>
          )}
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums tracking-tight text-green-600">{initialData?.totalSent ?? Number(form.totalRecipients)}</div>
              <div className="text-xs text-muted-foreground">{t("sent")}</div>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums tracking-tight text-primary">{initialData?.totalOpened ?? 0}</div>
              <div className="text-xs text-muted-foreground">{tc("open")}</div>
            </div>
            <div className="bg-[hsl(var(--ai-from))]/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--ai-from))]">{initialData?.totalClicked ?? 0}</div>
              <div className="text-xs text-muted-foreground">{tc("total")}</div>
            </div>
          </div>
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 py-1.5 border-b">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">{tc("type")}</span>
              <span className="font-medium">{form.type === "sms" ? "SMS" : "Email"}</span>
            </div>
            {form.subject && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">{tf("emailSubject")}</span>
                <span className="font-medium">{form.subject}</span>
              </div>
            )}
            {templateName && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">{tf("selectTemplate")}</span>
                <span className="font-medium">{templateName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 py-1.5 border-b">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">{t("recipients")}</span>
              <span className="font-medium">{Number(form.totalRecipients) || 0}</span>
            </div>
            {Number(form.budget) > 0 && (
              <div className="flex items-center gap-2 py-1.5 border-b">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">{t("budget")}</span>
                <span className="font-medium">{Number(form.budget).toLocaleString()}</span>
              </div>
            )}
            {initialData?.sentAt && (
              <div className="flex items-center gap-2 py-1.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">{t("sent")}</span>
                <span className="font-medium">{new Date(initialData.sentAt).toLocaleString("ru-RU")}</span>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center gap-2 w-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("close")}</Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => {
              setEditingSent(true)
              setForm(f => ({ ...f, status: "draft" }))
            }}>
              {tc("edit")}
            </Button>
            {onSend && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onSend}>
                <Send className="h-3.5 w-3.5" /> {t("sendCampaign")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </Dialog>
    )
  }

  // ── Draft/Scheduled: editable form ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? tf("editCampaign") : tf("newCampaign")}</DialogTitle>
          <div className="flex items-center gap-2">
            {isEdit && (
              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", statusColors[form.status])}>
                {statusLabels[form.status] || form.status}
              </span>
            )}
            <button type="button" onClick={() => onOpenChange(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="space-y-4">
            {/* Name — full width */}
            <div>
              <Label className="text-xs text-muted-foreground">{tc("name")} *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="məs. Mart göndərişi" />
              <p className="text-xs text-muted-foreground mt-1">Kampaniyanın adı, məs. «Mart göndərişi»</p>
            </div>

            {/* Description — textarea */}
            <div>
              <Label className="text-xs text-muted-foreground">{tc("description")}</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)}
                placeholder="Kampaniya haqqında qısa məlumat"
                rows={3} />
              <p className="text-xs text-muted-foreground mt-1">Kampaniya haqqında qısa məlumat</p>
            </div>

            {/* Type + Template on same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{tc("type")}</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Email və ya SMS göndəriş növü</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email {tf("selectTemplate").toLowerCase()}</Label>
                <Select
                  value={form.templateId}
                  onChange={(e) => update("templateId", e.target.value)}
                >
                  <option value="">{templatesLoaded ? tf("noTemplate") : tc("loading")}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Hazır e-poçt şablonu</p>
              </div>
            </div>

            {/* Subject + Schedule on same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{tf("emailSubject")}</Label>
                <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="E-poçt mövzusu" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tf("scheduleSend")}</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} />
              </div>
            </div>

            {/* Budget */}
            <div>
              <Label className="text-xs text-muted-foreground">{t("budget")}</Label>
              <Input type="number" step="0.01" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="0" />
            </div>

            {/* A/B Test Section */}
            <div className="border rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAbTest} onChange={e => setIsAbTest(e.target.checked)} className="rounded" />
                <span className="text-sm font-medium">{tab("enableAbTest")}</span>
              </label>
              {isAbTest && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{tab("testType")}</Label>
                      <Select value={abTestType} onChange={e => setAbTestType(e.target.value)}>
                        <option value="subject">{tab("subjectLine")}</option>
                        <option value="content">{tab("content")}</option>
                        <option value="send_time">{tab("sendTime")}</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{tab("winnerCriteria")}</Label>
                      <Select value={winnerCriteria} onChange={e => setWinnerCriteria(e.target.value)}>
                        <option value="open_rate">{tab("openRate")}</option>
                        <option value="click_rate">{tab("clickRate")}</option>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{tab("testAudience")}: {testPercentage}%</Label>
                      <input type="range" min={10} max={50} value={testPercentage} onChange={e => setTestPercentage(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{tab("testDuration")}</Label>
                      <Select value={String(testDurationHours)} onChange={e => setTestDurationHours(Number(e.target.value))}>
                        <option value="1">1 {tab("hours")}</option>
                        <option value="2">2 {tab("hours")}</option>
                        <option value="4">4 {tab("hours")}</option>
                        <option value="8">8 {tab("hours")}</option>
                        <option value="24">24 {tab("hours")}</option>
                      </Select>
                    </div>
                  </div>
                  {/* Variants */}
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="border rounded p-2 bg-muted/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold">{v.name}</span>
                          <span className="text-xs text-muted-foreground">{v.percentage}%</span>
                        </div>
                        <Input
                          placeholder={`${tab("subjectLine")}...`}
                          value={v.subject}
                          onChange={e => {
                            const next = [...variants]
                            next[i] = { ...next[i], subject: e.target.value }
                            setVariants(next)
                          }}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                    {variants.length < 4 && (
                      <button
                        type="button"
                        onClick={() => setVariants([...variants, { name: `${tab("variant")} ${String.fromCharCode(65 + variants.length)}`, subject: "", templateId: "", percentage: Math.floor(100 / (variants.length + 1)) }])}
                        className="text-xs text-primary hover:underline"
                      >
                        {tab("addVariant")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Recipients — simple dropdown like v1 ── */}
            <div>
              <Label className="text-xs text-muted-foreground">{t("recipients")}</Label>
              <Select value={recipientMode} onChange={e => {
                const mode = e.target.value as RecipientMode
                setRecipientMode(mode)
                setSelectedContacts(new Set())
                if (mode === "source") setSelectedSource("")
                setRecipientModeChanged(true)
              }}>
                <option value="all">Bütün kontaktlar + lidlər</option>
                <option value="contacts">Yalnız kontaktlar</option>
                <option value="leads">Yalnız lidlər</option>
                <option value="segment">📊 Seqmentə görə</option>
                <option value="source">🔍 Mənbəyə görə</option>
                <option value="manual">✋ Əl ilə seçmək</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Göndəriləcək: <span className="font-semibold text-foreground">{recipientCount}</span> alıcıya
              </p>

              {/* Segment picker */}
              {recipientMode === "segment" && (
                <div className="mt-2">
                  <Select value={selectedSegmentId} onChange={e => setSelectedSegmentId(e.target.value)}>
                    <option value="">— {tf("selectSegment")} —</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contactCount})</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Source picker */}
              {recipientMode === "source" && (
                <div className="mt-2">
                  <Select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
                    <option value="">— {tf("selectSource")} —</option>
                    {(availableSources.length > 0 ? availableSources : sourceOptions).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Manual selector */}
              {recipientMode === "manual" && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder={tc("search")} value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                    </div>
                    <Button type="button" size="sm" variant="default" className="h-8 text-xs px-2" onClick={selectAll}>{tc("selectAll")}</Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs px-2" onClick={selectNone}>{tc("clearAll")}</Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded bg-background">
                    {searchFilteredContacts.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">{tc("noData")}</div>
                    ) : searchFilteredContacts.map(c => (
                      <label key={c.id} className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-muted/50 text-sm border-b last:border-b-0",
                        selectedContacts.has(c.id) && "bg-primary/5"
                      )}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedContacts.has(c.id)}
                            onChange={() => toggleContact(c.id)} className="rounded" />
                          <span className="truncate">{c.fullName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-2 truncate">{c.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center w-full gap-2">
            {isEdit && onDelete && (
              <Button type="button" variant="ghost" size="sm" onClick={onDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 mr-auto">
                <Trash2 className="h-3.5 w-3.5" /> {tc("delete")}
              </Button>
            )}
            {!isEdit && !onDelete && <div className="mr-auto" />}
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
            <Button type="submit" disabled={saving} size="sm" className="min-w-[100px]">
              {saving ? "..." : isEdit ? tc("save") : tc("create")}
            </Button>
            {isEdit && onSend && (
              <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onSend}>
                <Send className="h-3.5 w-3.5" /> {t("sendCampaign")}
              </Button>
            )}
            {!isEdit && onCreatedAndSend && (
              <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={() => setSendAfterSave(true)}>
                <Send className="h-3.5 w-3.5" /> {t("sendCampaign")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
