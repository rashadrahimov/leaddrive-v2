"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, X, Send, Loader2, Sparkles, Trash2, Brain, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"

interface AiAction {
  tool: string
  input: any
  status: "executed" | "pending_approval" | "failed"
  result?: any
  error?: string
  pendingActionId?: string
  riskLevel?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: AiAction[]
}

const TOOL_LABELS: Record<string, string> = {
  add_note: "Заметка",
  log_activity: "Активность",
  create_task: "Задача",
  update_deal_stage: "Стадия сделки",
  create_ticket: "Тикет",
  create_deal: "Сделка",
  send_email: "Email",
  update_contact: "Контакт",
}

const UI_TEXT: Record<string, { title: string; subtitle: string; greeting: string; placeholder: string; suggestions: string[]; approve: string; reject: string; approved: string; rejected: string; executed: string; failed: string; pending: string }> = {
  en: {
    title: "Da Vinci",
    subtitle: "Da Vinci texnologiyası",
    greeting: "Ask me anything about your CRM data, deals, clients, or get help with analysis.",
    placeholder: "Ask Da Vinci...",
    suggestions: ["Summarize my sales pipeline", "Which deals are at risk?", "Top clients by revenue"],
    approve: "Approve",
    reject: "Reject",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Done",
    failed: "Failed",
    pending: "Awaiting approval",
  },
  ru: {
    title: "Da Vinci",
    subtitle: "Da Vinci",
    greeting: "Спроси меня о данных CRM, сделках, клиентах, или получи помощь с аналитикой.",
    placeholder: "Спросить Da Vinci...",
    suggestions: ["Сводка по воронке продаж", "Какие сделки под угрозой?", "Топ клиенты по выручке"],
    approve: "Одобрить",
    reject: "Отклонить",
    approved: "Одобрено",
    rejected: "Отклонено",
    executed: "Выполнено",
    failed: "Ошибка",
    pending: "Ожидает одобрения",
  },
  az: {
    title: "Da Vinci",
    subtitle: "Da Vinci",
    greeting: "CRM məlumatları, sövdələşmələr, müştərilər haqqında soruş və ya analitikada kömək al.",
    placeholder: "Da Vinci-dan soruş...",
    suggestions: ["Proses axınını ümumiləşdir", "Hansı sövdələşmələr risk altındadır?", "Gəlirə görə ən yaxşı müştərilər"],
    approve: "Təsdiq et",
    reject: "İmtina et",
    approved: "Təsdiqləndi",
    rejected: "İmtina edildi",
    executed: "Tamamlandı",
    failed: "Xəta",
    pending: "Təsdiq gözləyir",
  },
}

function getLocale(): string {
  if (typeof document === "undefined") return "ru"
  const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("NEXT_LOCALE="))
  return cookie?.split("=")[1] || "ru"
}

function ActionCard({ action, t, onApprove, onReject }: {
  action: AiAction
  t: typeof UI_TEXT["ru"]
  onApprove: () => void
  onReject: () => void
}) {
  const label = TOOL_LABELS[action.tool] || action.tool

  if (action.status === "executed") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="text-emerald-700 dark:text-emerald-400">{t.executed}: {label}</span>
      </div>
    )
  }

  if (action.status === "failed") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-red-700 dark:text-red-400">{t.failed}: {label}</span>
      </div>
    )
  }

  // pending_approval
  return (
    <div className="px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-amber-700 dark:text-amber-400 font-medium">{t.pending}: {label}</span>
      </div>
      <div className="text-[11px] text-muted-foreground pl-5.5">
        {action.tool === "send_email" && action.input?.to && <span>To: {action.input.to}</span>}
        {action.tool === "update_contact" && <span>Fields: {Object.keys(action.input?.fields || {}).join(", ")}</span>}
      </div>
      <div className="flex gap-1.5 pl-5.5">
        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={onApprove}>
          {t.approve}
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-red-600 border-red-300 hover:bg-red-50" onClick={onReject}>
          {t.reject}
        </Button>
      </div>
    </div>
  )
}

export function AiAssistantPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [locale, setLocale] = useState("ru")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setLocale(getLocale()) }, [open])

  const t = UI_TEXT[locale] || UI_TEXT.ru

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleApproveAction = async (msgId: string, actionIndex: number, decision: "approve" | "reject") => {
    const msg = messages.find(m => m.id === msgId)
    const action = msg?.actions?.[actionIndex]
    if (!action?.pendingActionId) return

    try {
      const res = await fetch("/api/v1/ai/approve-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.pendingActionId, decision }),
      })
      const json = await res.json()

      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.actions) return m
        const newActions = [...m.actions]
        newActions[actionIndex] = {
          ...newActions[actionIndex],
          status: decision === "approve" && json.success ? "executed" : decision === "reject" ? "failed" : "pending_approval",
        }
        return { ...m, actions: newActions }
      }))
    } catch {
      // silently fail
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const pageContext = {
        url: window.location.pathname,
        title: document.title,
      }

      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: pageContext, history: messages.slice(-6), locale }),
      })
      const json = await res.json()

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: json.data?.reply || json.error || "No response",
        timestamp: new Date(),
        actions: json.data?.actions,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Connection error. Please try again.", timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group animate-pulse-glow"
        >
          <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[380px] glass-panel shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 ai-glow">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] text-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="text-[10px] opacity-80">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
                  onClick={() => setMessages([])}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
                onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--ai-from))]/10 to-[hsl(var(--ai-to))]/10 flex items-center justify-center mb-4 ai-glow">
                  <Sparkles className="h-8 w-8 text-[hsl(var(--ai-from))]" />
                </div>
                <h4 className="text-sm font-semibold mb-1">{t.title} Assistant</h4>
                <p className="text-xs text-muted-foreground mb-4">{t.greeting}</p>
                <div className="space-y-2 w-full">
                  {t.suggestions.map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); setTimeout(sendMessage, 100) }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] space-y-2`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-[hsl(var(--ai-from))]/5 border border-[hsl(var(--ai-from))]/10 rounded-bl-md"
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {/* Actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-1.5 ml-1">
                      {msg.actions.map((action, idx) => (
                        <ActionCard
                          key={idx}
                          action={action}
                          t={t}
                          onApprove={() => handleApproveAction(msg.id, idx, "approve")}
                          onReject={() => handleApproveAction(msg.id, idx, "reject")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--ai-from))]" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={t.placeholder}
                rows={1}
                className="flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--ai-from))] to-[hsl(var(--ai-to))] hover:opacity-90"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
