"use client"

import { useState } from "react"
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
  orgId?: string
}

export function TaskForm({ open, onOpenChange, onSaved, orgId }: TaskFormProps) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium", status: "pending", dueDate: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
      setForm({ title: "", description: "", priority: "medium", status: "pending", dueDate: "" })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => u("title", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
              <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => u("dueDate", e.target.value)} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => u("description", e.target.value)} rows={3} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Task"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
