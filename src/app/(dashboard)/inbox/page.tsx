"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, MessageSquare } from "lucide-react"

interface ChannelMessage {
  id: string
  direction: string
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
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: ChannelMessage[]
}

export default function InboxPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [replyText, setReplyText] = useState("")
  const [replyChannel, setReplyChannel] = useState<string>("whatsapp")
  const [sending, setSending] = useState(false)
  const orgId = session?.user?.organizationId

  const fetchInbox = async () => {
    try {
      const res = await fetch("/api/v1/inbox", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setConversations(json.data.conversations || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchInbox() }, [session])

  const handleSendReply = async () => {
    if (!replyText.trim() || selected === null) return
    const convo = filtered[selected]
    if (!convo) return

    setSending(true)
    try {
      await fetch("/api/v1/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          to: convo.contactName,
          body: replyText,
          contactId: convo.contactId,
          channel: replyChannel,
        }),
      })
      setReplyText("")
      fetchInbox()
    } catch {} finally { setSending(false) }
  }

  const filtered = conversations.filter(c =>
    c.contactName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  const selectedConvo = selected !== null ? filtered[selected] : null

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
            filtered.map((convo, idx) => (
              <div
                key={idx}
                onClick={() => setSelected(idx)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selected === idx
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">{convo.contactName}</div>
                  {convo.unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{convo.unreadCount}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{convo.lastMessage}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(convo.lastMessageAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No conversations yet
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedConvo ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>{selectedConvo.contactName}</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedConvo.messages.length} messages</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-4 bg-muted/30 rounded-lg">
                {selectedConvo.messages.slice().reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg max-w-[70%] ${
                      msg.direction === "inbound"
                        ? "bg-background"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}
                  >
                    <p className="text-sm">{msg.body}</p>
                    <p className={`text-xs mt-1 ${msg.direction === "inbound" ? "text-muted-foreground" : "opacity-70"}`}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <select
                  value={replyChannel}
                  onChange={(e) => setReplyChannel(e.target.value)}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="telegram">Telegram</option>
                </select>
                <Input
                  placeholder="Написать сообщение..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {conversations.length === 0
                  ? "No messages yet. Messages from channels will appear here."
                  : "Select a conversation to continue"}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
