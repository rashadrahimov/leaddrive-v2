"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Send, Trash2, Users, Search, X, Filter, UserCheck } from "lucide-react"
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
  initialData?: Partial<CampaignFormData> & { id?: string; sentAt?: string }
  orgId?: string
  onSend?: () => void
  onDelete?: () => void
}

type RecipientMode = "all" | "segment" | "source" | "manual"

const sourceOptions = [
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "cold_call", label: "Холодный звонок" },
  { value: "email", label: "Email" },
  { value: "social", label: "Соц. сети" },
  { value: "event", label: "Мероприятие" },
  { value: "other", label: "Другое" },
]

export function CampaignForm({ open, onOpenChange, onSaved, initialData, orgId, onSend, onDelete }: CampaignFormProps) {
  const isEdit = !!initialData?.id
  const isSent = initialData?.status === "sent"
  const [form, setForm] = useState<CampaignFormData>({
    name: "",
    description: "",
    type: "email",
    status: "draft",
    subject: "",
    templateId: "",
    segmentId: "",
    scheduledAt: "",
    totalRecipients: "",
    budget: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [contactSearch, setContactSearch] = useState("")
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all")
  const [recipientModeChanged, setRecipientModeChanged] = useState(false)
  const [selectedSource, setSelectedSource] = useState("")
  const [selectedSegmentId, setSelectedSegmentId] = useState("")

  // Load templates, segments and contacts when form opens
  useEffect(() => {
    if (open && orgId) {
      fetch("/api/v1/email-templates?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setTemplates(j.data?.templates || j.data || [])
      }).catch(() => {})

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
        totalRecipients: initialData?.totalRecipients || "",
        budget: initialData?.budget || "",
      })
      setError("")
      setSelectedContacts(new Set())
      setContactSearch("")
      setSelectedSource("")
      setRecipientModeChanged(false)
      // If editing a campaign with a segmentId, default to segment mode
      if (initialData?.segmentId) {
        setRecipientMode("segment")
        setSelectedSegmentId(initialData.segmentId)
      } else {
        setRecipientMode("all")
        setSelectedSegmentId("")
      }
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Введите название кампании")
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/campaigns/${initialData!.id}` : "/api/v1/campaigns"
      // Use saved totalRecipients if editing and mode wasn't changed
      const finalRecipients = (isEdit && !recipientModeChanged)
        ? (Number(form.totalRecipients) || recipientCount)
        : recipientCount
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        status: form.status,
        subject: form.subject || undefined,
        templateId: form.templateId || undefined,
        segmentId: recipientMode === "segment" ? selectedSegmentId || undefined : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        totalRecipients: finalRecipients,
        budget: form.budget ? Number(form.budget) : undefined,
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
      if (!res.ok) throw new Error(json.error || "Ошибка сохранения")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof CampaignFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // Contacts filtered by source
  const sourceFilteredContacts = useMemo(() => {
    if (recipientMode === "source" && selectedSource) {
      return contacts.filter(c => c.source === selectedSource)
    }
    return contacts
  }, [contacts, recipientMode, selectedSource])

  // Contacts for manual search
  const searchFilteredContacts = useMemo(() => {
    const base = recipientMode === "manual" ? contacts : sourceFilteredContacts
    if (!contactSearch) return base
    const q = contactSearch.toLowerCase()
    return base.filter(c => c.fullName.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
  }, [contacts, sourceFilteredContacts, contactSearch, recipientMode])

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedContacts(new Set(searchFilteredContacts.map(c => c.id)))
  const selectNone = () => setSelectedContacts(new Set())

  // Compute recipient count based on mode
  const recipientCount = useMemo(() => {
    // When editing and user hasn't changed mode, show saved value
    if (isEdit && !recipientModeChanged && Number(form.totalRecipients) > 0) {
      return Number(form.totalRecipients)
    }
    switch (recipientMode) {
      case "all": return contacts.length
      case "segment": {
        const seg = segments.find(s => s.id === selectedSegmentId)
        return seg?.contactCount || 0
      }
      case "source": return sourceFilteredContacts.length
      case "manual": return selectedContacts.size
      default: return 0
    }
  }, [recipientMode, contacts, segments, selectedSegmentId, sourceFilteredContacts, selectedContacts, isEdit, recipientModeChanged, form.totalRecipients])

  // Unique sources from contacts
  const availableSources = useMemo(() => {
    const sources = new Set(contacts.map(c => c.source).filter(Boolean))
    return sourceOptions.filter(o => sources.has(o.value))
  }, [contacts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? "Редактировать кампанию" : "Новая кампания"}</DialogTitle>
          <div className="flex items-center gap-2">
            {isEdit && (
              <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", {
                "bg-gray-50 text-gray-500 border-gray-300": form.status === "draft",
                "bg-amber-50 text-amber-600 border-amber-300": form.status === "scheduled",
                "bg-blue-50 text-blue-600 border-blue-300": form.status === "sending",
                "bg-green-50 text-green-600 border-green-300": form.status === "sent",
                "bg-red-50 text-red-500 border-red-300": form.status === "cancelled",
              })}>
                {form.status === "draft" ? "Черновик" :
                 form.status === "scheduled" ? "Запланирована" :
                 form.status === "sending" ? "Отправляется" :
                 form.status === "sent" ? "Отправлена" :
                 form.status === "cancelled" ? "Отменена" : form.status}
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            {/* Name */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Название кампании *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} required disabled={isSent} placeholder="напр. Мартовская рассылка" />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Описание</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} disabled={isSent} placeholder="Цель и контекст кампании" />
            </div>

            {/* Type + Subject */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Тип</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)} disabled={isSent}>
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs uppercase text-muted-foreground">Тема письма</Label>
                <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} disabled={isSent} placeholder="Тема email рассылки" />
              </div>
            </div>

            {/* Template + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Шаблон</Label>
                <Select value={form.templateId} onChange={(e) => update("templateId", e.target.value)} disabled={isSent}>
                  <option value="">— Не выбран —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Бюджет</Label>
                <Input type="number" step="0.01" value={form.budget} onChange={(e) => update("budget", e.target.value)} disabled={isSent} placeholder="0.00" />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Запланировать отправку</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} disabled={isSent} />
            </div>

            {/* Recipient selector */}
            {!isSent && (
              <div className="rounded-lg border bg-muted/20">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Получатели</span>
                  </div>
                  <span className={cn(
                    "text-sm font-bold px-2 py-0.5 rounded-full",
                    recipientCount > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-500"
                  )}>
                    {recipientCount} контактов
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Mode selector — intuitive tabs */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setRecipientMode("all"); setSelectedContacts(new Set()); setRecipientModeChanged(true) }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1",
                        recipientMode === "all"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <Users className="h-3 w-3" /> Все контакты
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRecipientMode("segment"); setSelectedContacts(new Set()); setRecipientModeChanged(true) }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1",
                        recipientMode === "segment"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <Filter className="h-3 w-3" /> По сегменту
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRecipientMode("source"); setSelectedContacts(new Set()); setSelectedSource(""); setRecipientModeChanged(true) }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1",
                        recipientMode === "source"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <UserCheck className="h-3 w-3" /> По источнику
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRecipientMode("manual"); setSelectedContacts(new Set()); setRecipientModeChanged(true) }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1",
                        recipientMode === "manual"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <Search className="h-3 w-3" /> Вручную
                    </button>
                  </div>

                  {/* Segment selector */}
                  {recipientMode === "segment" && (
                    <div>
                      <Select
                        value={selectedSegmentId}
                        onChange={e => setSelectedSegmentId(e.target.value)}
                      >
                        <option value="">— Выберите сегмент —</option>
                        {segments.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.contactCount} контактов)
                          </option>
                        ))}
                      </Select>
                      {selectedSegmentId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Рассылка будет отправлена контактам из выбранного сегмента
                        </p>
                      )}
                    </div>
                  )}

                  {/* Source selector */}
                  {recipientMode === "source" && (
                    <div>
                      <Select
                        value={selectedSource}
                        onChange={e => setSelectedSource(e.target.value)}
                      >
                        <option value="">— Выберите источник —</option>
                        {availableSources.length > 0 ? (
                          availableSources.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))
                        ) : (
                          sourceOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))
                        )}
                      </Select>
                      {selectedSource && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Найдено {sourceFilteredContacts.length} контактов из источника «{sourceOptions.find(o => o.value === selectedSource)?.label || selectedSource}»
                        </p>
                      )}
                    </div>
                  )}

                  {/* All contacts info */}
                  {recipientMode === "all" && (
                    <p className="text-xs text-muted-foreground">
                      Рассылка будет отправлена всем {contacts.length} контактам с email адресом
                    </p>
                  )}

                  {/* Manual contact selector */}
                  {recipientMode === "manual" && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Поиск по имени или email..."
                            value={contactSearch}
                            onChange={e => setContactSearch(e.target.value)}
                            className="pl-7 h-8 text-sm"
                          />
                        </div>
                        <Button type="button" size="sm" variant="default" className="h-8 text-xs" onClick={selectAll}>Все</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={selectNone}>Никого</Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded bg-background">
                        {searchFilteredContacts.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">Нет контактов с email</div>
                        ) : (
                          searchFilteredContacts.map(c => (
                            <label
                              key={c.id}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm border-b last:border-b-0",
                                selectedContacts.has(c.id) && "bg-primary/5"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedContacts.has(c.id)}
                                  onChange={() => toggleContact(c.id)}
                                  className="rounded"
                                />
                                <span>{c.fullName}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{c.email}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter className="flex-wrap gap-2">
          {isEdit && onDelete && !isSent && (
            <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          {!isSent && (
            <Button type="submit" disabled={saving} className="min-w-[120px]">
              {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
            </Button>
          )}
          {isEdit && !isSent && onSend && (
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onSend}>
              <Send className="h-4 w-4" /> Отправить
            </Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  )
}
