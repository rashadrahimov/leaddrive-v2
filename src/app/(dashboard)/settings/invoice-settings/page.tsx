"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Save, Settings, Building2, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function InvoiceSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const orgId = (session?.user as { organizationId?: string })?.organizationId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [settings, setSettings] = useState({
    companyName: "",
    companyAddress: "",
    companyVoen: "",
    companyLogoUrl: "",
    numberPrefix: "INV-",
    defaultPaymentTerms: "net30",
    defaultTaxRate: 0.18,
    defaultCurrency: "AZN",
    bankDetails: "",
    termsAndConditions: "",
    footerNote: "",
  })

  useEffect(() => {
    if (!orgId) return
    fetch("/api/v1/settings/invoice", {
      headers: { "x-organization-id": String(orgId) },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setSettings((prev) => ({ ...prev, ...j.data }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  function updateField(field: string, value: string | number) {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/v1/settings/invoice", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      setMsg({ type: "success", text: tc("savedSuccessfully") })
    } catch (err: any) {
      setMsg({ type: "error", text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
        <div className="animate-pulse">
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure default settings for invoices and commercial offers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm",
                msg.type === "success" ? "text-green-600" : "text-red-500"
              )}
            >
              {msg.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {msg.text}
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {tc("save")}
          </Button>
        </div>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Company Information</CardTitle>
          </div>
          <CardDescription>
            Company details displayed on invoices. May differ from your organization name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Company Name</Label>
            <Input
              value={settings.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="Your Company LLC"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Company Address</Label>
            <Textarea
              value={settings.companyAddress}
              onChange={(e) => updateField("companyAddress", e.target.value)}
              placeholder="123 Main St, Baku, Azerbaijan"
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Company VOEN (Tax ID)</Label>
              <Input
                value={settings.companyVoen}
                onChange={(e) => updateField("companyVoen", e.target.value)}
                placeholder="1234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Company Logo URL</Label>
              <Input
                value={settings.companyLogoUrl}
                onChange={(e) => updateField("companyLogoUrl", e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Optional — displayed on invoice header</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Default Settings</CardTitle>
          </div>
          <CardDescription>
            Default values applied to new invoices. Can be overridden per invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Number Prefix</Label>
              <Input
                value={settings.numberPrefix}
                onChange={(e) => updateField("numberPrefix", e.target.value)}
                placeholder="INV-"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prefix for invoice numbers, e.g. INV-001, KP-001
              </p>
            </div>
            <div>
              <Label className="text-sm">Default Payment Terms</Label>
              <Select
                value={settings.defaultPaymentTerms}
                onChange={(e) => updateField("defaultPaymentTerms", e.target.value)}
                className="mt-1"
              >
                <option value="due_on_receipt">Due on Receipt</option>
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net45">Net 45</option>
                <option value="net60">Net 60</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Default Tax Rate</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={Math.round(settings.defaultTaxRate * 100 * 100) / 100}
                  onChange={(e) => updateField("defaultTaxRate", Number(e.target.value) / 100)}
                  placeholder="18"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Standard VAT rate in Azerbaijan is 18%
              </p>
            </div>
            <div>
              <Label className="text-sm">Default Currency</Label>
              <Select
                value={settings.defaultCurrency}
                onChange={(e) => updateField("defaultCurrency", e.target.value)}
                className="mt-1"
              >
                <option value="AZN">AZN — Azerbaijani Manat</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>
            Banking information displayed on invoices for payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-sm">Bank Details</Label>
            <Textarea
              value={settings.bankDetails}
              onChange={(e) => updateField("bankDetails", e.target.value)}
              placeholder={"Bank: Kapital Bank ASC\nAccount: AZ00AIIB00000000000000000000\nIBAN: AZ00AIIB00000000000000000000\nSWIFT: AIIBAZ2X"}
              rows={5}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include bank name, account number, IBAN, and SWIFT code
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Text */}
      <Card>
        <CardHeader>
          <CardTitle>Default Text</CardTitle>
          <CardDescription>
            Default terms and footer text included on every invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Default Terms & Conditions</Label>
            <Textarea
              value={settings.termsAndConditions}
              onChange={(e) => updateField("termsAndConditions", e.target.value)}
              placeholder="Payment is due within the specified terms. Late payments may incur additional charges."
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Default Footer Note</Label>
            <Textarea
              value={settings.footerNote}
              onChange={(e) => updateField("footerNote", e.target.value)}
              placeholder="Thank you for your business!"
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
