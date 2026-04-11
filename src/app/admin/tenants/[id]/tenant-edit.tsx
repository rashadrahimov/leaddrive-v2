"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Pencil } from "lucide-react"

const FEATURE_MODULES = [
  { id: "whatsapp", label: "WhatsApp", group: "Channels" },
  { id: "ai", label: "Da Vinci AI", group: "AI" },
  { id: "voip", label: "VoIP / Twilio", group: "Channels" },
  { id: "portal", label: "Customer Portal", group: "Support" },
  { id: "events", label: "Events", group: "Marketing" },
  { id: "mtm", label: "Mobile Team (MTM)", group: "Field Ops" },
  { id: "finance", label: "Finance Module", group: "ERP" },
  { id: "campaigns", label: "Campaigns", group: "Marketing" },
  { id: "tickets", label: "Tickets / Helpdesk", group: "Support" },
  { id: "kb", label: "Knowledge Base", group: "Support" },
  { id: "budgeting", label: "Budgeting", group: "ERP" },
  { id: "projects", label: "Projects", group: "ERP" },
]

interface TenantData {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxContacts: number
  branding: any
  features: any
}

export function TenantEditButton({ tenant }: { tenant: TenantData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const branding = typeof tenant.branding === "string" ? JSON.parse(tenant.branding || "{}") : (tenant.branding || {})
  const featuresRaw = typeof tenant.features === "string" ? JSON.parse(tenant.features || "[]") : (tenant.features || [])
  const featuresArr: string[] = Array.isArray(featuresRaw) ? featuresRaw : []

  const [form, setForm] = useState({
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    maxUsers: tenant.maxUsers,
    maxContacts: tenant.maxContacts,
    primaryColor: branding.primaryColor || "#6C63FF",
    logo: branding.logo || "",
    features: featuresArr,
  })

  function toggleFeature(id: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter((f) => f !== id)
        : [...prev.features, id],
    }))
  }

  function handleOpen() {
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      maxUsers: tenant.maxUsers,
      maxContacts: tenant.maxContacts,
      primaryColor: branding.primaryColor || "#6C63FF",
      logo: branding.logo || "",
      features: featuresArr,
    })
    setError("")
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          plan: form.plan,
          maxUsers: form.maxUsers,
          maxContacts: form.maxContacts,
          branding: { primaryColor: form.primaryColor, logo: form.logo || undefined },
          features: form.features,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Update failed")
        return
      }
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Pencil className="w-4 h-4 mr-1" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL</Label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 h-10 rounded-l-lg border border-r-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">https://</span>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="rounded-none border-x-0 font-mono"
                />
                <span className="inline-flex items-center px-3 h-10 rounded-r-lg border border-l-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">.leaddrivecrm.org</span>
              </div>
              {form.slug !== tenant.slug && (
                <p className="text-xs text-amber-600">Warning: changing the slug will change the login URL for all users</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="starter">Starter (3 users, 500 contacts)</option>
                <option value="professional">Professional (25 users, 10K contacts)</option>
                <option value="enterprise">Enterprise (unlimited)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">-1 = unlimited</p>
              </div>
              <div className="space-y-1.5">
                <Label>Max Contacts</Label>
                <Input
                  type="number"
                  value={form.maxContacts}
                  onChange={(e) => setForm({ ...form, maxContacts: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">-1 = unlimited</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Feature modules */}
            <div className="space-y-2">
              <Label>Active Modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_MODULES.map((mod) => (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      form.features.includes(mod.id)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/70 bg-card hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.features.includes(mod.id)}
                      onChange={() => toggleFeature(mod.id)}
                      className="rounded"
                    />
                    <span>{mod.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{mod.group}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
