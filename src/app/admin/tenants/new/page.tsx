"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, CheckCircle2, Copy } from "lucide-react"
import Link from "next/link"

interface ProvisionResult {
  organization: { id: string; name: string; slug: string; plan: string }
  user: { id: string; email: string; name: string }
  tempPassword: string
  url: string
}

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ProvisionResult | null>(null)
  const [copied, setCopied] = useState("")

  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    adminEmail: "",
    adminName: "",
    plan: "starter",
    primaryColor: "#6C63FF",
    logo: "",
  })

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30)
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      companyName: name,
      slug: generateSlug(name),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/v1/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          slug: form.slug,
          adminEmail: form.adminEmail,
          adminName: form.adminName,
          plan: form.plan,
          branding: { primaryColor: form.primaryColor, logo: form.logo || undefined },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Provisioning failed")
        return
      }

      setResult(data.data)
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Client</h1>
          <p className="text-muted-foreground text-sm">Provision a new SaaS tenant</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label>Company Name *</Label>
            <Input
              value={form.companyName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label>URL *</Label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 h-10 rounded-l-lg border border-r-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">https://</span>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="acme-corp"
                required
                pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
                className="rounded-none border-x-0 font-mono"
              />
              <span className="inline-flex items-center px-3 h-10 rounded-r-lg border border-l-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">.leaddrivecrm.org</span>
            </div>
          </div>

          {/* Admin Email */}
          <div className="space-y-1.5">
            <Label>Admin Email *</Label>
            <Input
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              placeholder="admin@acme.com"
              required
            />
          </div>

          {/* Admin Name */}
          <div className="space-y-1.5">
            <Label>Admin Name *</Label>
            <Input
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option value="starter">Starter (3 users, 500 contacts)</option>
              <option value="professional">Professional (25 users, 10K contacts)</option>
              <option value="enterprise">Enterprise (unlimited)</option>
            </Select>
          </div>

          {/* Branding */}
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

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Provisioning...
              </>
            ) : (
              "Build Tenant"
            )}
          </Button>
        </form>
      </Card>

      {/* Success dialog */}
      <Dialog open={!!result} onOpenChange={() => { setResult(null); router.push("/admin/tenants") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Tenant Created!
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-md bg-muted p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{result.organization.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="capitalize">{result.organization.plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">URL</span>
                  <button
                    onClick={() => copyToClipboard(result.url, "url")}
                    className="font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    {result.url}
                    <Copy className="w-3 h-3" />
                    {copied === "url" && <span className="text-xs text-green-500">Copied!</span>}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-mono text-xs">{result.user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Temp Password</span>
                  <button
                    onClick={() => copyToClipboard(result.tempPassword, "password")}
                    className="font-mono bg-white dark:bg-zinc-800 px-2 py-1 rounded border text-xs flex items-center gap-1"
                  >
                    {result.tempPassword}
                    <Copy className="w-3 h-3" />
                    {copied === "password" && <span className="text-xs text-green-500">Copied!</span>}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A welcome email with login credentials has been sent to {result.user.email}.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
