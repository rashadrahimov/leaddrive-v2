"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, User, Send, Lock, Star } from "lucide-react"

interface TicketComment {
  id: string
  author: string
  authorAvatar: string
  content: string
  isInternal: boolean
  createdAt: string
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  waiting: { label: "Waiting", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
}

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
}

const MOCK_TICKET = {
  id: "TK-0042",
  subject: "Cannot access VPN after password reset",
  description: "After resetting my Active Directory password yesterday, I can no longer connect to the corporate VPN. The Palo Alto GlobalProtect client shows 'Authentication failed' error. I need VPN access urgently for a client presentation tomorrow.",
  status: "in_progress",
  priority: "high",
  company: "ZeytunPharma",
  contact: "Elvin Mammadov",
  contactEmail: "elvin@zeytunpharma.az",
  assignee: "Kamran Aliyev",
  assigneeAvatar: "KA",
  category: "VPN / Network",
  slaPolicy: "Business Critical",
  slaDeadline: "2026-03-19T18:00:00",
  slaTimeLeft: "4h 32m",
  slaBreached: false,
  createdAt: "2026-03-19 09:15",
  updatedAt: "2026-03-19 11:30",
  firstResponseAt: "2026-03-19 09:45",
}

const MOCK_COMMENTS: TicketComment[] = [
  {
    id: "1", author: "Elvin Mammadov", authorAvatar: "EM",
    content: "I reset my password through the self-service portal yesterday at 4 PM. VPN was working before that. The error message says 'Authentication failed - please check your credentials'.",
    isInternal: false, createdAt: "2026-03-19 09:15",
  },
  {
    id: "2", author: "Kamran Aliyev", authorAvatar: "KA",
    content: "Hi Elvin, thank you for reporting this. I can see your password was reset in AD at 16:02 yesterday. Let me check the Palo Alto logs for your connection attempts.",
    isInternal: false, createdAt: "2026-03-19 09:45",
  },
  {
    id: "3", author: "Kamran Aliyev", authorAvatar: "KA",
    content: "[INTERNAL] Checked PA logs — his old session is still cached. Need to flush the user session from GlobalProtect gateway. Escalating to InfoSec team for gateway access.",
    isInternal: true, createdAt: "2026-03-19 10:15",
  },
  {
    id: "4", author: "Nigar Hasanova", authorAvatar: "NH",
    content: "[INTERNAL] Flushed the cached session from GP gateway. The user should be able to reconnect now. Also added a KB article about this common issue after AD password resets.",
    isInternal: true, createdAt: "2026-03-19 11:30",
  },
]

export default function TicketDetailPage() {
  const params = useParams()
  const [newComment, setNewComment] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [showInternal, setShowInternal] = useState(true)

  const t = MOCK_TICKET
  const statusStyle = STATUS_STYLES[t.status] || STATUS_STYLES.open
  const priorityStyle = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium
  const filteredComments = showInternal ? MOCK_COMMENTS : MOCK_COMMENTS.filter(c => !c.isInternal)

  const handleSendComment = () => {
    if (!newComment.trim()) return
    // TODO: API call
    setNewComment("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
          <Badge className={priorityStyle.className}>{priorityStyle.label}</Badge>
          <span className="text-sm text-muted-foreground font-mono">{t.id}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t.subject}</CardTitle>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Comments ({filteredComments.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowInternal(!showInternal)}>
                <Lock className="h-3.5 w-3.5 mr-1" />
                {showInternal ? "Hide Internal" : "Show Internal"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredComments.map(comment => (
                <div key={comment.id} className={`flex gap-3 ${comment.isInternal ? "bg-amber-50/50 dark:bg-amber-950/20 -mx-3 px-3 py-2 rounded" : ""}`}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {comment.authorAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                      {comment.isInternal && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          <Lock className="h-2.5 w-2.5 mr-0.5" /> Internal
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={isInternal ? "Add internal note..." : "Reply to customer..."}
                    className="flex-1"
                    onKeyDown={e => e.key === "Enter" && handleSendComment()}
                  />
                  <Button variant={isInternal ? "outline" : "default"} size="sm" onClick={() => setIsInternal(!isInternal)}>
                    <Lock className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" onClick={handleSendComment}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Send
                  </Button>
                </div>
                {isInternal && (
                  <p className="text-xs text-amber-600 mt-1">Internal note — not visible to customer</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <Badge className={priorityStyle.className}>{priorityStyle.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{t.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{t.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{t.updatedAt}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">People</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Assignee</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                    {t.assigneeAvatar}
                  </div>
                  <span className="font-medium">{t.assignee}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Contact</span>
                <p className="font-medium">{t.contact}</p>
                <p className="text-xs text-muted-foreground">{t.contactEmail}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Company</span>
                <p className="font-medium">{t.company}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> SLA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy</span>
                <span>{t.slaPolicy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Left</span>
                <span className={`font-mono font-medium ${t.slaBreached ? "text-red-600" : "text-green-600"}`}>
                  {t.slaTimeLeft}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First Response</span>
                <span className="text-green-600">30 min</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-3.5 w-3.5" /> CSAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Not yet rated — survey sent after resolution</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
