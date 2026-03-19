"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Eye, ChevronRight } from "lucide-react"

const CATEGORIES = [
  { name: "Getting Started", count: 3, icon: "🚀" },
  { name: "VPN & Network", count: 5, icon: "🌐" },
  { name: "Email & Calendar", count: 4, icon: "📧" },
  { name: "Security", count: 6, icon: "🔒" },
  { name: "Hardware", count: 3, icon: "💻" },
  { name: "Software", count: 8, icon: "📦" },
]

const POPULAR_ARTICLES = [
  { id: "1", title: "Employee Onboarding: IT Setup Checklist", views: 1205, category: "Getting Started" },
  { id: "2", title: "Configuring Outlook for Corporate Email", views: 823, category: "Email & Calendar" },
  { id: "3", title: "Setting Up Two-Factor Authentication (2FA)", views: 567, category: "Security" },
  { id: "4", title: "How to Reset Your VPN Connection After Password Change", views: 342, category: "VPN & Network" },
  { id: "5", title: "Requesting New Hardware: Laptop & Monitor Process", views: 189, category: "Hardware" },
]

export default function PortalKBPage() {
  const [search, setSearch] = useState("")

  const filtered = search
    ? POPULAR_ARTICLES.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_ARTICLES

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8" /> Help Center
        </h1>
        <p className="text-muted-foreground">Find answers to common questions and troubleshooting guides</p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>

      {!search && (
        <div className="grid gap-3 md:grid-cols-3">
          {CATEGORIES.map(cat => (
            <Card key={cat.name} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} articles</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{search ? "Search Results" : "Popular Articles"}</h2>
        <div className="space-y-2">
          {filtered.map(article => (
            <Card key={article.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="pt-3 pb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{article.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{article.category}</Badge>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.views} views</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
