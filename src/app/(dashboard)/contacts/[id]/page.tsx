"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Mail, Phone, Building2, Pencil, Calendar, MessageSquare } from "lucide-react"

interface Activity {
  id: string
  type: string
  subject?: string
  description?: string
  createdAt: string
}

interface Deal {
  id: string
  name: string
  stage: string
  valueAmount: number
}

interface Task {
  id: string
  title: string
  status: string
  dueDate?: string
}

interface Contact {
  id: string
  fullName: string
  email?: string
  phone?: string
  position?: string
  department?: string
  source?: string
  tags: string[]
  isActive: boolean
  lastContactAt?: string
  company?: { id: string; name: string }
  activities?: Activity[]
}

const activityIcons: Record<string, string> = {
  email: "📧", call: "📞", meeting: "🤝", note: "📝", task: "✅",
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const id = params.id as string
  const orgId = session?.user?.organizationId

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await fetch(`/api/v1/contacts/${id}`, {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) {
          setContact(json.data)
        }
      } catch {} finally {
        setLoading(false)
      }
    }

    if (id && session) {
      fetchContact()
    }
  }, [id, session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Contact not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = contact.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)

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
                      onClick={() => router.push(`/companies/${contact.company!.id}`)}
                      className="text-primary hover:underline"
                    >
                      {contact.company!.name}
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
          <TabsTrigger value="activities">Activities ({contact.activities?.length || 0})</TabsTrigger>
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
              {contact.activities && contact.activities.length > 0 ? (
                <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                  {contact.activities.map((activity) => (
                    <div key={activity.id} className="relative">
                      <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-background border text-xs">
                        {activityIcons[activity.type] || "📌"}
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{activity.subject || "Activity"}</span>
                          <span className="text-xs text-muted-foreground">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No activities yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="ml-2 font-medium">{contact.source || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <span className="ml-2 font-medium">{contact.department || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="ml-2">{contact.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Company:</span>
                  <span className="ml-2 font-medium">{contact.company?.name || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
