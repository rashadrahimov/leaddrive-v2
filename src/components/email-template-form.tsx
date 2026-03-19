"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface EmailTemplateFormData {
  name: string
  subject: string
  htmlBody: string
  textBody: string
  category: string
  variables: string
  language: string
}

interface EmailTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<EmailTemplateFormData> & { id?: string }
  orgId?: string
}

export function EmailTemplateForm({ open, onOpenChange, onSaved, initialData, orgId }: EmailTemplateFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<EmailTemplateFormData>({
    name: initialData?.name || "",
    subject: initialData?.subject || "",
    htmlBody: initialData?.htmlBody || "",
    textBody: initialData?.textBody || "",
    category: initialData?.category || "general",
    variables: initialData?.variables || "",
    language: initialData?.language || "en",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        subject: initialData?.subject || "",
        htmlBody: initialData?.htmlBody || "",
        textBody: initialData?.textBody || "",
        category: initialData?.category || "general",
        variables: initialData?.variables || "",
        language: initialData?.language || "en",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/email-templates/${initialData!.id}` : "/api/v1/email-templates"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof EmailTemplateFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Template" : "New Email Template"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="general">General</option>
                  <option value="welcome">Welcome</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="notification">Notification</option>
                  <option value="marketing">Marketing</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="proposal">Proposal</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={form.language} onChange={(e) => update("language", e.target.value)}>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="az">Azerbaijani</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="htmlBody">HTML Body *</Label>
              <Textarea id="htmlBody" value={form.htmlBody} onChange={(e) => update("htmlBody", e.target.value)} rows={10} required placeholder="<h1>Hello {{client_name}}</h1>..." />
            </div>
            <div>
              <Label htmlFor="variables">Variables (comma-separated)</Label>
              <Input id="variables" value={form.variables} onChange={(e) => update("variables", e.target.value)} placeholder="client_name, manager_name, ticket_id" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
