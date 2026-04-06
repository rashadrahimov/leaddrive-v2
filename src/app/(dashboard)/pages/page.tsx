"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageDescription } from "@/components/page-description"
import {
  Plus,
  Pencil,
  Globe,
  GlobeLock,
  Eye,
  FileText,
  Loader2,
  ExternalLink,
  Trash2,
  BarChart3,
} from "lucide-react"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface LandingPage {
  id: string
  name: string
  slug: string
  status: string
  description?: string
  totalViews: number
  totalSubmissions: number
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

interface FormSubmission {
  id: string
  formData: Record<string, string>
  source?: string
  leadId?: string
  createdAt: string
  landingPage?: { name: string; slug: string }
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
}

export default function PagesListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [pages, setPages] = useState<LandingPage[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tab, setTab] = useState<"pages" | "submissions">("pages")
  const [analyticsPageId, setAnalyticsPageId] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<{ date: string; views: number; submissions: number }[] | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/v1/pages")
      if (res.ok) {
        const data = await res.json()
        setPages(data.pages || [])
      }
    } catch {
      toast.error("Failed to load pages")
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/v1/pages/submissions")
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions || [])
      }
    } catch {
      // Submissions endpoint may not exist yet
    }
  }

  const fetchAnalytics = async (pageId: string) => {
    setAnalyticsLoading(true)
    setAnalyticsData(null)
    try {
      const res = await fetch(`/api/v1/pages/${pageId}/analytics`)
      if (res.ok) {
        const json = await res.json()
        setAnalyticsData(json.data?.chartData || [])
      }
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const toggleAnalytics = (pageId: string) => {
    if (analyticsPageId === pageId) {
      setAnalyticsPageId(null)
      setAnalyticsData(null)
    } else {
      setAnalyticsPageId(pageId)
      fetchAnalytics(pageId)
    }
  }

  useEffect(() => {
    Promise.all([fetchPages(), fetchSubmissions()]).finally(() =>
      setLoading(false)
    )
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)

    try {
      const slug =
        newSlug.trim() ||
        newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")

      const res = await fetch("/api/v1/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create page")
      }

      const page = await res.json()
      toast.success("Page created")
      setCreateOpen(false)
      setNewName("")
      setNewSlug("")
      router.push(`/pages/${page.id}/edit`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create page")
    } finally {
      setCreating(false)
    }
  }

  const handleTogglePublish = async (page: LandingPage) => {
    try {
      if (page.status === "published") {
        // Unpublish
        const res = await fetch(`/api/v1/pages/${page.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        })
        if (!res.ok) throw new Error("Failed to unpublish")
        toast.success("Page unpublished")
      } else {
        // Publish
        const res = await fetch(`/api/v1/pages/${page.id}/publish`, {
          method: "POST",
        })
        if (!res.ok) throw new Error("Failed to publish")
        toast.success("Page published")
      }
      fetchPages()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      )
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/pages/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Page deleted")
      setDeleteId(null)
      fetchPages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page")
    }
  }

  const nameToSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  const conversionRate = (views: number, subs: number) =>
    views > 0 ? ((subs / views) * 100).toFixed(1) : "0.0"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
          <PageDescription text="Create and manage landing pages with a visual drag-and-drop builder." />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("pages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "pages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Pages ({pages.length})
        </button>
        <button
          onClick={() => setTab("submissions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "submissions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-1.5" />
          Submissions ({submissions.length})
        </button>
      </div>

      {/* Pages Grid */}
      {tab === "pages" && (
        <>
          {pages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create your first landing page with our visual builder to
                  start capturing leads.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Page
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <Card key={page.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {page.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          /p/{page.slug}
                        </p>
                      </div>
                      <Badge variant={statusConfig[page.status]?.variant || "secondary"}>
                        {statusConfig[page.status]?.label || page.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-semibold">
                          {page.totalViews}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Views
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {page.totalSubmissions}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Leads
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {conversionRate(
                            page.totalViews,
                            page.totalSubmissions
                          )}
                          %
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CVR
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          router.push(`/pages/${page.id}/edit`)
                        }
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant={
                          page.status === "published"
                            ? "secondary"
                            : "default"
                        }
                        size="sm"
                        className="flex-1"
                        onClick={() => handleTogglePublish(page)}
                      >
                        {page.status === "published" ? (
                          <>
                            <GlobeLock className="h-3.5 w-3.5 mr-1.5" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Globe className="h-3.5 w-3.5 mr-1.5" />
                            Publish
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => toggleAnalytics(page.id)}
                        title="View analytics"
                      >
                        <BarChart3 className={`h-3.5 w-3.5 ${analyticsPageId === page.id ? "text-primary" : ""}`} />
                      </Button>
                      {page.status === "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() =>
                            window.open(`/p/${page.slug}`, "_blank")
                          }
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(page.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Analytics Chart */}
                    {analyticsPageId === page.id && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Views & Submissions (30 days)</p>
                        {analyticsLoading ? (
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : analyticsData && analyticsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={140}>
                            <AreaChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                interval="preserveStartEnd"
                              />
                              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} width={24} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  color: "hsl(var(--popover-foreground))",
                                  fontSize: 12,
                                }}
                                labelFormatter={(v: any) => String(v)}
                              />
                              <Area
                                type="monotone"
                                dataKey="views"
                                stroke="hsl(var(--chart-1))"
                                fill="hsl(var(--chart-1))"
                                fillOpacity={0.15}
                                strokeWidth={1.5}
                                name="Views"
                              />
                              <Area
                                type="monotone"
                                dataKey="submissions"
                                stroke="hsl(var(--chart-2))"
                                fill="hsl(var(--chart-2))"
                                fillOpacity={0.15}
                                strokeWidth={1.5}
                                name="Submissions"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-6">No view data yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Submissions Table */}
      {tab === "submissions" && (
        <Card>
          <CardContent className="p-0">
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No submissions yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Once visitors submit forms on your published landing pages,
                  their data will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Page</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Phone</th>
                      <th className="text-left p-3 font-medium">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className={`border-b hover:bg-muted/30 ${sub.leadId ? "cursor-pointer" : ""}`}
                        onClick={() => sub.leadId && router.push(`/leads/${sub.leadId}`)}
                        title={sub.leadId ? "Open linked lead" : undefined}
                      >
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.landingPage?.name || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.formData?.name || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.formData?.email || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.formData?.phone || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.formData?.company || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {sub.leadId ? (
                            <Badge variant="outline" className="text-xs text-primary">Lead</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                placeholder="e.g. Product Launch"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (!newSlug || newSlug === nameToSlug(newName)) {
                    setNewSlug(nameToSlug(e.target.value))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /p/
                </span>
                <Input
                  id="page-slug"
                  placeholder="product-launch"
                  value={newSlug}
                  onChange={(e) =>
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this page? This action cannot be
            undone. All associated views and form submissions will also be
            deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
