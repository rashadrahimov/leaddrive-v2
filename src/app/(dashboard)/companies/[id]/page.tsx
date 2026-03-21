"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Globe, Mail, Phone, MapPin, Users, Pencil, DollarSign, Loader2, ChevronDown, ChevronRight } from "lucide-react"
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
  const [pricingProfile, setPricingProfile] = useState<any>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSales, setPricingSales] = useState<any[]>([])
  const [expandedPricingCats, setExpandedPricingCats] = useState<Set<string>>(new Set())
  const orgId = session?.user?.organizationId

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/v1/companies/${params.id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success && json.data) setCompany(json.data)
    } catch {} finally { setLoading(false) }
  }

  const fetchPricing = async () => {
    if (!orgId) return
    setPricingLoading(true)
    try {
      const headers = { "x-organization-id": String(orgId) }
      const res = await fetch(`/api/v1/pricing/profiles?companyId=${params.id}&all=true`, { headers })
      const json = await res.json()
      if (json.success && json.data.profiles?.length > 0) {
        const profile = json.data.profiles[0]
        setPricingProfile(profile)
        // Fetch additional sales for this profile
        const salesRes = await fetch(`/api/v1/pricing/additional-sales?profileId=${profile.id}`, { headers })
        const salesJson = await salesRes.json()
        if (salesJson.success) setPricingSales(salesJson.data.sales || [])
      }
    } catch { /* ignore */ }
    finally { setPricingLoading(false) }
  }

  useEffect(() => { if (params.id) fetchCompany() }, [params.id, session])
  useEffect(() => { if (params.id && orgId) fetchPricing() }, [params.id, orgId])

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
          <TabsTrigger value="pricing">
            <DollarSign className="h-3.5 w-3.5 mr-1" /> Pricing
          </TabsTrigger>
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
                        {contact.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
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

        <TabsContent value="pricing" className="space-y-4">
          {pricingLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !pricingProfile ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Для этой компании нет данных ценообразования.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Profile summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground">Код</div>
                  <div className="text-lg font-bold">{pricingProfile.companyCode}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground">Группа</div>
                  <div className="text-lg font-bold">{pricingProfile.group?.name || "—"}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground">Ежемесячно</div>
                  <div className="text-lg font-bold text-green-600">{pricingProfile.monthlyTotal?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground">Ежегодно</div>
                  <div className="text-lg font-bold">{pricingProfile.annualTotal?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</div>
                </CardContent></Card>
              </div>

              {/* Categories and services */}
              <Card>
                <CardHeader><CardTitle className="text-base">Услуги по категориям</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(pricingProfile.categories || []).map((pc: any) => {
                    const isExpanded = expandedPricingCats.has(pc.id)
                    return (
                      <div key={pc.id} className="border rounded-lg">
                        <button
                          onClick={() => {
                            const next = new Set(expandedPricingCats)
                            if (next.has(pc.id)) next.delete(pc.id); else next.add(pc.id)
                            setExpandedPricingCats(next)
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="text-sm font-medium">{pc.category?.name || "—"}</span>
                            <span className="text-xs text-muted-foreground">({pc.services?.length || 0} услуг)</span>
                          </div>
                          <span className="text-sm font-mono font-medium text-green-600">{pc.total?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</span>
                        </button>
                        {isExpanded && pc.services?.length > 0 && (
                          <div className="px-3 pb-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground text-xs">
                                  <th className="text-left pb-1">Услуга</th>
                                  <th className="text-center pb-1 w-24">Единица</th>
                                  <th className="text-center pb-1 w-16">Кол-во</th>
                                  <th className="text-right pb-1 w-24">Цена</th>
                                  <th className="text-right pb-1 w-24">Итого</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pc.services.map((svc: any) => (
                                  <tr key={svc.id} className="border-t">
                                    <td className="py-1.5">{svc.name}</td>
                                    <td className="py-1.5 text-center text-xs text-muted-foreground">{svc.unit}</td>
                                    <td className="py-1.5 text-center font-mono">{svc.qty}</td>
                                    <td className="py-1.5 text-right font-mono">{svc.price?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</td>
                                    <td className="py-1.5 text-right font-mono font-medium">{svc.total?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {(pricingProfile.categories || []).length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">Нет категорий</div>
                  )}
                </CardContent>
              </Card>

              {/* Additional sales */}
              {pricingSales.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Допродажи ({pricingSales.length})</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Тип</th>
                          <th className="pb-2 pr-4">Название</th>
                          <th className="pb-2 pr-4 text-right">Итого</th>
                          <th className="pb-2 pr-4">Дата</th>
                          <th className="pb-2">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingSales.map((sale: any) => (
                          <tr key={sale.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">
                              <Badge className={sale.type === "recurring" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                                {sale.type === "recurring" ? "MRR" : "Единоразовая"}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4">{sale.name}</td>
                            <td className="py-2 pr-4 text-right font-mono font-medium">{sale.total?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₼</td>
                            <td className="py-2 pr-4 text-xs">{sale.effectiveDate ? new Date(sale.effectiveDate).toLocaleDateString("ru-RU") : "—"}</td>
                            <td className="py-2">
                              <Badge variant="outline" className={sale.status === "active" ? "text-green-600 border-green-300" : "text-gray-600 border-gray-300"}>
                                {sale.status === "active" ? "Активна" : sale.status === "cancelled" ? "Отменена" : "Завершена"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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
