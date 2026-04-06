"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

export function TaskForm({ open, onOpenChange, onSaved, initialData, orgId }: TaskFormProps) {
  const t = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
    status: initialData?.status || "pending",
    dueDate: initialData?.dueDate?.slice?.(0, 10) || initialData?.dueDate || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        title: initialData?.title || "",
        description: initialData?.description || "",
        priority: initialData?.priority || "medium",
        status: initialData?.status || "pending",
        dueDate: initialData?.dueDate?.slice?.(0, 10) || initialData?.dueDate || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/tasks/${initialData!.id}` : "/api/v1/tasks"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? t("editTask") : t("newTask")}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label>{tc("title")} *</Label><Input value={form.title} onChange={e => u("title", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{tc("priority")}</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
              <div><Label>{tc("dueDate")}</Label><Input type="date" value={form.dueDate} onChange={e => u("dueDate", e.target.value)} /></div>
            </div>
            {isEdit && (
              <div><Label>{tc("status")}</Label><Select value={form.status} onChange={e => u("status", e.target.value)}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></div>
            )}
            <div><Label>{tc("description")}</Label><Textarea value={form.description} onChange={e => u("description", e.target.value)} rows={3} /></div>
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
