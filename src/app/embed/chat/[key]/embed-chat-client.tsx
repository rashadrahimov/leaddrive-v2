"use client"

import { useEffect, useRef, useState } from "react"
import { Send, MessageCircle, Paperclip, FileText } from "lucide-react"
import { t as tr, type WidgetLang } from "./widget-i18n"

interface Message {
  id: string
  fromRole: "visitor" | "bot" | "agent"
  text: string
  createdAt: number
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentType?: string | null
  attachmentSize?: number | null
}

interface Props {
  publicKey: string
  title: string
  greeting: string
  primaryColor: string
  organizationName: string
  online?: boolean
  offlineMessage?: string | null
  lang?: WidgetLang
}

const STORAGE_KEY_PREFIX = "ld_webchat_session_"

export function EmbedChatClient({ publicKey, title, greeting, primaryColor, organizationName, online = true, offlineMessage, lang = "en" }: Props) {
  const L = (key: string) => tr(lang, key)
  const storageKey = STORAGE_KEY_PREFIX + publicKey
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [started, setStarted] = useState(false)
  const [lastTs, setLastTs] = useState(0)
  const [agentTyping, setAgentTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingSentAt = useRef<number>(0)

  // Restore prior session from localStorage if still valid
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem(storageKey)
    if (!saved) return
    let parsed: { sessionId: string; expiresAt: number }
    try {
      parsed = JSON.parse(saved)
    } catch {
      localStorage.removeItem(storageKey)
      return
    }
    if (!parsed.sessionId || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey)
      return
    }
    // Verify the session still exists on server before activating.
    // On verified: activate. On explicit "not found" or "gone": clear cache.
    // On network/CORS failure: DON'T clear cache (visitor might be temporarily offline) —
    // but also don't auto-activate a session we couldn't verify. User can re-enter details.
    fetch(`/api/v1/public/web-chat/messages?sessionId=${parsed.sessionId}&after=0`)
      .then(async r => {
        if (r.ok) {
          const d = await r.json().catch(() => null)
          if (d?.success) {
            setSessionId(parsed.sessionId)
            setStarted(true)
          } else {
            localStorage.removeItem(storageKey)
          }
        } else if (r.status === 404 || r.status === 410 || r.status === 403) {
          localStorage.removeItem(storageKey)
        }
        // Other errors (5xx, network) — leave cache, show start form
      })
      .catch(() => {
        // Network error — leave cache, user falls into start form
      })
  }, [storageKey])

  const startSession = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/v1/public/web-chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: publicKey,
          visitorName: name || undefined,
          visitorEmail: email || undefined,
          pageUrl: typeof window !== "undefined" ? document.referrer : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.data.sessionId)
        setStarted(true)
        if (typeof window !== "undefined") {
          // Keep session for 7 days
          localStorage.setItem(
            storageKey,
            JSON.stringify({ sessionId: data.data.sessionId, expiresAt: Date.now() + 7 * 86400 * 1000 }),
          )
        }
      }
    } finally {
      setSending(false)
    }
  }

  // Poll agent typing indicator
  useEffect(() => {
    if (!sessionId) return
    const tick = async () => {
      try {
        const r = await fetch(`/api/v1/public/web-chat/typing?sessionId=${sessionId}`)
        const d = await r.json()
        if (d.success) setAgentTyping(!!d.data?.typing)
      } catch {}
    }
    tick()
    typingRef.current = setInterval(tick, 2500)
    return () => {
      if (typingRef.current) clearInterval(typingRef.current)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/public/web-chat/messages?sessionId=${sessionId}&after=${lastTs}`)
        const data = await res.json()
        if (data.success && data.data.messages.length) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id))
            const next = [...prev]
            for (const m of data.data.messages) {
              if (!ids.has(m.id)) next.push(m)
            }
            return next
          })
          const maxTs = Math.max(...data.data.messages.map((m: Message) => m.createdAt))
          setLastTs(maxTs)
        }
      } catch {}
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [sessionId, lastTs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleUpload = async (file: File) => {
    if (!sessionId || sending) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append("sessionId", sessionId)
      fd.append("file", file)
      const res = await fetch("/api/v1/public/web-chat/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || L("uploadFailed"))
      }
    } catch (e: any) {
      alert(e?.message || L("uploadFailed"))
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !sessionId || sending) return
    setInput("")
    setSending(true)

    const optimistic: Message = {
      id: "temp_" + Date.now(),
      fromRole: "visitor",
      text,
      createdAt: Date.now(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch("/api/v1/public/web-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text, lang }),
      })
      if (res.status === 410) {
        // Session closed by agent — drop saved session so user can start fresh
        if (typeof window !== "undefined") localStorage.removeItem(storageKey)
        setStarted(false)
        setSessionId(null)
        setMessages([])
        setSending(false)
        return
      }
      const data = await res.json()
      if (data.success) {
        const realMsg = { ...data.data.message, createdAt: new Date(data.data.message.createdAt).getTime() }
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== optimistic.id && m.id !== realMsg.id)
          return [...filtered, realMsg]
        })
        if (data.data.botReply) {
          const bot = {
            ...data.data.botReply,
            fromRole: "bot" as const,
            createdAt: new Date(data.data.botReply.createdAt).getTime(),
          }
          setMessages(prev => (prev.some(m => m.id === bot.id) ? prev : [...prev, bot]))
        }
      }
    } catch {}
    setSending(false)
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] opacity-80">{organizationName}</p>
        </div>
      </div>

      {!started ? (
        <div className="flex-1 p-4 space-y-3">
          {!online && offlineMessage && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
              {offlineMessage}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={L("nameOptional")}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={L("emailOptional")}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
          />
          <button
            onClick={startSession}
            disabled={sending}
            className="w-full rounded-lg text-white py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {sending ? L("starting") : L("startChat")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.fromRole === "visitor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.fromRole === "visitor"
                      ? "text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                  style={m.fromRole === "visitor" ? { backgroundColor: primaryColor } : undefined}
                >
                  {m.attachmentUrl ? (
                    m.attachmentType?.startsWith("image/") ? (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.attachmentUrl} alt={m.attachmentName || ""} className="rounded-md max-h-48 max-w-full object-contain" />
                      </a>
                    ) : (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 underline">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.attachmentName || m.text}</span>
                      </a>
                    )
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
            {agentTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2 text-sm rounded-bl-sm">
                  <span className="inline-flex gap-1 items-end h-4">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t p-2 flex items-center gap-2 bg-background">
            <label className="h-9 w-9 rounded-lg flex items-center justify-center border cursor-pointer hover:bg-muted shrink-0" title={L("attachFile")}>
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <input
                type="file"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                  e.target.value = ""
                }}
              />
            </label>
            <input
              value={input}
              onChange={e => {
                setInput(e.target.value)
                // Throttle typing POSTs to once every 2s
                if (sessionId && Date.now() - typingSentAt.current > 2000) {
                  typingSentAt.current = Date.now()
                  fetch("/api/v1/public/web-chat/typing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, role: "visitor" }),
                  }).catch(() => {})
                }
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={L("typeMessage")}
              className="flex-1 rounded-lg border px-3 py-2 text-sm bg-background"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white disabled:opacity-40"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
