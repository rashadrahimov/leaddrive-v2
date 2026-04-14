"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface TicketFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

interface OptionItem {
  id: string
  label: string
}

export function TicketForm({ open, onOpenChange, onSaved, initialData, orgId }: TicketFormProps) {
  const t = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    subject: initialData?.subject || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
    category: initialData?.category || "general",
    status: initialData?.status || "new",
    contactId: initialData?.contactId || "",
    companyId: initialData?.companyId || "",
    assignedTo: initialData?.assignedTo || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [companies, setCompanies] = useState<OptionItem[]>([])
  const [contacts, setContacts] = useState<OptionItem[]>([])
  const [users, setUsers] = useState<OptionItem[]>([])
  const [aiCategorizing, setAiCategorizing] = useState(false)
  const aiCategorizedRef = useRef(false)

  // AI auto-categorization: fires once when subject has 5+ chars (on blur)
  const tryAiCategorize = useCallback(async () => {
    if (isEdit || aiCategorizedRef.current) return
    const subjectVal = form.subject.trim()
    if (subjectVal.length < 5) return

    aiCategorizedRef.current = true
    setAiCategorizing(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (orgId) headers["x-organization-id"] = orgId
      const res = await fetch("/api/v1/tickets/ai-categorize", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject: subjectVal, description: form.description.trim() }),
      })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.category) setForm(f => ({ ...f, category: data.category }))
        if (data?.priority) setForm(f => ({ ...f, priority: data.priority }))
      }
    } catch {
      // Non-critical — user can always set manually
    } finally {
      setAiCategorizing(false)
    }
  }, [form.subject, form.description, isEdit, orgId])

  useEffect(() => {
    if (open) {
      setForm({
        subject: initialData?.subject || "",
        description: initialData?.description || "",
        priority: initialData?.priority || "medium",
        category: initialData?.category || "general",
        status: initialData?.status || "new",
        contactId: initialData?.contactId || "",
        companyId: initialData?.companyId || "",
        assignedTo: initialData?.assignedTo || "",
      })
      setError("")
      aiCategorizedRef.current = false
      loadOptions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  const loadOptions = async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (orgId) headers["x-organization-id"] = orgId

    try {
      const [companiesRes, contactsRes, usersRes] = await Promise.all([
        fetch("/api/v1/companies?limit=200", { headers }).then(r => r.json()).catch(() => ({ data: { companies: [] } })),
        fetch("/api/v1/contacts?limit=200", { headers }).then(r => r.json()).catch(() => ({ data: { contacts: [] } })),
        fetch("/api/v1/users", { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      ])

      setCompanies(
        (companiesRes.data?.companies || companiesRes.data || []).map((c: any) => ({ id: c.id, label: c.name }))
      )
      setContacts(
        (contactsRes.data?.contacts || contactsRes.data || []).map((c: any) => ({ id: c.id, label: c.fullName || c.email }))
      )
      setUsers(
        (usersRes.data || []).map((u: any) => ({ id: u.id, label: u.name || u.fullName || u.email }))
      )
    } catch {
      // Ignore — dropdowns will just be empty
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/tickets/${initialData!.id}` : "/api/v1/tickets"
      const payload: Record<string, any> = {
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        category: form.category,
      }
      if (isEdit) payload.status = form.status
      if (form.contactId) payload.contactId = form.contactId
      if (form.companyId) payload.companyId = form.companyId
      if (form.assignedTo) payload.assignedTo = form.assignedTo

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? t("editTicket") : t("newTicket")}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label>{tc("subject")} *</Label><Input value={form.subject} onChange={e => u("subject", e.target.value)} onBlur={tryAiCategorize} required />{aiCategorizing && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">AI classifying...</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{tc("priority")}</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></div>
              <div><Label>{tc("category")}</Label><Select value={form.category} onChange={e => u("category", e.target.value)}><option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="feature_request">Feature Request</option></Select></div>
            </div>
            {isEdit && (
              <div><Label>{tc("status")}</Label><Select value={form.status} onChange={e => u("status", e.target.value)}><option value="new">New</option><option value="in_progress">In Progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{tc("company")}</Label>
                <Select value={form.companyId} onChange={e => u("companyId", e.target.value)}>
                  <option value="">— None —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div>
                <Label>Contact</Label>
                <Select value={form.contactId} onChange={e => u("contactId", e.target.value)}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>{tc("assigned")}</Label>
              <Select value={form.assignedTo} onChange={e => u("assignedTo", e.target.value)}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </Select>
            </div>
            <div><Label>{tc("description")}</Label><Textarea value={form.description} onChange={e => u("description", e.target.value)} rows={4} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? tc("saving") : isEdit ? tc("update") : tc("create")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
