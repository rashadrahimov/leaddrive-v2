"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface AgentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: any
  orgId?: string
}

export function MtmAgentForm({ open, onOpenChange, onSaved, initialData, orgId }: AgentFormProps) {
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "AGENT",
    status: "ACTIVE",
    managerId: "",
  })
  const [managers, setManagers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        role: initialData?.role || "AGENT",
        status: initialData?.status || "ACTIVE",
        managerId: initialData?.managerId || "",
      })
      setError("")
      fetch("/api/v1/mtm/agents?limit=200", {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      })
        .then(r => r.json())
        .then(json => { if (json.success) setManagers(json.data.agents || []) })
        .catch(() => {})
    }
  }, [open, initialData])

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/mtm/agents/${initialData!.id}` : "/api/v1/mtm/agents"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
        },
        body: JSON.stringify({
          ...form,
          managerId: form.managerId || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Agent" : "Add Agent"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{`${tc("name")} *`}</Label>
              <Input id="name" value={form.name} onChange={e => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">{tc("email")}</Label>
                <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">{tc("phone")}</Label>
                <Input id="phone" value={form.phone} onChange={e => update("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onChange={e => update("role", e.target.value)}>
                  <option value="AGENT">Agent</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="MANAGER">Manager</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">{tc("status")}</Label>
                <Select value={form.status} onChange={e => update("status", e.target.value)}>
                  <option value="ACTIVE">{tc("active")}</option>
                  <option value="INACTIVE">{tc("inactive")}</option>
                  <option value="SUSPENDED">Suspended</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="managerId">Manager</Label>
              <Select value={form.managerId} onChange={e => update("managerId", e.target.value)}>
                <option value="">— No manager —</option>
                {managers.filter(m => m.id !== initialData?.id).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>
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
