"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Webhook, Calendar, MessageSquare, Zap, Plus, Trash2, Check, X, ExternalLink, Copy, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageDescription } from "@/components/page-description"

interface WebhookData {
  id: string
  url: string
  events: string[]
  isActive: boolean
  secret?: string
  createdAt: string
}

interface SlackConfig {
  id: string
  configName: string
  webhookUrl: string
  isActive: boolean
}

const WEBHOOK_EVENTS = [
  "contact.created", "contact.updated", "contact.deleted",
  "deal.created", "deal.updated", "deal.stage_changed",
  "lead.created", "lead.updated",
  "ticket.created", "ticket.updated", "ticket.resolved",
  "company.created", "company.updated",
]

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const t = useTranslations("integrationsPage")
  const orgId = session?.user?.organizationId

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [showWebhookForm, setShowWebhookForm] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])
  const [newSecret, setNewSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)

  // Slack
  const [slackConfigs, setSlackConfigs] = useState<SlackConfig[]>([])
  const [showSlackForm, setShowSlackForm] = useState(false)
  const [slackName, setSlackName] = useState("")
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [slackTestResult, setSlackTestResult] = useState<string | null>(null)

  const headers = orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/v1/webhooks/manage", { headers })
      const json = await res.json()
      if (json.success) setWebhooks(json.data)
    } catch {}
  }

  const fetchSlack = async () => {
    try {
      const res = await fetch("/api/v1/integrations/slack", { headers })
      const json = await res.json()
      if (json.success) setSlackConfigs(json.data)
    } catch {}
  }

  useEffect(() => {
    fetchWebhooks()
    fetchSlack()
  }, [session])

  const createWebhook = async () => {
    if (!webhookUrl || webhookEvents.length === 0) return
    const res = await fetch("/api/v1/webhooks/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ url: webhookUrl, events: webhookEvents }),
    })
    const json = await res.json()
    if (json.success) {
      setNewSecret(json.data.secret)
      setShowSecret(true)
      setWebhookUrl("")
      setWebhookEvents([])
      setShowWebhookForm(false)
      fetchWebhooks()
    }
  }

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/v1/webhooks/manage/${id}`, { method: "DELETE", headers })
    fetchWebhooks()
  }

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/webhooks/manage/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ isActive }),
    })
    fetchWebhooks()
  }

  const createSlack = async () => {
    if (!slackName || !slackWebhookUrl) return
    await fetch("/api/v1/integrations/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ configName: slackName, webhookUrl: slackWebhookUrl }),
    })
    setSlackName("")
    setSlackWebhookUrl("")
    setShowSlackForm(false)
    fetchSlack()
  }

  const testSlack = async (webhookUrl: string) => {
    const res = await fetch("/api/v1/integrations/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "test", webhookUrl }),
    })
    const json = await res.json()
    setSlackTestResult(json.success ? t("testSent") : t("testFailed"))
    setTimeout(() => setSlackTestResult(null), 3000)
  }

  const deleteSlack = async (id: string) => {
    await fetch(`/api/v1/integrations/slack?id=${id}`, { method: "DELETE", headers })
    fetchSlack()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
        <PageDescription text={t("description")} />
      </div>

      {/* Integration cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Webhook className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <h3 className="font-semibold">{t("webhooks")}</h3>
            <p className="text-sm text-muted-foreground">{webhooks.filter(w => w.isActive).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-semibold">{t("googleCalendar")}</h3>
            <p className="text-sm text-muted-foreground">{t("viaGoogleOAuth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <h3 className="font-semibold">{t("slack")}</h3>
            <p className="text-sm text-muted-foreground">{slackConfigs.length} configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <h3 className="font-semibold">{t("zapier")}</h3>
            <p className="text-sm text-muted-foreground">{t("useWebhookUrls")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-orange-500" /> Webhooks
          </CardTitle>
          <Button size="sm" onClick={() => setShowWebhookForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("addWebhook")}
          </Button>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noWebhooks")}</p>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => (
                <div key={wh.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {wh.events.map(ev => (
                        <span key={ev} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{ev}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => toggleWebhook(wh.id, !wh.isActive)}
                      className={cn("w-2.5 h-2.5 rounded-full", wh.isActive ? "bg-green-500" : "bg-muted-foreground/30")}
                      title={wh.isActive ? "Active" : "Inactive"}
                    />
                    <Button size="icon" variant="ghost" onClick={() => deleteWebhook(wh.id)} className="h-7 w-7 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" /> Slack
          </CardTitle>
          <Button size="sm" onClick={() => setShowSlackForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("addSlackWebhook")}
          </Button>
        </CardHeader>
        <CardContent>
          {slackConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noSlack")}</p>
          ) : (
            <div className="space-y-3">
              {slackConfigs.map(cfg => (
                <div key={cfg.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{cfg.configName}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-md">{cfg.webhookUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {slackTestResult && <span className="text-xs text-green-600">{slackTestResult}</span>}
                    <Button size="sm" variant="outline" onClick={() => testSlack(cfg.webhookUrl)}>{t("test")}</Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteSlack(cfg.id)} className="h-7 w-7 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Form Dialog */}
      <Dialog open={showWebhookForm} onOpenChange={setShowWebhookForm}>
        <DialogHeader>
          <DialogTitle>{t("addWebhook")}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="grid gap-4">
            <div>
              <Label>{t("webhookUrl")}</Label>
              <Input placeholder="https://hooks.zapier.com/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            </div>
            <div>
              <Label>{t("events")}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(ev)}
                      onChange={e => {
                        if (e.target.checked) setWebhookEvents(prev => [...prev, ev])
                        else setWebhookEvents(prev => prev.filter(x => x !== ev))
                      }}
                      className="rounded"
                    />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWebhookForm(false)}>{t("cancel")}</Button>
          <Button onClick={createWebhook} disabled={!webhookUrl || webhookEvents.length === 0}>{t("createWebhook")}</Button>
        </DialogFooter>
      </Dialog>

      {/* Secret Display Dialog */}
      <Dialog open={showSecret} onOpenChange={setShowSecret}>
        <DialogHeader>
          <DialogTitle>{t("webhookSecret")}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground mb-3">{t("webhookSecretHint")}</p>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="text-xs font-mono flex-1 break-all">{newSecret}</code>
            <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(newSecret) }} className="h-7 w-7">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setShowSecret(false)}>{t("done")}</Button>
        </DialogFooter>
      </Dialog>

      {/* Slack Form Dialog */}
      <Dialog open={showSlackForm} onOpenChange={setShowSlackForm}>
        <DialogHeader>
          <DialogTitle>{t("addSlackWebhook")}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="grid gap-4">
            <div>
              <Label>{t("slackName")}</Label>
              <Input placeholder={t("slackName")} value={slackName} onChange={e => setSlackName(e.target.value)} />
            </div>
            <div>
              <Label>{t("slackWebhookUrl")}</Label>
              <Input placeholder="https://hooks.slack.com/services/..." value={slackWebhookUrl} onChange={e => setSlackWebhookUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{t("slackHint")}</p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSlackForm(false)}>{t("cancel")}</Button>
          <Button onClick={createSlack} disabled={!slackName || !slackWebhookUrl}>{t("addIntegration")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
