"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Mail, Phone, Building2, Pencil, Calendar, MessageSquare } from "lucide-react"

const MOCK_CONTACT = {
  id: "1",
  fullName: "Rashad Rahimov",
  email: "rashad.rahimov@zeytunpharma.az",
  phone: "+994512060838",
  position: "IT Manager",
  department: "IT",
  company: { id: "1", name: "Zeytun Pharma" },
  source: "referral",
  tags: ["vip", "decision-maker"],
  isActive: true,
  lastContactAt: "2026-03-16",
  activities: [
    { id: "1", type: "email", subject: "Proposal sent", date: "2026-03-16", description: "Sent updated pricing proposal" },
    { id: "2", type: "call", subject: "Follow-up call", date: "2026-03-14", description: "Discussed implementation timeline" },
    { id: "3", type: "meeting", subject: "Initial meeting at GT office", date: "2026-03-10", description: "Product demo and requirements gathering" },
  ],
  deals: [
    { id: "2", name: "GT-OFF-2026-005 — ZEYTUN", stage: "PROPOSAL", valueAmount: 16284 },
  ],
  tasks: [
    { id: "1", title: "Send contract draft", status: "pending", dueDate: "2026-03-22" },
  ],
}

const activityIcons: Record<string, string> = {
  email: "📧", call: "📞", meeting: "🤝", note: "📝", task: "✅",
}

export default function ContactDetailPage() {
  const router = useRouter()
  const contact = MOCK_CONTACT

  const initials = contact.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contact.fullName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{contact.position}</span>
                {contact.company && (
                  <>
                    <span>at</span>
                    <button
                      onClick={() => router.push(`/companies/${contact.company.id}`)}
                      className="text-primary hover:underline"
                    >
                      {contact.company.name}
                    </button>
                  </>
                )}
              </div>
              <div className="mt-1 flex gap-1">
                {contact.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">{contact.email}</a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{contact.phone}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Last contact: {contact.lastContactAt}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities ({contact.activities.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({contact.deals.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({contact.tasks.length})</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <Button size="sm">
                <MessageSquare className="h-4 w-4" />
                Log Activity
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                {contact.activities.map((activity) => (
                  <div key={activity.id} className="relative">
                    <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-background border text-xs">
                      {activityIcons[activity.type] || "📌"}
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{activity.subject}</span>
                        <span className="text-xs text-muted-foreground">{activity.date}</span>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardContent className="pt-6">
              {contact.deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{deal.name}</div>
                    <Badge variant="outline" className="mt-1">{deal.stage}</Badge>
                  </div>
                  <span className="font-semibold text-primary">{deal.valueAmount.toLocaleString()} ₼</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              {contact.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.status === "completed" ? "secondary" : "outline"}>{task.status}</Badge>
                    <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Source:</span> <span className="ml-2 font-medium">{contact.source}</span></div>
                <div><span className="text-muted-foreground">Department:</span> <span className="ml-2 font-medium">{contact.department}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className="ml-2">{contact.isActive ? "Active" : "Inactive"}</Badge></div>
                <div><span className="text-muted-foreground">Company:</span> <span className="ml-2 font-medium">{contact.company?.name}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
