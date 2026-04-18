"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, MessageCircle, Globe, User, CheckCircle, Ticket as TicketIcon, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"

interface SessionItem {
  id: string
  visitorName: string | null
  visitorEmail: string | null
  pageUrl: string | null
  status: string
  ticketId: string | null
  lastMessageAt: string
  createdAt: string
  _count: { messages: number }
}

interface Message {
  id: string
  fromRole: "visitor" | "bot" | "agent"
  text: string
  createdAt: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentType?: string | null
}

interface SessionDetail {
  id: string
  visitorName: string | null
  visitorEmail: string | null
  visitorPhone: string | null
  contactId: string | null
  pageUrl: string | null
  userAgent: string | null
  status: string
  ticketId: string | null
  assignedUserId: string | null
  messages: Message[]
}

interface Agent {
  id: string
  name: string
  email: string
}

export default function WebChatInboxPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}
  const t = useTranslations("webChat")

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("open")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [visitorTyping, setVisitorTyping] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const typingSentAt = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSeenLatest = useRef<number>(0)
  const lastMessageCount = useRef<number>(0)

  const playPing = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      osc.type = "sine"
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch {}
  }

  const loadSessions = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    const res = await fetch(`/api/v1/web-chat/sessions?${params}`, { headers })
    const data = await res.json()
    if (data.success) {
      const list: SessionItem[] = data.data.sessions
      // Detect genuinely-new activity: newer lastMessageAt than we've seen before
      const newestTs = list.reduce((m, s) => Math.max(m, new Date(s.lastMessageAt).getTime()), 0)
      if (lastSeenLatest.current > 0 && newestTs > lastSeenLatest.current) {
        const newest = list.find(s => new Date(s.lastMessageAt).getTime() === newestTs)
        if (newest && newest.id !== selectedId) {
          playPing()
          toast.message(t("newMessageFrom", { name: newest.visitorName || newest.visitorEmail || t("anonymous") }), {
            action: { label: t("open"), onClick: () => setSelectedId(newest.id) },
          })
        }
      }
      if (newestTs > lastSeenLatest.current) lastSeenLatest.current = newestTs
      setSessions(list)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, orgId, selectedId])

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/v1/web-chat/sessions/${id}`, { headers })
    const data = await res.json()
    if (data.success) setDetail(data.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    loadSessions()
    if (listPollRef.current) clearInterval(listPollRef.current)
    listPollRef.current = setInterval(loadSessions, 5000)
    // Fetch agents once for assign dropdown
    fetch("/api/v1/users", { headers })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAgents((d.data?.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
      })
      .catch(() => {})
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSessions])

  useEffect(() => {
    if (!selectedId) return
    loadDetail(selectedId)
    pollRef.current = setInterval(() => loadDetail(selectedId), 3000)
    const typingTick = async () => {
      try {
        const r = await fetch(`/api/v1/web-chat/sessions/${selectedId}/typing`, { headers })
        const d = await r.json()
        if (d.success) setVisitorTyping(!!d.data?.typing)
      } catch {}
    }
    typingTick()
    const typingId = setInterval(typingTick, 2500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearInterval(typingId)
      setVisitorTyping(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, loadDetail])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [detail?.messages?.length])

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/v1/web-chat/sessions/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ text: reply.trim() }),
      })
      if (res.ok) {
        setReply("")
        loadDetail(selectedId)
        loadSessions()
      }
    } finally {
      setSending(false)
    }
  }

  const assignAgent = async (id: string, userId: string | null) => {
    await fetch(`/api/v1/web-chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ assignedUserId: userId }),
    })
    if (selectedId === id) loadDetail(id)
  }

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/v1/web-chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ status }),
    })
    if (selectedId === id) loadDetail(id)
    loadSessions()
  }

  const escalate = async () => {
    if (!selectedId) return
    const res = await fetch(`/api/v1/web-chat/sessions/${selectedId}/escalate`, {
      method: "POST",
      headers,
    })
    const data = await res.json()
    if (data.success) {
      loadDetail(selectedId)
      loadSessions()
    } else {
      alert(data.error || "Escalation failed")
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar: sessions list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-sm">{t("inboxTitle")}</h2>
          </div>
          <div className="flex gap-1">
            {(["open", "escalated", "closed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wide ${
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                {t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">{t("noSessions")}</p>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedId === s.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {s.visitorName || s.visitorEmail || t("anonymous")}
                    </p>
                    {s.visitorEmail && s.visitorName && (
                      <p className="text-[11px] text-muted-foreground truncate">{s.visitorEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.status !== "open" && <Badge variant="secondary" className="text-[9px]">{s.status}</Badge>}
                    <span className="text-[10px] text-muted-foreground">{s._count.messages}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(s.lastMessageAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: conversation */}
      <div className="flex-1 flex flex-col">
        {!detail ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("selectPrompt")}
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold text-sm">{detail.visitorName || t("anonymous")}</p>
                  {detail.visitorEmail && (
                    <span className="text-xs text-muted-foreground">{detail.visitorEmail}</span>
                  )}
                  {detail.contactId && (
                    <a href={`/contacts/${detail.contactId}`} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:underline">
                      ↗ {t("linkedContact")}
                    </a>
                  )}
                </div>
                {detail.pageUrl && (
                  <a href={detail.pageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-0.5">
                    <Globe className="h-3 w-3" /> {detail.pageUrl}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={detail.assignedUserId || ""}
                  onChange={e => assignAgent(detail.id, e.target.value || null)}
                  className="h-8 text-xs rounded-md border px-2 bg-background"
                >
                  <option value="">{t("unassigned")}</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name || a.email}</option>
                  ))}
                </select>
                {detail.ticketId ? (
                  <a href={`/tickets/${detail.ticketId}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <TicketIcon className="h-3.5 w-3.5" /> {t("viewTicket")}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" size="sm" onClick={escalate} className="gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5" /> {t("escalateToTicket")}
                  </Button>
                )}
                {detail.status !== "closed" && (
                  <Button variant="outline" size="sm" onClick={() => changeStatus(detail.id, "closed")} className="gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> {t("close")}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {detail.messages.map(m => (
                <MessageBubble key={m.id} m={m} />
              ))}
              {visitorTyping && (
                <div className="flex justify-start">
                  <div className="bg-background border rounded-2xl px-3 py-2 text-xs text-muted-foreground">
                    {t("visitorTyping")}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t p-3 flex items-center gap-2 bg-background">
              <input
                value={reply}
                onChange={e => {
                  setReply(e.target.value)
                  if (selectedId && Date.now() - typingSentAt.current > 2000) {
                    typingSentAt.current = Date.now()
                    fetch(`/api/v1/web-chat/sessions/${selectedId}/typing`, {
                      method: "POST",
                      headers,
                    }).catch(() => {})
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendReply()
                  }
                }}
                placeholder={t("replyPlaceholder")}
                className="flex-1 rounded-lg border px-3 py-2 text-sm bg-background"
                disabled={detail.status === "closed"}
              />
              <Button
                onClick={sendReply}
                disabled={!reply.trim() || sending || detail.status === "closed"}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" /> {t("send")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ m }: { m: Message }) {
  const fromVisitor = m.fromRole === "visitor"
  const bgClass =
    m.fromRole === "visitor"
      ? "bg-background border"
      : m.fromRole === "agent"
        ? "bg-primary text-primary-foreground"
        : "bg-muted"
  return (
    <div className={`flex ${fromVisitor ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${bgClass}`}>
        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
          {m.fromRole}
        </div>
        {m.attachmentUrl ? (
          m.attachmentType?.startsWith("image/") ? (
            <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.attachmentUrl} alt={m.attachmentName || ""} className="rounded max-h-48 object-contain" />
            </a>
          ) : (
            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline block truncate">
              📎 {m.attachmentName || m.text}
            </a>
          )
        ) : (
          <div className="whitespace-pre-wrap">{m.text}</div>
        )}
        <div className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
