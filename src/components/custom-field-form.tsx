"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface CustomFieldFormData {
  fieldName: string
  fieldLabel: string
  entityType: string
  fieldType: string
  options: string
  isRequired: boolean
  defaultValue: string
}

interface CustomFieldFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CustomFieldFormData> & { id?: string; options?: any }
  orgId?: string
}

export function CustomFieldForm({ open, onOpenChange, onSaved, initialData, orgId }: CustomFieldFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<CustomFieldFormData>({
    fieldName: "",
    fieldLabel: "",
    entityType: "contact",
    fieldType: "text",
    options: "",
    isRequired: false,
    defaultValue: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      const opts = initialData?.options
      const optionsStr = Array.isArray(opts) ? opts.join(", ") : (typeof opts === "string" ? opts : "")
      setForm({
        fieldName: initialData?.fieldName || "",
        fieldLabel: initialData?.fieldLabel || "",
        entityType: initialData?.entityType || "contact",
        fieldType: initialData?.fieldType || "text",
        options: optionsStr,
        isRequired: initialData?.isRequired ?? false,
        defaultValue: initialData?.defaultValue || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    const optionsArray = form.options
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : []

    try {
      const url = isEdit ? `/api/v1/custom-fields/${initialData!.id}` : "/api/v1/custom-fields"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          fieldName: form.fieldName,
          fieldLabel: form.fieldLabel,
          entityType: form.entityType,
          fieldType: form.fieldType,
          options: optionsArray,
          isRequired: form.isRequired,
          defaultValue: form.defaultValue || undefined,
        }),
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

  const update = (key: keyof CustomFieldFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Custom Field" : "New Custom Field"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fieldName">Field Name *</Label>
                <Input id="fieldName" value={form.fieldName} onChange={(e) => update("fieldName", e.target.value)} placeholder="custom_source" required />
              </div>
              <div>
                <Label htmlFor="fieldLabel">Display Label *</Label>
                <Input id="fieldLabel" value={form.fieldLabel} onChange={(e) => update("fieldLabel", e.target.value)} placeholder="Lead Source" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="entityType">Entity Type</Label>
                <Select value={form.entityType} onChange={(e) => update("entityType", e.target.value)}>
                  <option value="contact">Contact</option>
                  <option value="deal">Deal</option>
                  <option value="lead">Lead</option>
                  <option value="company">Company</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="fieldType">Field Type</Label>
                <Select value={form.fieldType} onChange={(e) => update("fieldType", e.target.value)}>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="boolean">Boolean</option>
                  <option value="textarea">Textarea</option>
                </Select>
              </div>
            </div>
            {form.fieldType === "select" && (
              <div>
                <Label htmlFor="options">Options (comma-separated)</Label>
                <Textarea
                  id="options"
                  value={form.options}
                  onChange={(e) => update("options", e.target.value)}
                  rows={3}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}
            <div>
              <Label htmlFor="defaultValue">Default Value</Label>
              <Input id="defaultValue" value={form.defaultValue} onChange={(e) => update("defaultValue", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRequired} onChange={(e) => update("isRequired", e.target.checked)} className="rounded" />
              <span className="text-sm">Required</span>
            </label>
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
