"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface AiConfigFormData {
  configName: string
  model: string
  maxTokens: string
  temperature: string
  systemPrompt: string
  toolsEnabled: string
  kbEnabled: boolean
  kbMaxArticles: string
  isActive: boolean
  notes: string
}

interface AiConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<AiConfigFormData> & { id?: string }
  orgId?: string
}

export function AiConfigForm({ open, onOpenChange, onSaved, initialData, orgId }: AiConfigFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<AiConfigFormData>({
    configName: initialData?.configName || "",
    model: initialData?.model || "claude-haiku-4-5-20251001",
    maxTokens: String(initialData?.maxTokens || "2048"),
    temperature: String(initialData?.temperature || "0.7"),
    systemPrompt: initialData?.systemPrompt || "",
    toolsEnabled: initialData?.toolsEnabled || "",
    kbEnabled: initialData?.kbEnabled ?? true,
    kbMaxArticles: String(initialData?.kbMaxArticles || "5"),
    isActive: initialData?.isActive ?? true,
    notes: initialData?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        configName: initialData?.configName || "",
        model: initialData?.model || "claude-haiku-4-5-20251001",
        maxTokens: String(initialData?.maxTokens || "2048"),
        temperature: String(initialData?.temperature || "0.7"),
        systemPrompt: initialData?.systemPrompt || "",
        toolsEnabled: initialData?.toolsEnabled || "",
        kbEnabled: initialData?.kbEnabled ?? true,
        kbMaxArticles: String(initialData?.kbMaxArticles || "5"),
        isActive: initialData?.isActive ?? true,
        notes: initialData?.notes || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/ai-configs/${initialData!.id}` : "/api/v1/ai-configs"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          ...form,
          maxTokens: parseInt(form.maxTokens) || 2048,
          temperature: parseFloat(form.temperature) || 0.7,
          kbMaxArticles: parseInt(form.kbMaxArticles) || 5,
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

  const update = (key: keyof AiConfigFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit AI Agent" : "New AI Agent"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="configName">Agent Name *</Label>
                <Input id="configName" value={form.configName} onChange={(e) => update("configName", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Select value={form.model} onChange={(e) => update("model", e.target.value)}>
                  <option value="claude-opus-4-6-20250514">Claude Opus 4.6</option>
                  <option value="claude-sonnet-4-6-20250514">Claude Sonnet 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input id="maxTokens" type="number" value={form.maxTokens} onChange={(e) => update("maxTokens", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input id="temperature" type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(e) => update("temperature", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="kbMaxArticles">KB Max Articles</Label>
                <Input id="kbMaxArticles" type="number" value={form.kbMaxArticles} onChange={(e) => update("kbMaxArticles", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea id="systemPrompt" value={form.systemPrompt} onChange={(e) => update("systemPrompt", e.target.value)} rows={6} placeholder="You are a helpful IT support assistant..." />
            </div>
            <div>
              <Label htmlFor="toolsEnabled">Tools Enabled (comma-separated)</Label>
              <Input id="toolsEnabled" value={form.toolsEnabled} onChange={(e) => update("toolsEnabled", e.target.value)} placeholder="get_tickets, create_ticket, escalate_to_human" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="rounded" />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.kbEnabled} onChange={(e) => update("kbEnabled", e.target.checked)} className="rounded" />
                <span className="text-sm">KB Integration</span>
              </label>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
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
