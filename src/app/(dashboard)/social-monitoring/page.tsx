"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Radio, Plus, ExternalLink, MessageSquare, ThumbsUp, ThumbsDown,
  Minus, Check, Eye, Archive, Ticket, TrendingUp, Filter, RefreshCw, Link as LinkIcon,
  UserPlus, CheckSquare,
} from "lucide-react"
import { SocialAnalyticsPanel } from "@/components/social/analytics-panel"
import { SocialOnboardingChecklist } from "@/components/social/onboarding-checklist"

interface Account {
  id: string
  platform: string
  handle: string
  displayName: string | null
  keywords: string[]
  isActive: boolean
  lastPolledAt: string | null
  accessToken?: string | null
}

interface Mention {
  id: string
  platform: string
  authorName: string | null
  authorHandle: string | null
  authorAvatar: string | null
  text: string
  url: string | null
  sentiment: string | null
  matchedTerm: string | null
  reach: number
  engagement: number
  status: string
  ticketId: string | null
  leadId: string | null
  taskId: string | null
  publishedAt: string | null
  createdAt: string
  account?: { handle: string; displayName: string | null } | null
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  bySentiment: Record<string, number>
}

const PLATFORMS: Array<{ value: Account["platform"]; label: string }> = [
  { value: "twitter", label: "Twitter / X" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "vkontakte", label: "VK" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
]

export default function SocialMonitoringPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  const [accounts, setAccounts] = useState<Account[]>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<string>("")
  const [sentimentFilter, setSentimentFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccPlatform, setNewAccPlatform] = useState("twitter")
  const [newAccHandle, setNewAccHandle] = useState("")
  const [newAccKeywords, setNewAccKeywords] = useState("")

  const loadAccounts = async () => {
    const res = await fetch("/api/v1/social/accounts", { headers })
    const data = await res.json()
    if (data.success) setAccounts(data.data.accounts)
  }

  const loadMentions = async () => {
    const params = new URLSearchParams()
    if (platformFilter) params.set("platform", platformFilter)
    if (sentimentFilter) params.set("sentiment", sentimentFilter)
    if (statusFilter) params.set("status", statusFilter)
    const res = await fetch(`/api/v1/social/mentions?${params}`, { headers })
    const data = await res.json()
    if (data.success) {
      setMentions(data.data.mentions)
      setStats(data.data.stats)
    }
  }

  useEffect(() => {
    Promise.all([loadAccounts(), loadMentions()]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    loadMentions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, sentimentFilter, statusFilter])

  const addAccount = async () => {
    if (!newAccHandle.trim()) return
    const res = await fetch("/api/v1/social/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        platform: newAccPlatform,
        handle: newAccHandle.trim(),
        keywords: newAccKeywords.split(",").map(s => s.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      setShowAddAccount(false)
      setNewAccHandle("")
      setNewAccKeywords("")
      loadAccounts()
    }
  }

  const removeAccount = async (id: string) => {
    if (!confirm("Remove this monitored handle?")) return
    await fetch(`/api/v1/social/accounts/${id}`, { method: "DELETE", headers })
    loadAccounts()
  }

  const pollAccount = async (id: string) => {
    const res = await fetch(`/api/v1/social/accounts/${id}/poll`, { method: "POST", headers })
    const data = await res.json()
    if (data.success) {
      alert(`Ingested ${data.data.ingested} mention(s)`)
      loadAccounts()
      loadMentions()
    } else {
      alert(data.error || data.data?.error || "Poll failed")
    }
  }

  const updateMention = async (id: string, patch: { status?: string; sentiment?: string }) => {
    await fetch("/api/v1/social/mentions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id, ...patch }),
    })
    loadMentions()
  }

  const convertToTicket = async (id: string) => {
    const res = await fetch(`/api/v1/social/mentions/${id}/convert-to-ticket`, {
      method: "POST",
      headers,
    })
    const data = await res.json()
    if (data.success) {
      alert(`Ticket ${data.data.ticketNumber} created.`)
      loadMentions()
    } else {
      alert(data.error || "Failed to create ticket")
    }
  }

  const convertToLead = async (id: string) => {
    const res = await fetch(`/api/v1/social/mentions/${id}/convert-to-lead`, { method: "POST", headers })
    const data = await res.json()
    if (data.success) {
      alert("Lead created.")
      loadMentions()
    } else {
      alert(data.error || "Failed to create lead")
    }
  }

  const convertToTask = async (id: string) => {
    const res = await fetch(`/api/v1/social/mentions/${id}/convert-to-task`, { method: "POST", headers })
    const data = await res.json()
    if (data.success) {
      alert("Task created.")
      loadMentions()
    } else {
      alert(data.error || "Failed to create task")
    }
  }

  const sentimentIcon = (s: string | null) => {
    if (s === "positive") return <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
    if (s === "negative") return <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-orange-500" /> Social Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Track brand mentions across social networks (§5)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="gap-1.5">
            <a href="/api/v1/social/oauth/twitter/start">
              <LinkIcon className="h-4 w-4" /> Connect Twitter
            </a>
          </Button>
          <Button onClick={() => setShowAddAccount(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Monitor handle
          </Button>
        </div>
      </div>

      <SocialOnboardingChecklist
        hasFacebook={accounts.some(a => a.platform === "facebook")}
        hasInstagram={accounts.some(a => a.platform === "instagram")}
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={TrendingUp} label="Total mentions" value={stats.total} color="primary" />
          <StatCard icon={Eye} label="New" value={stats.byStatus.new ?? 0} color="blue" />
          <StatCard icon={ThumbsUp} label="Positive" value={stats.bySentiment.positive ?? 0} color="green" />
          <StatCard icon={ThumbsDown} label="Negative" value={stats.bySentiment.negative ?? 0} color="red" />
          <StatCard icon={Ticket} label="Tickets created" value={stats.byStatus.converted_to_ticket ?? 0} color="amber" />
        </div>
      )}

      <SocialAnalyticsPanel orgId={orgId} />


      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Radio className="h-4 w-4" /> Monitored handles</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No handles yet. Add one to start tracking.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs">
                <Badge variant="outline" className="uppercase text-[10px]">{a.platform}</Badge>
                <span className="font-medium">{a.handle}</span>
                {a.keywords.length > 0 && (
                  <span className="text-muted-foreground">+ {a.keywords.length} kw</span>
                )}
                {["twitter", "facebook", "instagram"].includes(a.platform) && a.accessToken && (
                  <button onClick={() => pollAccount(a.id)} className="text-muted-foreground hover:text-foreground" title="Poll now">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                <button onClick={() => removeAccount(a.id)} className="text-muted-foreground hover:text-red-500 ml-1">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="">All platforms</option>
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
        <Select value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="">Any sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="">Any status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="replied">Replied</option>
          <option value="ignored">Ignored</option>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
      ) : mentions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 py-16 text-center">
          <Radio className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No mentions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Connect a polling pipeline or POST to <code className="bg-muted px-1 rounded">/api/v1/social/ingest</code></p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map(m => (
            <div key={m.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {m.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.authorAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{m.authorName || m.authorHandle || "Anonymous"}</span>
                    {m.authorHandle && <span className="text-xs text-muted-foreground">@{m.authorHandle}</span>}
                    <Badge variant="outline" className="uppercase text-[10px]">{m.platform}</Badge>
                    <div className="flex items-center gap-1">{sentimentIcon(m.sentiment)}</div>
                    {m.status !== "new" && <Badge variant="secondary" className="text-[10px]">{m.status}</Badge>}
                  </div>
                  <p className="text-sm mt-1.5 whitespace-pre-wrap">{m.text}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    {m.reach > 0 && <span>Reach: {m.reach.toLocaleString()}</span>}
                    {m.engagement > 0 && <span>Engagement: {m.engagement.toLocaleString()}</span>}
                    {m.publishedAt && <span>{new Date(m.publishedAt).toLocaleString()}</span>}
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                        <ExternalLink className="h-3 w-3" /> Open
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => updateMention(m.id, { status: "reviewed" })}>
                  <Check className="h-3 w-3" /> Reviewed
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => updateMention(m.id, { status: "replied" })}>
                  <MessageSquare className="h-3 w-3" /> Replied
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => updateMention(m.id, { status: "ignored" })}>
                  <Archive className="h-3 w-3" /> Ignore
                </Button>
                {m.ticketId ? (
                  <a href={`/tickets/${m.ticketId}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600">
                      <Ticket className="h-3 w-3" /> Ticket ↗
                    </Button>
                  </a>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => convertToTicket(m.id)}>
                    <Ticket className="h-3 w-3" /> → Ticket
                  </Button>
                )}
                {m.leadId ? (
                  <a href={`/leads/${m.leadId}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600">
                      <UserPlus className="h-3 w-3" /> Lead ↗
                    </Button>
                  </a>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => convertToLead(m.id)}>
                    <UserPlus className="h-3 w-3" /> → Lead
                  </Button>
                )}
                {m.taskId ? (
                  <a href={`/tasks/${m.taskId}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600">
                      <CheckSquare className="h-3 w-3" /> Task ↗
                    </Button>
                  </a>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => convertToTask(m.id)}>
                    <CheckSquare className="h-3 w-3" /> → Task
                  </Button>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateMention(m.id, { sentiment: "positive" })}>
                    <ThumbsUp className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateMention(m.id, { sentiment: "neutral" })}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateMention(m.id, { sentiment: "negative" })}>
                    <ThumbsDown className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogHeader>
          <DialogTitle>Monitor a handle</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Platform</Label>
              <Select value={newAccPlatform} onChange={e => setNewAccPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
            {(() => {
              // Public-search platforms: any handle/keyword works.
              // OAuth-gated platforms (Meta/TikTok): can only track owned accounts — require sign-in.
              const OAUTH_PLATFORMS: Record<string, { label: string; start: string | null; note: string }> = {
                facebook: {
                  label: "Connect Facebook Page",
                  start: "/api/v1/social/oauth/facebook/start",
                  note: "You'll sign in with Facebook and pick which Pages to monitor. We track posts on each Page you admin (plus linked Instagram Business accounts).",
                },
                instagram: {
                  label: "Connect Instagram Business",
                  start: "/api/v1/social/oauth/facebook/start",
                  note: "Instagram is connected through your Facebook Page. Sign in with Facebook and any linked Business/Creator Instagram account will be tracked automatically.",
                },
                tiktok: {
                  label: "Connect TikTok",
                  start: "/api/v1/social/oauth/tiktok/start",
                  note: "TikTok only exposes your own videos. Sign in to start monitoring comments on your content.",
                },
                youtube: {
                  label: "Connect YouTube",
                  start: "/api/v1/social/oauth/youtube/start",
                  note: "Sign in with YouTube for richer access (your channel's comments). Public comment search works with an API key in env.",
                },
              }
              const oauth = OAUTH_PLATFORMS[newAccPlatform]
              if (oauth) {
                return (
                  <>
                    <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                      {oauth.note}
                    </div>
                    {oauth.start ? (
                      <Button asChild className="w-full gap-2">
                        <a href={oauth.start}>
                          <LinkIcon className="h-4 w-4" /> {oauth.label}
                        </a>
                      </Button>
                    ) : (
                      <Button disabled className="w-full gap-2">
                        <LinkIcon className="h-4 w-4" /> {oauth.label} (soon)
                      </Button>
                    )}
                  </>
                )
              }
              // Public-search platforms: classic handle input.
              return (
                <>
                  <div className="space-y-1">
                    <Label>Handle / page *</Label>
                    <Input value={newAccHandle} onChange={e => setNewAccHandle(e.target.value)} placeholder="@brand or page name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Extra keywords (comma-separated)</Label>
                    <Input value={newAccKeywords} onChange={e => setNewAccKeywords(e.target.value)} placeholder="product name, campaign hashtag" />
                  </div>
                </>
              )
            })()}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddAccount(false)}>Cancel</Button>
          {!["facebook", "instagram", "tiktok", "youtube"].includes(newAccPlatform) && (
            <Button onClick={addAccount} disabled={!newAccHandle.trim()}>Add</Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  }
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass[color] || colorClass.primary}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{value.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}
