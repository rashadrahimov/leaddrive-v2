"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Globe, Mail, Phone, MapPin, Users, Pencil } from "lucide-react"
import { CompanyForm } from "@/components/company-form"

interface CompanyDetail {
  id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string | null
  status: string
  employeeCount: number | null
  description: string | null
  contacts: Array<{ id: string; fullName: string; position: string | null; email: string | null; phone: string | null }>
  deals: Array<{ id: string; name: string; stage: string; valueAmount: number; currency: string }>
  activities: Array<{ id: string; type: string; subject: string | null; createdAt: string }>
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const orgId = (session?.user as any)?.organizationId

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/v1/companies/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) setCompany(json.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { if (params.id) fetchCompany() }, [params.id, session])

  if (loading) {
    return <div className="space-y-6"><div className="animate-pulse"><div className="h-64 bg-muted rounded-lg" /></div></div>
  }

  if (!company) {
    return <div className="text-center py-12 text-muted-foreground">Company not found</div>
  }

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
                <span>{company.industry || "No industry"}</span>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>{company.status}</Badge>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {company.website ? <a href={company.website} className="text-sm text-primary hover:underline" target="_blank">{company.website.replace("https://", "")}</a> : <span className="text-sm text-muted-foreground">—</span>}
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{company.phone || "—"}</span></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{company.email || "—"}</span></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{[company.address, company.city].filter(Boolean).join(", ") || "—"}</span></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({company.contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({company.deals?.length || 0})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({company.activities?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{company.description || "No description"}</p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div><span className="text-muted-foreground">Industry:</span><span className="ml-2 font-medium">{company.industry || "—"}</span></div>
                <div><span className="text-muted-foreground">Employees:</span><span className="ml-2 font-medium">{company.employeeCount || "—"}</span></div>
                <div><span className="text-muted-foreground">Country:</span><span className="ml-2 font-medium">{company.country || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span><Badge variant="default" className="ml-2">{company.status}</Badge></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(company.contacts || []).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contacts/${contact.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {contact.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{contact.fullName}</div>
                        <div className="text-xs text-muted-foreground">{contact.position || "—"}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{contact.email || ""}</div>
                      <div>{contact.phone || ""}</div>
                    </div>
                  </div>
                ))}
                {(company.contacts || []).length === 0 && <div className="text-sm text-muted-foreground">No contacts</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Deals</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(company.deals || []).map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium text-sm">{deal.name}</div>
                      <Badge variant="outline" className="mt-1">{deal.stage}</Badge>
                    </div>
                    <span className="font-semibold text-primary">
                      {deal.valueAmount > 0 ? `${deal.valueAmount.toLocaleString()} ${deal.currency}` : "—"}
                    </span>
                  </div>
                ))}
                {(company.deals || []).length === 0 && <div className="text-sm text-muted-foreground">No deals</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activities</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(company.activities || []).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                      {activity.type === "meeting" ? "🤝" : activity.type === "email" ? "📧" : activity.type === "call" ? "📞" : "📝"}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.subject || activity.type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {(company.activities || []).length === 0 && <div className="text-sm text-muted-foreground">No activities</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompanyForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchCompany}
        orgId={orgId}
        initialData={{ id: company.id, name: company.name, industry: company.industry || "", website: company.website || "", phone: company.phone || "", email: company.email || "", address: company.address || "", city: company.city || "", country: company.country || "", status: company.status, description: company.description || "" }}
      />
    </div>
  )
}
