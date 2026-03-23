"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, X, Send, Loader2, Sparkles, Trash2, Brain } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const UI_TEXT: Record<string, { title: string; subtitle: string; greeting: string; placeholder: string; suggestions: string[] }> = {
  en: {
    title: "LeadDrive AI",
    subtitle: "Powered by Claude",
    greeting: "Ask me anything about your CRM data, deals, clients, or get help with analysis.",
    placeholder: "Ask LeadDrive AI...",
    suggestions: ["Summarize my sales pipeline", "Which deals are at risk?", "Top clients by revenue"],
  },
  ru: {
    title: "LeadDrive AI",
    subtitle: "На базе Claude",
    greeting: "Спроси меня о данных CRM, сделках, клиентах, или получи помощь с аналитикой.",
    placeholder: "Спросить LeadDrive AI...",
    suggestions: ["Сводка по воронке продаж", "Какие сделки под угрозой?", "Топ клиенты по выручке"],
  },
  az: {
    title: "LeadDrive AI",
    subtitle: "Claude əsasında",
    greeting: "CRM məlumatları, sövdələşmələr, müştərilər haqqında soruş və ya analitikada kömək al.",
    placeholder: "LeadDrive AI-dan soruş...",
    suggestions: ["Proses axınını ümumiləşdir", "Hansı sövdələşmələr risk altındadır?", "Gəlirə görə ən yaxşı müştərilər"],
  },
}

function getLocale(): string {
  if (typeof document === "undefined") return "ru"
  const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("NEXT_LOCALE="))
  return cookie?.split("=")[1] || "ru"
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
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        >
          <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[380px] bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
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
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-indigo-500" />
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
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
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
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
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
