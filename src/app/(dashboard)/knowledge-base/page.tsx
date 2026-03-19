"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { BookOpen, Plus, Search, Eye, Pencil, Calendar, Tag } from "lucide-react"

interface KbArticle {
  id: string
  title: string
  categoryId?: string
  status: "published" | "draft"
  viewCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export default function KnowledgeBasePage() {
  const { data: session } = useSession()
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const orgId = (session?.user as any)?.organizationId

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/v1/kb?limit=500", {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      const json = await res.json()
      if (json.success) {
        setArticles(json.data.articles)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchArticles() }, [session])

  const filtered = articles.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.tags.some(t => t.includes(search.toLowerCase()))) return false
    return true
  })

  const published = articles.filter(a => a.status === "published").length
  const totalViews = articles.reduce((s, a) => s + a.viewCount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">Manage help articles for your team and clients</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" /> New Article</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Articles" value={total} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard title="Published" value={published} />
        <StatCard title="Drafts" value={total - published} />
        <StatCard title="Total Views" value={totalViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles or tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-muted-foreground">No articles found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(article => (
            <Card key={article.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{article.title}</h3>
                      <Badge variant={article.status === "published" ? "default" : "secondary"}>
                        {article.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.viewCount}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(article.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {article.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-4">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
