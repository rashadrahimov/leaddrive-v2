"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Archive, Trash2 } from "lucide-react"

const CONVERSATIONS = [
  { id: "1", contact: "Kamran Hasanov", subject: "Question about pricing", preview: "Hi, I'd like to know more...", unread: 2, date: "Today" },
  { id: "2", contact: "Tarlan Mammadli", subject: "Meeting confirmation", preview: "Can we move the meeting to...", unread: 0, date: "Yesterday" },
  { id: "3", contact: "Rashad Rahimov", subject: "Integration help", preview: "I'm having trouble with the API...", unread: 3, date: "Mar 18" },
  { id: "4", contact: "Farid Gulalizade", subject: "Demo feedback", preview: "Great demo! I have a few questions...", unread: 1, date: "Mar 17" },
  { id: "5", contact: "Jahan Pashayev", subject: "Contract review", preview: "Can you review the attached...", unread: 0, date: "Mar 16" },
]

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = CONVERSATIONS.filter(c =>
    c.contact.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  )

  const selectedConvo = CONVERSATIONS.find(c => c.id === selected)

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
          {filtered.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelected(conversation.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selected === conversation.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{conversation.contact}</div>
                {conversation.unread > 0 && (
                  <Badge variant="secondary" className="text-xs">{conversation.unread}</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">{conversation.subject}</div>
              <div className="text-xs text-muted-foreground mt-1">{conversation.date}</div>
            </div>
          ))}
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
              <p className="text-muted-foreground">Select a conversation to continue</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
