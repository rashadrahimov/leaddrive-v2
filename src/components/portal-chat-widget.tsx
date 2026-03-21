"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, X, Send, Bot, User, TicketPlus, Ticket, FileText, Loader2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  suggestTicket?: boolean
  escalated?: boolean
  escalationTicketId?: string | null
  escalationTicketNumber?: string | null
}

interface PortalChatWidgetProps {
  userName: string
}

export function PortalChatWidget({ userName }: PortalChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || sending) return
    setInput("")
    setSending(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const res = await fetch("/api/v1/public/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId }),
      })
      const json = await res.json()
      if (json.success) {
        if (json.data.sessionId) setSessionId(json.data.sessionId)
        const reply = json.data.reply
        setMessages(prev => [...prev, {
          id: reply.id || (Date.now() + 1).toString(),
          role: "assistant",
          content: reply.content || reply,
          createdAt: reply.createdAt || new Date().toISOString(),
          suggestTicket: json.data.suggestTicket || false,
          escalated: json.data.escalated || false,
          escalationTicketId: json.data.escalationTicketId || null,
          escalationTicketNumber: json.data.escalationTicketNumber || null,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <>
      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-20 right-5 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">LeadDrive AI</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/80 text-xs">Online</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div>
                  <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-800">
                      Salam, <strong>{userName}</strong>! Mən LeadDrive AI Assistant-am.
                    </p>
                    <p className="text-sm text-gray-800 mt-1">Nədə kömək edə bilərəm?</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(new Date().toISOString())}</p>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                )}
                <div className={msg.role === "user" ? "max-w-[75%]" : "max-w-[80%]"}>
                  <div className={`rounded-lg p-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-tr-none"
                      : "bg-white border border-gray-100 rounded-tl-none"
                  }`}>
                    <p className={`text-sm whitespace-pre-wrap ${msg.role === "assistant" ? "text-gray-800" : ""}`}>{msg.content}</p>
                  </div>
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-right" : ""} text-gray-400`}>
                    {formatTime(msg.createdAt)}
                  </p>
                  {msg.escalated && msg.escalationTicketId && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-[10px] font-medium text-red-700 mb-1">Разговор передан оператору</p>
                      <button
                        onClick={() => router.push(`/portal/tickets/${msg.escalationTicketId}`)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-100 transition-colors"
                      >
                        <TicketPlus className="h-3 w-3" /> Тикет {msg.escalationTicketNumber || `#${msg.escalationTicketId?.slice(0, 8)}`}
                      </button>
                    </div>
                  )}
                  {msg.suggestTicket && !msg.escalated && (
                    <button
                      onClick={() => router.push("/portal/tickets")}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-orange-600 border border-orange-200 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors"
                    >
                      <TicketPlus className="h-3 w-3" /> Создать тикет
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                    <span className="text-xs text-gray-500">Düşünür...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          {messages.length === 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto">
              <button
                onClick={() => handleSend("Tiketlərimi göstər")}
                className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap transition-colors"
              >
                <Ticket className="h-3 w-3" /> Tiketlərim
              </button>
              <button
                onClick={() => handleSend("Yeni tiket yaratmaq istəyirəm")}
                className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap transition-colors"
              >
                <TicketPlus className="h-3 w-3" /> Yeni tiket
              </button>
              <button
                onClick={() => handleSend("Müqavilələrimi göstər")}
                className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap transition-colors"
              >
                <FileText className="h-3 w-3" /> Müqavilələr
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Mesajınızı yazın..."
                disabled={sending}
                className="flex-1 text-sm text-gray-800 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 transition-colors placeholder:text-gray-400"
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg flex items-center justify-center z-50 transition-all hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
      </button>
    </>
  )
}
