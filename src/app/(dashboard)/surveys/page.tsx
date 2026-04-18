"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, Copy, Link as LinkIcon, TrendingUp, TrendingDown, Users, Star, Mail, Send } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

interface Survey {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  publicSlug: string
  channels: string[]
  totalResponses: number
  createdAt: string
  stats?: {
    total: number
    promoters: number
    detractors: number
    nps: number | null
    avgScore: number | null
  }
}

export default function SurveysPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"nps" | "csat" | "ces" | "custom">("nps")
  const [triggerTicketResolve, setTriggerTicketResolve] = useState(false)
  const [emailChannel, setEmailChannel] = useState(true)
  const [saving, setSaving] = useState(false)

  const [sendDialogId, setSendDialogId] = useState<string | null>(null)
  const [sendEmailsText, setSendEmailsText] = useState("")
  const [sendPhonesText, setSendPhonesText] = useState("")
  const [sendChannel, setSendChannel] = useState<"email" | "sms">("email")
  const [sendAllContacts, setSendAllContacts] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/v1/surveys", { headers })
      const json = await res.json()
      if (json.success) setSurveys(json.data.surveys)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const create = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/v1/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name,
          description,
          type,
          channels: emailChannel ? ["email"] : [],
          triggers: triggerTicketResolve ? { afterTicketResolve: true } : {},
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setName("")
        setDescription("")
        setType("nps")
        setTriggerTicketResolve(false)
        setEmailChannel(true)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/surveys/${deleteId}`, { method: "DELETE", headers })
    load()
  }

  const toggleStatus = async (s: Survey) => {
    const next = s.status === "active" ? "paused" : "active"
    await fetch(`/api/v1/surveys/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ status: next }),
    })
    load()
  }

  const publicUrl = (slug: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/s/${slug}` : `/s/${slug}`

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(publicUrl(slug))
  }

  const sendInvites = async () => {
    if (!sendDialogId) return
    setSending(true)
    setSendResult(null)
    try {
      const split = (v: string) => v.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean)
      const emails = split(sendEmailsText)
      const phones = split(sendPhonesText)
      const res = await fetch(`/api/v1/surveys/${sendDialogId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          channel: sendChannel,
          emails: sendChannel === "email" && emails.length ? emails : undefined,
          phones: sendChannel === "sms" && phones.length ? phones : undefined,
          allActiveContacts: sendAllContacts,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setSendResult(`Error: ${data.error || "failed"}`)
      } else {
        const skipped = data.data.skipped != null ? ` Skipped: ${data.data.skipped}` : ""
        setSendResult(`Sent ${data.data.sent} of ${data.data.total}. Failed: ${data.data.failed}.${skipped}`)
        load()
      }
    } catch (e: any) {
      setSendResult(`Error: ${e?.message || "failed"}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" /> Surveys & NPS
          </h1>
          <p className="text-sm text-muted-foreground">Collect customer feedback via NPS, CSAT, and CES surveys (§8)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New survey
        </Button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      ) : surveys.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 py-16 text-center">
          <Star className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No surveys yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first NPS or CSAT survey</p>
          <Button className="mt-4 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Create survey
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map(s => {
            const nps = s.stats?.nps
            const npsColor =
              nps == null ? "text-muted-foreground" : nps >= 50 ? "text-green-600" : nps >= 0 ? "text-amber-600" : "text-red-600"
            return (
              <div key={s.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <a href={`/surveys/${s.id}`} className="min-w-0 flex-1 hover:opacity-80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{s.name}</h3>
                      <Badge variant={s.status === "active" ? "default" : "secondary"} className="uppercase text-[10px]">
                        {s.status}
                      </Badge>
                      <Badge variant="outline" className="uppercase text-[10px]">{s.type}</Badge>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-3 py-2 border-y">
                  <Stat icon={Users} label="Responses" value={s.stats?.total ?? 0} />
                  <Stat icon={TrendingUp} label="Promoters" value={s.stats?.promoters ?? 0} valueClass="text-green-600" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">NPS</p>
                    <p className={`text-lg font-bold ${npsColor}`}>{nps == null ? "—" : nps}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(s.publicSlug)} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={publicUrl(s.publicSlug)} target="_blank" rel="noreferrer" className="gap-1.5 inline-flex items-center">
                      <LinkIcon className="h-3.5 w-3.5" /> Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(s)}>
                    {s.status === "active" ? "Pause" : "Activate"}
                  </Button>
                  {s.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { setSendDialogId(s.id); setSendEmailsText(""); setSendAllContacts(false); setSendResult(null) }}
                    >
                      <Mail className="h-3.5 w-3.5" /> Send
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 ml-auto"
                    onClick={() => { setDeleteId(s.id); setDeleteName(s.name) }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogHeader>
          <DialogTitle>New survey</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q4 Customer NPS" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="nps">NPS (0–10 recommend)</option>
                <option value="csat">CSAT (1–5 satisfaction)</option>
                <option value="ces">CES (1–7 effort)</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={emailChannel} onChange={e => setEmailChannel(e.target.checked)} />
                Enable email channel (required for manual + trigger sending)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={triggerTicketResolve} onChange={e => setTriggerTicketResolve(e.target.checked)} />
                Auto-send when a ticket is resolved
              </label>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving || !name.trim()}>{saving ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={remove}
        title="Delete survey"
        itemName={deleteName}
      />

      <Dialog open={!!sendDialogId} onOpenChange={open => { if (!open) setSendDialogId(null) }}>
        <DialogHeader>
          <DialogTitle>Send survey</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setSendChannel("email")}
                className={`px-3 py-1 text-sm rounded-md ${sendChannel === "email" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >Email</button>
              <button
                onClick={() => setSendChannel("sms")}
                className={`px-3 py-1 text-sm rounded-md ${sendChannel === "sms" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >SMS</button>
            </div>
            {sendChannel === "email" ? (
              <div className="space-y-1">
                <Label>Recipients (one email per line or comma-separated)</Label>
                <Textarea
                  value={sendEmailsText}
                  onChange={e => setSendEmailsText(e.target.value)}
                  rows={5}
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Phone numbers (one per line or comma-separated, E.164 format)</Label>
                <Textarea
                  value={sendPhonesText}
                  onChange={e => setSendPhonesText(e.target.value)}
                  rows={5}
                  placeholder="+994501234567, +48600000000"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendAllContacts} onChange={e => setSendAllContacts(e.target.checked)} />
              Send to all active contacts with {sendChannel === "email" ? "email" : "phone"} (max 5000)
            </label>
            <p className="text-[11px] text-muted-foreground">
              Recipients who already responded within this survey and unsubscribed emails are skipped automatically.
            </p>
            {sendResult && (
              <div className={`text-xs rounded-md p-2 ${sendResult.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "bg-green-50 text-green-700 dark:bg-green-900/20"}`}>
                {sendResult}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSendDialogId(null)}>Close</Button>
          <Button onClick={sendInvites} disabled={sending || (!((sendChannel === "email" ? sendEmailsText : sendPhonesText).trim()) && !sendAllContacts)} className="gap-1.5">
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send now"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function Stat({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: number; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
      <p className={`text-lg font-bold ${valueClass || ""}`}>{value}</p>
    </div>
  )
}
