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
import { Save, Settings, Building2, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Upload, X, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/invoice-html"

export default function InvoiceSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const orgId = (session?.user as { organizationId?: string })?.organizationId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [templateLang, setTemplateLang] = useState<"az" | "ru" | "en">("az")
  const [emailTemplates, setEmailTemplates] = useState<Record<string, { greeting: string; body: string; closing: string; note: string }>>({
    az: { ...DEFAULT_EMAIL_TEMPLATES.az },
    ru: { ...DEFAULT_EMAIL_TEMPLATES.ru },
    en: { ...DEFAULT_EMAIL_TEMPLATES.en },
  })

  const [settings, setSettings] = useState({
    companyName: "",
    companyAddress: "",
    companyVoen: "",
    companyEmail: "",
    companyPhone: "",
    companyLogoUrl: "",
    numberPrefix: "INV-",
    defaultPaymentTerms: "net30",
    defaultTaxRate: 0.18,
    defaultCurrency: "AZN",
    bankName: "",
    bankCode: "",
    bankSwift: "",
    bankAccount: "",
    bankVoen: "",
    bankCorrAccount: "",
    signerName: "",
    signerTitle: "",
    companyStampUrl: "",
    actSignerName: "",
    actSignerTitle: "",
    actSignerSignatureUrl: "",
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
          const { emailTemplates: savedTemplates, ...rest } = j.data
          setSettings((prev) => ({ ...prev, ...rest }))
          if (savedTemplates && typeof savedTemplates === "object") {
            setEmailTemplates((prev) => {
              const merged = { ...prev }
              for (const lang of ["az", "ru", "en"]) {
                if (savedTemplates[lang]) {
                  merged[lang] = { ...prev[lang], ...savedTemplates[lang] }
                }
              }
              return merged
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  function updateField(field: string, value: string | number) {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  function removeWhiteBackground(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          // Remove white and near-white pixels
          if (r > 200 && g > 200 && b > 200) {
            // Soft edge: partially transparent for grey pixels
            const brightness = (r + g + b) / 3
            data[i + 3] = Math.round(255 - ((brightness - 200) / 55) * 255)
          }
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }
      img.src = dataUrl
    })
  }

  function handleStampUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const transparent = await removeWhiteBackground(dataUrl)
      updateField("companyStampUrl", transparent)
    }
    reader.readAsDataURL(file)
  }

  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const transparent = await removeWhiteBackground(dataUrl)
      updateField("actSignerSignatureUrl", transparent)
    }
    reader.readAsDataURL(file)
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
        body: JSON.stringify({ ...settings, emailTemplates }),
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
        <h1 className="text-2xl font-bold tracking-tight">{t("invoiceSettings")}</h1>
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
            <h1 className="text-2xl font-bold tracking-tight">{t("invoiceSettings")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("invoiceSettingsDesc")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t("hintInvoiceSettings")}</p>
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
              <Label className="text-sm">VÖEN</Label>
              <Input
                value={settings.companyVoen}
                onChange={(e) => updateField("companyVoen", e.target.value)}
                placeholder="1406777811"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">E-poçt</Label>
              <Input
                type="email"
                value={settings.companyEmail}
                onChange={(e) => updateField("companyEmail", e.target.value)}
                placeholder="info@guventechnology.az"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Telefon</Label>
              <Input
                value={settings.companyPhone}
                onChange={(e) => updateField("companyPhone", e.target.value)}
                placeholder="+994 12 000 00 00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Logo URL</Label>
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
          <CardTitle>Bank Rekvizitləri</CardTitle>
          <CardDescription>
            Hesab-fakturada göstəriləcək bank məlumatları.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Bank adı</Label>
              <Input
                value={settings.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                placeholder="Kapital Bank ASC"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Kod (MFO)</Label>
              <Input
                value={settings.bankCode}
                onChange={(e) => updateField("bankCode", e.target.value)}
                placeholder="200087"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">SWIFT</Label>
              <Input
                value={settings.bankSwift}
                onChange={(e) => updateField("bankSwift", e.target.value)}
                placeholder="AIIBAZ2X"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Hesab nömrəsi</Label>
              <Input
                value={settings.bankAccount}
                onChange={(e) => updateField("bankAccount", e.target.value)}
                placeholder="AZ00AIIB00000000000000000000"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">VÖEN</Label>
              <Input
                value={settings.bankVoen}
                onChange={(e) => updateField("bankVoen", e.target.value)}
                placeholder="1234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Müxbir hesab</Label>
              <Input
                value={settings.bankCorrAccount}
                onChange={(e) => updateField("bankCorrAccount", e.target.value)}
                placeholder="AZ00NABZ00000000000000000000"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signer */}
      <Card>
        <CardHeader>
          <CardTitle>İmzalayan və Möhür</CardTitle>
          <CardDescription>
            Hesab-fakturanı imzalayan şəxsin məlumatları və şirkət möhürü.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Ad Soyad</Label>
              <Input
                value={settings.signerName}
                onChange={(e) => updateField("signerName", e.target.value)}
                placeholder="Yusif Rzayev"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Vəzifə</Label>
              <Input
                value={settings.signerTitle}
                onChange={(e) => updateField("signerTitle", e.target.value)}
                placeholder='"GUVEN TECHNOLOGY" MMC-nin direktoru'
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Şirkət Möhürü (skan)</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              PNG/JPG formatında möhür şəkli yükləyin. &quot;Möhürlə PDF&quot; düyməsi ilə fakturaya əlavə ediləcək.
            </p>
            {settings.companyStampUrl ? (
              <div className="flex items-start gap-4 mt-1">
                <div className="relative border rounded-lg p-2 bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.companyStampUrl}
                    alt="Company stamp"
                    className="w-32 h-32 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("companyStampUrl", "")}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-green-600 font-medium mb-2">✓ Möhür yüklənib</p>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2 hover:bg-muted/50 w-fit">
                      <Upload className="h-4 w-4" />
                      Dəyişdir
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleStampUpload}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer mt-1 block">
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Möhür şəklini yükləyin</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG — maks 2MB</span>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleStampUpload}
                />
              </label>
            )}
          </div>

          {/* Act signer section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold mb-3">Akt imzalayan (Təhvil-Təslim Aktı)</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm">Ad Soyad</Label>
                <Input
                  value={settings.actSignerName || ""}
                  onChange={(e) => updateField("actSignerName", e.target.value)}
                  placeholder="Rəşad Rəhimov"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Vəzifə</Label>
                <Input
                  value={settings.actSignerTitle || ""}
                  onChange={(e) => updateField("actSignerTitle", e.target.value)}
                  placeholder="Biznes və strateji şirkətlər üzrə xüsusi nümayəndə"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">İmza (skan)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                PNG/JPG formatında imza şəkli yükləyin. Akt sənədinə əlavə ediləcək.
              </p>
              {settings.actSignerSignatureUrl ? (
                <div className="flex items-start gap-4 mt-1">
                  <div className="relative border rounded-lg p-2 bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.actSignerSignatureUrl}
                      alt="Signature"
                      className="w-32 h-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("actSignerSignatureUrl", "")}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-green-600 font-medium mb-2">✓ İmza yüklənib</p>
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2 hover:bg-muted/50 w-fit">
                        <Upload className="h-4 w-4" />
                        Dəyişdir
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={handleSignatureUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer mt-1 block">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/30 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">İmza şəklini yükləyin</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG — maks 2MB</span>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleSignatureUpload}
                  />
                </label>
              )}
            </div>
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

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>E-poçt şablonları</CardTitle>
              <CardDescription>
                Hesab-faktura göndərilərkən istifadə olunan e-poçt mətni. Hər dil üçün ayrı şablon.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language tabs */}
          <div className="flex gap-1 border-b">
            {(["az", "ru", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setTemplateLang(lang)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  templateLang === lang
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {lang === "az" ? "Azərbaycan" : lang === "ru" ? "Русский" : "English"}
              </button>
            ))}
          </div>

          {/* Template fields for selected language */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">
                {templateLang === "az" ? "Müraciət (Greeting)" : templateLang === "ru" ? "Приветствие (Greeting)" : "Greeting"}
              </Label>
              <Input
                value={emailTemplates[templateLang]?.greeting || ""}
                onChange={(e) => setEmailTemplates((prev) => ({
                  ...prev,
                  [templateLang]: { ...prev[templateLang], greeting: e.target.value },
                }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">
                {templateLang === "az" ? "Əsas mətn (Body)" : templateLang === "ru" ? "Основной текст (Body)" : "Body text"}
              </Label>
              <Textarea
                value={emailTemplates[templateLang]?.body || ""}
                onChange={(e) => setEmailTemplates((prev) => ({
                  ...prev,
                  [templateLang]: { ...prev[templateLang], body: e.target.value },
                }))}
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">
                {templateLang === "az" ? "Bağlanış (Closing)" : templateLang === "ru" ? "Закрытие (Closing)" : "Closing"}
              </Label>
              <Textarea
                value={emailTemplates[templateLang]?.closing || ""}
                onChange={(e) => setEmailTemplates((prev) => ({
                  ...prev,
                  [templateLang]: { ...prev[templateLang], closing: e.target.value },
                }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">
                {templateLang === "az" ? "Alt qeyd (Note)" : templateLang === "ru" ? "Примечание (Note)" : "Footer note"}
              </Label>
              <Textarea
                value={emailTemplates[templateLang]?.note || ""}
                onChange={(e) => setEmailTemplates((prev) => ({
                  ...prev,
                  [templateLang]: { ...prev[templateLang], note: e.target.value },
                }))}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground">
            <strong>Dəyişənlər:</strong> {"{orgName}"} — şirkət adı, {"{invoiceNumber}"} — faktura nömrəsi, {"{total}"} — yekun məbləğ, {"{currency}"} — valyuta, {"{dueDate}"} — ödəniş tarixi
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
