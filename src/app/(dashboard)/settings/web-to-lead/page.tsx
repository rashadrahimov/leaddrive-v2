"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Code, Copy, Check, ExternalLink, Globe } from "lucide-react"

export default function WebToLeadPage() {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [copied, setCopied] = useState(false)
  const [orgSlug, setOrgSlug] = useState("guven-technology")
  const [formTitle, setFormTitle] = useState("Contact Us")
  const [showPhone, setShowPhone] = useState(true)
  const [showCompany, setShowCompany] = useState(true)
  const [showMessage, setShowMessage] = useState(true)
  const [submitText, setSubmitText] = useState("Submit")
  const [redirectUrl, setRedirectUrl] = useState("")

  const apiEndpoint = `${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/public/leads`

  const embedCode = `<!-- LeadDrive Web-to-Lead Form -->
<form id="leaddrive-form" onsubmit="return submitLeadDriveForm(event)">
  <h3>${formTitle}</h3>
  <div>
    <label for="ld-name">Name *</label>
    <input type="text" id="ld-name" name="name" required />
  </div>
  <div>
    <label for="ld-email">Email *</label>
    <input type="email" id="ld-email" name="email" required />
  </div>${showPhone ? `
  <div>
    <label for="ld-phone">Phone</label>
    <input type="tel" id="ld-phone" name="phone" />
  </div>` : ""}${showCompany ? `
  <div>
    <label for="ld-company">Company</label>
    <input type="text" id="ld-company" name="company" />
  </div>` : ""}${showMessage ? `
  <div>
    <label for="ld-message">Message</label>
    <textarea id="ld-message" name="message" rows="3"></textarea>
  </div>` : ""}
  <button type="submit">${submitText}</button>
</form>
<script>
async function submitLeadDriveForm(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    name: f.name.value,
    email: f.email.value,${showPhone ? "\n    phone: f.phone?.value || ''," : ""}${showCompany ? "\n    company: f.company?.value || ''," : ""}${showMessage ? "\n    message: f.message?.value || ''," : ""}
    source: "web_form",
    org_slug: "${orgSlug}"
  };
  try {
    const r = await fetch("${apiEndpoint}", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });
    if (r.ok) {
      ${redirectUrl ? `window.location.href = "${redirectUrl}";` : `alert("Thank you! We'll be in touch soon.");`}
      f.reset();
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch(err) {
    alert("Connection error. Please try again.");
  }
  return false;
}
</script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6" /> {t("webToLead")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("webToLeadDesc")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("hintWebToLead")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Form Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Organization Slug</label>
                <Input value={orgSlug} onChange={e => setOrgSlug(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Form Title</label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Submit Button Text</label>
                <Input value={submitText} onChange={e => setSubmitText(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Redirect URL (optional)</label>
                <Input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://yoursite.com/thank-you" className="mt-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fields</label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Name *</Badge>
                  <Badge variant="default">Email *</Badge>
                  <Badge
                    variant={showPhone ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setShowPhone(!showPhone)}
                  >Phone</Badge>
                  <Badge
                    variant={showCompany ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setShowCompany(!showCompany)}
                  >Company</Badge>
                  <Badge
                    variant={showMessage ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setShowMessage(!showMessage)}
                  >Message</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Click badges to toggle optional fields</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">API Endpoint</CardTitle>
                <Badge variant="outline">POST</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <code className="block text-sm bg-muted/50 rounded p-2 break-all">
                {apiEndpoint}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                CORS enabled. Rate limited to 10 requests/minute per IP.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" /> Embed Code
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto max-h-96 whitespace-pre-wrap">
                {embedCode}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-background">
                <h3 className="text-lg font-semibold mb-3">{formTitle}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input placeholder="John Doe" className="mt-1" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input placeholder="john@company.com" className="mt-1" disabled />
                  </div>
                  {showPhone && (
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input placeholder="+994 50 123 4567" className="mt-1" disabled />
                    </div>
                  )}
                  {showCompany && (
                    <div>
                      <label className="text-sm font-medium">Company</label>
                      <Input placeholder="Acme Corp" className="mt-1" disabled />
                    </div>
                  )}
                  {showMessage && (
                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Tell us about your needs..." rows={3} disabled />
                    </div>
                  )}
                  <Button disabled className="w-full">{submitText}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
