"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Globe, Mail, Phone, MapPin, Users, Pencil } from "lucide-react"

// TODO: Replace with API call
const MOCK_COMPANY = {
  id: "1",
  name: "Zeytun Pharma",
  industry: "Pharmaceutical",
  website: "https://zeytunpharma.az",
  phone: "+99412 404 7885",
  email: "info@zeytunpharma.az",
  address: "Tebriz küç. 78",
  city: "Baku",
  country: "Azerbaijan",
  status: "active",
  employeeCount: 150,
  description: "Leading pharmaceutical company in Azerbaijan",
  contacts: [
    { id: "1", fullName: "Rashad Rahimov", position: "IT Manager", email: "rashad.rahimov@zeytunpharma.az", phone: "+994512060838" },
  ],
  deals: [
    { id: "1", name: "Zeytunpharma — New Deal", stage: "LEAD", valueAmount: 0 },
    { id: "2", name: "GT-OFF-2026-005 — ZEYTUN", stage: "PROPOSAL", valueAmount: 16284 },
  ],
  activities: [
    { id: "1", type: "meeting", subject: "Initial meeting", date: "2026-03-15" },
    { id: "2", type: "email", subject: "Proposal sent", date: "2026-03-16" },
  ],
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const company = MOCK_COMPANY // TODO: fetch by params.id

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/companies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{company.industry}</span>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>{company.status}</Badge>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a href={company.website} className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {company.website?.replace("https://", "")}
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{company.phone || "—"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{company.email || "—"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{company.address}, {company.city}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({company.contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({company.deals.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({company.activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{company.description || "No description"}</p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-muted-foreground">Industry:</span>
                  <span className="ml-2 font-medium">{company.industry}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Employees:</span>
                  <span className="ml-2 font-medium">{company.employeeCount || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Country:</span>
                  <span className="ml-2 font-medium">{company.country}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="ml-2">{company.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts</CardTitle>
              <Button size="sm">Add Contact</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {contact.fullName.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{contact.fullName}</div>
                        <div className="text-xs text-muted-foreground">{contact.position}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{contact.email}</div>
                      <div>{contact.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Deals</CardTitle>
              <Button size="sm">New Deal</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.deals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium text-sm">{deal.name}</div>
                      <Badge variant="outline" className="mt-1">{deal.stage}</Badge>
                    </div>
                    <span className="font-semibold text-primary">
                      {deal.valueAmount > 0 ? `${deal.valueAmount.toLocaleString()} ₼` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                      {activity.type === "meeting" ? "🤝" : activity.type === "email" ? "📧" : "📝"}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.subject}</div>
                      <div className="text-xs text-muted-foreground">{activity.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
