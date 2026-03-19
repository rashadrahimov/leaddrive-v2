"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { BookOpen, Plus, Search, Eye, Pencil, Calendar, Tag } from "lucide-react"

interface KbArticle {
  id: string
  title: string
  category: string
  status: "published" | "draft"
  author: string
  excerpt: string
  views: number
  createdAt: string
  updatedAt: string
  tags: string[]
}

const CATEGORIES = ["Getting Started", "VPN & Network", "Email & Calendar", "Security", "Hardware", "Software", "Account Management"]

const MOCK_ARTICLES: KbArticle[] = [
  {
    id: "1", title: "How to Reset Your VPN Connection After Password Change",
    category: "VPN & Network", status: "published", author: "Nigar Hasanova",
    excerpt: "If your VPN stops working after an Active Directory password reset, follow these steps to flush the cached session and reconnect...",
    views: 342, createdAt: "2026-03-19", updatedAt: "2026-03-19", tags: ["vpn", "password", "palo-alto"],
  },
  {
    id: "2", title: "Setting Up Two-Factor Authentication (2FA)",
    category: "Security", status: "published", author: "Kamran Aliyev",
    excerpt: "This guide walks you through enabling 2FA on your LeadDrive account using Google Authenticator or any TOTP-compatible app...",
    views: 567, createdAt: "2026-02-15", updatedAt: "2026-03-01", tags: ["2fa", "security", "authentication"],
  },
  {
    id: "3", title: "Requesting New Hardware: Laptop & Monitor Process",
    category: "Hardware", status: "published", author: "Rashad Rahimov",
    excerpt: "To request new hardware, submit a ticket in the Hardware category. Include your department, justification, and preferred specifications...",
    views: 189, createdAt: "2026-01-20", updatedAt: "2026-02-10", tags: ["hardware", "laptop", "procurement"],
  },
  {
    id: "4", title: "Configuring Outlook for Corporate Email",
    category: "Email & Calendar", status: "published", author: "Kamran Aliyev",
    excerpt: "Step-by-step instructions for setting up your corporate email in Microsoft Outlook, including server settings and troubleshooting...",
    views: 823, createdAt: "2025-12-05", updatedAt: "2026-01-15", tags: ["email", "outlook", "exchange"],
  },
  {
    id: "5", title: "Employee Onboarding: IT Setup Checklist",
    category: "Getting Started", status: "published", author: "Nigar Hasanova",
    excerpt: "Complete checklist for new employees: AD account creation, VPN setup, email configuration, software installation, security training...",
    views: 1205, createdAt: "2025-11-10", updatedAt: "2026-03-01", tags: ["onboarding", "new-employee", "checklist"],
  },
  {
    id: "6", title: "Installing Cortex XDR Agent on Your Workstation",
    category: "Security", status: "draft", author: "Nigar Hasanova",
    excerpt: "Guide for installing and configuring the Cortex XDR endpoint agent. Includes troubleshooting common installation errors...",
    views: 0, createdAt: "2026-03-18", updatedAt: "2026-03-18", tags: ["cortex", "xdr", "endpoint"],
  },
]

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filtered = MOCK_ARTICLES.filter(a => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.tags.some(t => t.includes(search.toLowerCase()))) return false
    return true
  })

  const published = MOCK_ARTICLES.filter(a => a.status === "published").length
  const totalViews = MOCK_ARTICLES.reduce((s, a) => s + a.views, 0)

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
        <StatCard title="Total Articles" value={MOCK_ARTICLES.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard title="Published" value={published} />
        <StatCard title="Drafts" value={MOCK_ARTICLES.length - published} />
        <StatCard title="Total Views" value={totalViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles or tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
        {filtered.map(article => (
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
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {article.category}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.views}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {article.updatedAt}</span>
                    <span>By {article.author}</span>
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
        ))}
      </div>
    </div>
  )
}
