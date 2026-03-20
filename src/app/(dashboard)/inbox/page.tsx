"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Search, Send, MessageSquare, Mail, Phone, Trash2,
  Loader2, Plus, ArrowLeft, MessageCircle,
  Inbox as InboxIcon, ArrowDownLeft, ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ── */
interface ChannelMessage {
  id: string
  direction: string
  channelType: string
  from: string
  to: string
  subject?: string
  body: string
  status: string
  createdAt: string
}

interface Conversation {
  contactId: string | null
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  telegramChatId: string | null
  lastMessage: string
  lastMessageAt: string
  lastChannel: string
  unreadCount: number
  messageCount: number
  channels: string[]
  messages: ChannelMessage[]
}

interface Stats {
  totalMessages: number
  inbound: number
  outbound: number
  conversations: number
}

/* ── Channel helpers ── */
const channelIcon = (ch: string) => {
  switch (ch) {
    case "email": return <Mail className="h-3.5 w-3.5" />
    case "telegram": return <MessageCircle className="h-3.5 w-3.5" />
    case "sms": return <Phone className="h-3.5 w-3.5" />
    case "whatsapp": return <MessageCircle className="h-3.5 w-3.5" />
    default: return <MessageSquare className="h-3.5 w-3.5" />
  }
}

const channelColor = (ch: string) => {
  switch (ch) {
    case "email": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "telegram": return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
    case "sms": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "whatsapp": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    default: return "bg-gray-100 text-gray-700"
  }
}

const channelLabel = (ch: string) => {
  switch (ch) {
    case "email": return "Email"
    case "telegram": return "Telegram"
    case "sms": return "SMS"
    case "whatsapp": return "WhatsApp"
    default: return ch
  }
}

const CHANNELS = ["all", "email", "telegram", "sms", "whatsapp"] as const

