"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Send, Trash2, Users, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignFormData {
  name: string
  description: string
  type: string
  status: string
  subject: string
  templateId: string
  scheduledAt: string
  totalRecipients: string
  budget: string
}

interface Contact {
  id: string
  fullName: string
  email: string | null
}

interface Template {
  id: string
  name: string
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
    scheduledAt: "",
    totalRecipients: "",
    budget: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [contactSearch, setContactSearch] = useState("")
  const [recipientMode, setRecipientMode] = useState<"manual" | "all">("manual")

  // Load templates and contacts when form opens
  useEffect(() => {
    if (open && orgId) {
      fetch("/api/v1/email-templates?limit=500", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setTemplates(j.data?.templates || j.data || [])
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
        scheduledAt: sa,
        totalRecipients: initialData?.totalRecipients || "",
        budget: initialData?.budget || "",
      })
      setError("")
      setSelectedContacts(new Set())
      setContactSearch("")
      setRecipientMode("manual")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/campaigns/${initialData!.id}` : "/api/v1/campaigns"
      const recipients = recipientMode === "all" ? contacts.length : selectedContacts.size
      const payload = {
        ...form,
        totalRecipients: recipients || (form.totalRecipients ? Number(form.totalRecipients) : undefined),
        budget: form.budget ? Number(form.budget) : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        templateId: form.templateId || undefined,
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

  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts
    const q = contactSearch.toLowerCase()
    return contacts.filter(c => c.fullName.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
  }, [contacts, contactSearch])

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedContacts(new Set(filteredContacts.map(c => c.id)))
  const selectNone = () => setSelectedContacts(new Set())

  const recipientCount = recipientMode === "all" ? contacts.length : selectedContacts.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Редактировать кампанию" : "Новая кампания"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Название кампании *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required disabled={isSent} />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} disabled={isSent} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="budget">Бюджет (инвестиции)</Label>
                <Input id="budget" type="number" step="0.01" value={form.budget} onChange={(e) => update("budget", e.target.value)} disabled={isSent} />
              </div>
              <div>
                <Label htmlFor="templateId">Шаблон</Label>
                <Select value={form.templateId} onChange={(e) => update("templateId", e.target.value)} disabled={isSent}>
                  <option value="">— Не выбран —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Status info for sent campaigns */}
            {isEdit && (
              <div className="flex items-center gap-3 text-sm">
                <span className={cn("font-medium", {
                  "text-gray-500": form.status === "draft",
                  "text-amber-500": form.status === "scheduled",
                  "text-blue-500": form.status === "sending",
                  "text-green-600": form.status === "sent",
                  "text-red-500": form.status === "cancelled",
                })}>
                  {form.status === "draft" ? "Черновик" :
                   form.status === "scheduled" ? "Запланирована" :
                   form.status === "sending" ? "Отправляется" :
                   form.status === "sent" ? "Отправлена" :
                   form.status === "cancelled" ? "Отменена" : form.status}
                </span>
                <span className="text-muted-foreground">
                  {form.type === "sms" ? "📱 SMS" : "📧 Email"}
                </span>
                {initialData?.totalRecipients ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {initialData.totalRecipients}
                  </span>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Тип</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)} disabled={isSent}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Тема письма</Label>
                <Input id="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} disabled={isSent} />
              </div>
            </div>

            <div>
              <Label htmlFor="scheduledAt">Запланировать отправку</Label>
              <Input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} disabled={isSent} />
            </div>

            {/* Recipient selector */}
            {!isSent && (
              <div className="border rounded-lg p-3">
                <Label className="mb-2 block">Получатели</Label>
                <Select value={recipientMode} onChange={e => setRecipientMode(e.target.value as "manual" | "all")} className="mb-2">
                  <option value="manual">Выбрать вручную</option>
                  <option value="all">Все контакты</option>
                </Select>
                <div className="text-xs text-muted-foreground mb-2">
                  Будет отправлено: <strong>{recipientCount}</strong> получателям
                </div>

                {recipientMode === "manual" && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Поиск..."
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                      <Button type="button" size="sm" variant="default" className="h-8 text-xs" onClick={selectAll}>Все</Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={selectNone}>Никого</Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded space-y-0">
                      {filteredContacts.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">Нет контактов с email</div>
                      ) : (
                        filteredContacts.map(c => (
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
            )}
          </div>
        </DialogContent>
        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          {isEdit && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Удалить
            </Button>
          )}
          {!isSent && (
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
            </Button>
          )}
          {isEdit && !isSent && onSend && (
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSend}>
              <Send className="h-4 w-4 mr-1" /> Отправить кампанию
            </Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  )
}
