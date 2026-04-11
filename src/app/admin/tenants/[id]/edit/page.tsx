"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Save, Check } from "lucide-react"
import Link from "next/link"
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules"

const FEATURE_MODULES = (Object.entries(MODULE_REGISTRY) as [ModuleId, { name: string; requires: ModuleId[]; alwaysOn?: boolean }][])
  .filter(([, def]) => !def.alwaysOn)
  .map(([id, def]) => ({ id, label: def.name, requires: def.requires }))

interface TenantData {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxContacts: number
  branding: any
  features: any
  isActive: boolean
  serverType: string
  provisionedAt: string | null
  createdAt: string
}

export default function TenantEditPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "starter",
    maxUsers: 3,
    maxContacts: 500,
    primaryColor: "#6C63FF",
    logo: "",
    features: [] as string[],
  })

  useEffect(() => {
    fetch(`/api/v1/admin/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const t = res.data
          setTenant(t)
          const branding = typeof t.branding === "string" ? JSON.parse(t.branding || "{}") : (t.branding || {})
          const featuresRaw = typeof t.features === "string" ? JSON.parse(t.features || "[]") : (t.features || [])
          setForm({
            name: t.name,
            slug: t.slug,
            plan: t.plan,
            maxUsers: t.maxUsers,
            maxContacts: t.maxContacts,
            primaryColor: branding.primaryColor || "#6C63FF",
            logo: branding.logo || "",
            features: Array.isArray(featuresRaw) ? featuresRaw : [],
          })
        }
      })
      .catch(() => setError("Failed to load tenant"))
      .finally(() => setLoading(false))
  }, [tenantId])

  function toggleFeature(id: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter((f) => f !== id)
        : [...prev.features, id],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
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
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tenant) {
    return <div className="py-20 text-center text-muted-foreground">Tenant not found</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/tenants/${tenantId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Tenant</h1>
            <p className="text-muted-foreground text-sm">{tenant.name} &mdash; <span className="font-mono">{tenant.slug}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — General info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">General</h3>
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
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">Active Modules</h3>
            <p className="text-sm text-muted-foreground mb-3">Select which modules are available for this tenant</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FEATURE_MODULES.map((mod) => {
                const isActive = form.features.includes(mod.id)
                const deps = mod.requires.filter((r) => r !== "core")
                const missingDeps = deps.filter((d) => !form.features.includes(d))
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      isActive
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/70 bg-card hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleFeature(mod.id)}
                      className="rounded mt-0.5"
                    />
                    <div>
                      <span className="font-medium">{mod.label}</span>
                      {deps.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requires: {deps.join(", ")}
                        </p>
                      )}
                      {isActive && missingDeps.length > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Missing: {missingDeps.join(", ")}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right column — Plan & Branding */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">Plan & Limits</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
              </div>
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
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">Branding</h3>
            <div className="space-y-4">
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
                {form.logo && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                    <img src={form.logo} alt="Logo preview" className="h-8 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold mb-3">Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={tenant.isActive ? "default" : "destructive"}>
                    {tenant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Server</dt>
                <dd className="capitalize">{tenant.serverType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(tenant.createdAt).toLocaleDateString()}</dd>
              </div>
              {tenant.provisionedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Provisioned</dt>
                  <dd>{new Date(tenant.provisionedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
