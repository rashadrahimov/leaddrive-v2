"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, TicketPlus } from "lucide-react"
import { useRouter } from "next/navigation"

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

export default function PortalChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = input
    setInput("")
    setSending(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMsg,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const res = await fetch("/api/v1/public/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId }),
      })
      const json = await res.json()
      if (json.success && json.data?.reply) {
        if (json.data.sessionId) setSessionId(json.data.sessionId)
        const reply = json.data.reply
        setMessages(prev => [...prev, {
          id: reply.id || (Date.now() + 1).toString(),
          role: "assistant",
          content: typeof reply === "string" ? reply : (reply.content || "..."),
          createdAt: reply.createdAt || new Date().toISOString(),
          suggestTicket: json.data.suggestTicket || false,
          escalated: json.data.escalated || false,
          escalationTicketId: json.data.escalationTicketId || null,
          escalationTicketNumber: json.data.escalationTicketNumber || null,
        }])
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: json.error || "Something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date().toISOString(),
      }])
    } finally { setSending(false) }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Support Chat</h1>
        <p className="text-muted-foreground text-sm">Ask questions or get help with your account</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Start a conversation with our AI support assistant</p>
              <p className="text-xs mt-1">Ask about tickets, services, or general questions</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="max-w-[70%]">
                <div className={`rounded-lg p-3 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "opacity-70" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {msg.escalated && msg.escalationTicketId && (
                  <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-red-700 mb-1">Разговор передан оператору</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-100"
                      onClick={() => router.push(`/portal/tickets/${msg.escalationTicketId}`)}
                    >
                      <TicketPlus className="h-3.5 w-3.5 mr-1" /> Тикет {msg.escalationTicketNumber || `#${msg.escalationTicketId?.slice(0, 8)}`}
                    </Button>
                  </div>
                )}
                {msg.suggestTicket && !msg.escalated && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                    onClick={() => router.push("/portal/tickets")}
                  >
                    <TicketPlus className="h-3.5 w-3.5 mr-1" /> Создать тикет
                  </Button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Typing...</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