/* ── Page ── */
export default function InboxPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<Stats>({ totalMessages: 0, inbound: 0, outbound: 0, conversations: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState("all")

  // Reply
  const [replyText, setReplyText] = useState("")
  const [replyChannel, setReplyChannel] = useState("email")
  const [sending, setSending] = useState(false)

  // Compose dialog
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeChannel, setComposeChannel] = useState("email")
  const [composeSending, setComposeSending] = useState(false)
  const [composeContactId, setComposeContactId] = useState("")

  // Contacts for compose picker
  interface ContactOption { id: string; fullName: string; email: string | null; phone: string | null }
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactsLoaded, setContactsLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchInbox = async () => {
    try {
      const params = channelFilter !== "all" ? `?channel=${channelFilter}` : ""
      const res = await fetch(`/api/v1/inbox${params}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setConversations(json.data.conversations || [])
        setStats(json.data.stats || { totalMessages: 0, inbound: 0, outbound: 0, conversations: 0 })
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchInbox() }, [session, channelFilter])

  // Fetch contacts for compose picker
  useEffect(() => {
    if (showCompose && !contactsLoaded) {
      fetch("/api/v1/contacts?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
        .then(r => r.json())
        .then(json => {
          const raw = json.data?.contacts || json.data || json.contacts || []
          const list = (Array.isArray(raw) ? raw : []).map((c: any) => ({
            id: c.id,
            fullName: c.fullName || c.name || "—",
            email: c.email || null,
            phone: c.phone || null,
          }))
          setContacts(list)
          setContactsLoaded(true)
        })
        .catch(() => {})
    }
  }, [showCompose])

  // Auto-poll every 5 seconds for new messages
  useEffect(() => {
    const interval = setInterval(() => { fetchInbox() }, 5000)
    return () => clearInterval(interval)
  }, [session, channelFilter])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selected, conversations])

  /* ── Reply ── */
  const handleSendReply = async () => {
    if (!replyText.trim() || selected === null) return
    const convo = filtered[selected]
    if (!convo) return

    // For telegram, try telegramChatId, then scan messages metadata for chatId
    let tgChatId = convo.telegramChatId
    if (!tgChatId && replyChannel === "telegram") {
      for (const msg of convo.messages) {
        const meta = (msg as any).metadata
        if (meta?.chatId) { tgChatId = meta.chatId; break }
      }
    }

    const to = replyChannel === "email"
      ? (convo.contactEmail || convo.contactName)
      : replyChannel === "sms"
        ? (convo.contactPhone || convo.contactName)
        : replyChannel === "telegram"
          ? (tgChatId || convo.contactName)
          : convo.contactName

    setSending(true)
    try {
      await fetch("/api/v1/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          to,
          body: replyText,
          contactId: convo.contactId,
          channel: replyChannel,
        }),
      })
      setReplyText("")
      fetchInbox()
    } catch {} finally { setSending(false) }
  }

  /* ── Compose ── */
  const handleCompose = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return
    setComposeSending(true)
    try {
      const res = await fetch("/api/v1/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          to: composeTo,
          body: composeBody,
          subject: composeSubject || undefined,
          channel: composeChannel,
          contactId: composeContactId || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowCompose(false)
        setComposeTo("")
        setComposeBody("")
        setComposeSubject("")
        setComposeContactId("")
        fetchInbox()
      }
    } catch {} finally { setComposeSending(false) }
  }

  /* ── Mark as read ── */
  const markAsRead = async (convo: Conversation) => {
    const unreadIds = convo.messages
      .filter(m => m.direction === "inbound" && m.status !== "read")
      .map(m => m.id)
    if (unreadIds.length === 0) return
    try {
      await fetch("/api/v1/inbox", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ messageIds: unreadIds }),
      })
      fetchInbox()
    } catch {}
  }

  /* ── Delete conversation ── */
  const deleteConvo = async (convo: Conversation) => {
    if (!confirm("Удалить этот диалог и все сообщения?")) return
    const ids = convo.messages.map(m => m.id)
    try {
      await fetch("/api/v1/inbox", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ messageIds: ids }),
      })
      setSelected(null)
      fetchInbox()
    } catch {}
  }

  /* ── Filtered list ── */
  const filtered = conversations.filter(c =>
    c.contactName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactEmail || "").toLowerCase().includes(search.toLowerCase())
  )

  const selectedConvo = selected !== null ? filtered[selected] : null

  /* ── Time formatter ── */
  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    }
    if (diff < 604800000) {
      return d.toLocaleDateString("ru-RU", { weekday: "short" })
    }
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
        <div className="h-[500px] bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <InboxIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Входящие</h1>
            <p className="text-sm text-muted-foreground">Omni-Channel — все каналы в одном месте</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4" /> Новое сообщение
        </Button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Сообщения", value: stats.totalMessages, icon: MessageSquare, color: "text-blue-600" },
          { label: "Входящие", value: stats.inbound, icon: ArrowDownLeft, color: "text-green-600" },
          { label: "Исходящие", value: stats.outbound, icon: ArrowUpRight, color: "text-orange-600" },
          { label: "Диалоги", value: stats.conversations, icon: MessageCircle, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <s.icon className={cn("h-4 w-4", s.color)} />
              {s.label}
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Channel filter tabs ── */}
      <div className="flex items-center gap-1 border-b pb-2">
        {CHANNELS.map(ch => (
          <button
            key={ch}
            onClick={() => { setChannelFilter(ch); setSelected(null) }}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              channelFilter === ch
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {ch === "all" ? "Все" : channelLabel(ch)}
          </button>
        ))}
      </div>

      {/* ── Main layout: conversation list + thread ── */}
      <div className="flex gap-4 h-[calc(100vh-380px)] min-h-[400px]">
        {/* ── Left: conversation list ── */}
        <div className="w-80 flex flex-col shrink-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск диалогов..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-1.5">
            {filtered.length > 0 ? (
              filtered.map((convo, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelected(idx)
                    setReplyChannel(convo.lastChannel || "email")
                    if (convo.unreadCount > 0) markAsRead(convo)
                  }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    selected === idx
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {/* Avatar circle */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        selected === idx ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {convo.contactName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{convo.contactName}</div>
                        {convo.contactEmail && (
                          <div className={cn("text-[10px] truncate", selected === idx ? "opacity-70" : "text-muted-foreground")}>
                            {convo.contactEmail}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {convo.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-[10px] h-5 min-w-5 justify-center">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className={cn("text-xs line-clamp-1 ml-10", selected === idx ? "opacity-80" : "text-muted-foreground")}>
                    {convo.lastMessage}
                  </div>

                  <div className="flex items-center justify-between mt-1.5 ml-10">
                    <div className="flex gap-1">
                      {convo.channels.map(ch => (
                        <span key={ch} className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium", channelColor(ch))}>
                          {channelIcon(ch)}
                        </span>
                      ))}
                    </div>
                    <span className={cn("text-[10px]", selected === idx ? "opacity-60" : "text-muted-foreground")}>
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                {conversations.length === 0 ? "Нет сообщений" : "Ничего не найдено"}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: message thread ── */}
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
          {selectedConvo ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="lg:hidden p-1 hover:bg-muted rounded"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {selectedConvo.contactName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{selectedConvo.contactName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {selectedConvo.contactEmail && <span>{selectedConvo.contactEmail}</span>}
                      {selectedConvo.contactPhone && <span>{selectedConvo.contactPhone}</span>}
                      <span>· {selectedConvo.messageCount} сообщ.</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConvo.channels.map(ch => (
                    <Badge key={ch} variant="outline" className="text-[10px] gap-1">
                      {channelIcon(ch)} {channelLabel(ch)}
                    </Badge>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                    onClick={() => deleteConvo(selectedConvo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConvo.messages.slice().reverse().map(msg => (
                  <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-xl px-4 py-2.5",
                      msg.direction === "outbound"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}>
                      {/* Channel badge */}
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] mb-1",
                        msg.direction === "outbound" ? "opacity-60" : "text-muted-foreground"
                      )}>
                        {channelIcon(msg.channelType || "email")}
                        {channelLabel(msg.channelType || "email")}
                        {msg.direction === "inbound" && <span>· от {msg.from}</span>}
                      </div>
                      {msg.subject && (
                        <div className={cn("text-xs font-medium mb-1", msg.direction === "outbound" ? "opacity-80" : "text-foreground")}>
                          {msg.subject}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <div className={cn(
                        "text-[10px] mt-1 flex items-center gap-1",
                        msg.direction === "outbound" ? "opacity-50 justify-end" : "text-muted-foreground"
                      )}>
                        {new Date(msg.createdAt).toLocaleString("ru-RU", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                        {msg.direction === "outbound" && (
                          <span className={cn(
                            "ml-1",
                            msg.status === "delivered" ? "text-green-300" : msg.status === "failed" ? "text-red-300" : ""
                          )}>
                            {msg.status === "delivered" ? "✓" : msg.status === "failed" ? "✗" : "⏳"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="px-4 py-3 border-t bg-muted/20">
                <div className="flex items-center gap-2">
                  <Select
                    value={replyChannel}
                    onChange={e => setReplyChannel(e.target.value)}
                    className="w-32 text-xs"
                  >
                    <option value="email">Email</option>
                    <option value="telegram">Telegram</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </Select>
                  <Input
                    placeholder="Написать сообщение..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <InboxIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">
                  {conversations.length === 0
                    ? "Нет сообщений"
                    : "Выберите диалог"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {conversations.length === 0
                    ? "Сообщения из Email, Telegram, SMS и WhatsApp появятся здесь"
                    : "Нажмите на диалог слева чтобы открыть переписку"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Compose dialog ── */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogHeader>
          <DialogTitle>Новое сообщение</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Контакт</Label>
              <Select
                value={composeContactId}
                onChange={e => {
                  const cid = e.target.value
                  setComposeContactId(cid)
                  const c = contacts.find(x => x.id === cid)
                  if (c) {
                    // Auto-fill `to` based on channel
                    if (composeChannel === "email" && c.email) setComposeTo(c.email)
                    else if (composeChannel === "sms" && c.phone) setComposeTo(c.phone)
                    else if (c.email) setComposeTo(c.email)
                    else if (c.phone) setComposeTo(c.phone)
                    else setComposeTo("")
                  }
                }}
                className="mt-1.5"
              >
                <option value="">— Выберите контакт —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}{c.email ? ` · ${c.email}` : ""}{c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Канал</Label>
              <Select
                value={composeChannel}
                onChange={e => {
                  const ch = e.target.value
                  setComposeChannel(ch)
                  // Re-fill `to` from selected contact
                  const c = contacts.find(x => x.id === composeContactId)
                  if (c) {
                    if (ch === "email" && c.email) setComposeTo(c.email)
                    else if (ch === "sms" && c.phone) setComposeTo(c.phone)
                    else if (ch === "telegram" && c.phone) setComposeTo(c.phone)
                    else if (c.email) setComposeTo(c.email)
                    else setComposeTo(composeTo)
                  }
                }}
                className="mt-1.5"
              >
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {composeChannel === "email" ? "Email адрес" : composeChannel === "sms" ? "Телефон" : composeChannel === "telegram" ? "Chat ID / Телефон" : "Адрес"}
              </Label>
              <Input
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                placeholder={composeChannel === "email" ? "user@example.com" : composeChannel === "sms" ? "+994..." : "Chat ID или телефон"}
                className="mt-1.5"
              />
            </div>
            {composeChannel === "email" && (
              <div>
                <Label className="text-sm font-medium">Тема</Label>
                <Input
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Тема письма..."
                  className="mt-1.5"
                />
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Сообщение</Label>
              <Textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Текст сообщения..."
                rows={4}
                className="mt-1.5"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCompose(false)}>Отмена</Button>
          <Button
            onClick={handleCompose}
            disabled={composeSending || !composeTo.trim() || !composeBody.trim()}
            className="gap-1.5"
          >
            {composeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {composeSending ? "Отправка..." : "Отправить"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
