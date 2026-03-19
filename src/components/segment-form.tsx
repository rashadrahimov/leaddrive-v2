"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface SegmentFormData {
  name: string
  isDynamic: boolean
  conditions: string
}

interface SegmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<SegmentFormData> & { id?: string }
  orgId?: string
}

export function SegmentForm({ open, onOpenChange, onSaved, initialData, orgId }: SegmentFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<SegmentFormData>({
    name: initialData?.name || "",
    isDynamic: initialData?.isDynamic !== undefined ? initialData.isDynamic : true,
    conditions: initialData?.conditions || "[]",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        isDynamic: initialData?.isDynamic !== undefined ? initialData.isDynamic : true,
        conditions: initialData?.conditions || "[]",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      let parsedConditions: any
      try {
        parsedConditions = JSON.parse(form.conditions || "[]")
      } catch {
        setError("Invalid JSON in conditions field")
        setSaving(false)
        return
      }

      const url = isEdit ? `/api/v1/segments/${initialData!.id}` : "/api/v1/segments"
      const payload = {
        name: form.name,
        isDynamic: form.isDynamic,
        conditions: parsedConditions,
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
      if (!res.ok) throw new Error(json.error || "Failed to save")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof SegmentFormData, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Segment" : "Add Segment"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Segment Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isDynamic"
                type="checkbox"
                checked={form.isDynamic}
                onChange={(e) => update("isDynamic", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDynamic">Dynamic Segment</Label>
            </div>
            <div>
              <Label htmlFor="conditions">Conditions (JSON)</Label>
              <Textarea
                id="conditions"
                value={form.conditions}
                onChange={(e) => update("conditions", e.target.value)}
                rows={5}
                placeholder='[{"field": "status", "operator": "eq", "value": "active"}]'
              />
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
