"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Archive, Trash2 } from "lucide-react"

interface Message {
  id: string
  contact: string
  subject: string
  preview: string
  unread: number
  date: string
}

export default function InboxPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const orgId = (session?.user as any)?.organizationId

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/v1/inbox", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) {
          setMessages(json.data.messages)
        }
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [session])

  const filtered = messages.filter(m =>
    m.contact.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  )

  const selectedConvo = messages.find(m => m.id === selected)

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex gap-6">
        <div className="w-80 animate-pulse">
          <div className="h-10 bg-muted rounded-lg mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
          </div>
        </div>
        <div className="flex-1 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      <div className="w-80 flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-2">
          {filtered.length > 0 ? (
            filtered.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelected(message.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selected === message.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">{message.contact}</div>
                  {message.unread > 0 && (
                    <Badge variant="secondary" className="text-xs">{message.unread}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{message.subject}</div>
                <div className="text-xs text-muted-foreground mt-1">{message.date}</div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">No messages</div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedConvo ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedConvo.contact}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedConvo.subject}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="bg-background p-3 rounded-lg max-w-xs">
                  <p className="text-sm">{selectedConvo.preview}</p>
                  <p className="text-xs text-muted-foreground mt-2">Earlier today</p>
                </div>
                <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs ml-auto">
                  <p className="text-sm">Thanks for reaching out! How can I help?</p>
                  <p className="text-xs opacity-70 mt-2">Today</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input placeholder="Type your message..." className="flex-1" />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">
                {messages.length === 0
                  ? "No messages yet"
                  : "Select a conversation to continue"}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
