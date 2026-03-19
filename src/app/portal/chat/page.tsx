"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Brain, Send, User } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const INITIAL_MESSAGES: Message[] = [
  { id: "1", role: "assistant", content: "Hello! I'm your AI support assistant. How can I help you today? I can help with account issues, check ticket status, or search our knowledge base.", timestamp: "Just now" },
]

export default function PortalChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: input,
      timestamp: "Just now",
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: "I understand you're having an issue. Let me check our knowledge base and recent tickets for relevant information. In the meantime, could you provide more details about what you're experiencing?",
        timestamp: "Just now",
      }
      setMessages(prev => [...prev, aiMsg])
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-5 w-5" /> AI Support Chat
        </h1>
        <p className="text-sm text-muted-foreground">Get instant help from our AI assistant</p>
      </div>

      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-4 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
