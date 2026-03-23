"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EventFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  orgId?: string
  initialData?: any
}

export function EventForm({ open, onOpenChange, onSaved, orgId, initialData }: EventFormProps) {
  const isEdit = !!initialData?.id
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "conference",
    status: "planned",
    startDate: "",
    endDate: "",
    location: "",
    isOnline: false,
    meetingUrl: "",
    budget: 0,
    expectedRevenue: 0,
    maxParticipants: 0,
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        type: initialData.type || "conference",
        status: initialData.status || "planned",
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : "",
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : "",
        location: initialData.location || "",
        isOnline: initialData.isOnline || false,
        meetingUrl: initialData.meetingUrl || "",
        budget: initialData.budget || 0,
        expectedRevenue: initialData.expectedRevenue || 0,
        maxParticipants: initialData.maxParticipants || 0,
      })
    } else {
      setForm({
        name: "", description: "", type: "conference", status: "planned",
        startDate: "", endDate: "", location: "", isOnline: false,
        meetingUrl: "", budget: 0, expectedRevenue: 0, maxParticipants: 0,
      })
    }
    setError("")
  }, [initialData, open])

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required")
    if (!form.startDate) return setError("Start date is required")
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/events/${initialData.id}` : "/api/v1/events"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget) || 0,
          expectedRevenue: Number(form.expectedRevenue) || 0,
          maxParticipants: Number(form.maxParticipants) || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select className="w-full h-9 border rounded-md px-3 text-sm" value={form.type} onChange={e => set("type", e.target.value)}>
                {["conference","webinar","workshop","meetup","exhibition","other"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full h-9 border rounded-md px-3 text-sm" value={form.status} onChange={e => set("status", e.target.value)}>
                {["planned","registration_open","in_progress","completed","cancelled"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="datetime-local" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="datetime-local" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="City, venue..." />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isOnline} onChange={e => set("isOnline", e.target.checked)} className="rounded" />
              Online event
            </label>
            {form.isOnline && (
              <Input className="flex-1" placeholder="Meeting URL" value={form.meetingUrl} onChange={e => set("meetingUrl", e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Budget (₼)</Label>
              <Input type="number" value={form.budget} onChange={e => set("budget", e.target.value)} />
            </div>
            <div>
              <Label>Expected Revenue</Label>
              <Input type="number" value={form.expectedRevenue} onChange={e => set("expectedRevenue", e.target.value)} />
            </div>
            <div>
              <Label>Max Participants</Label>
              <Input type="number" value={form.maxParticipants} onChange={e => set("maxParticipants", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
