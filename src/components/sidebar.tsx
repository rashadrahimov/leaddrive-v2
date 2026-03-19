"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { type ModuleId, hasModule } from "@/lib/modules"
import {
  LayoutDashboard, Building2, Users, Handshake, UserPlus,
  CheckSquare, FileText, FileSpreadsheet, Calculator, Brain,
  Ticket, BookOpen, BarChart3, Mail, MessageSquare, Zap,
  Settings, ChevronLeft, DollarSign, Target, Send,
  TrendingUp, Filter, Workflow, Server,
} from "lucide-react"
import { useState } from "react"

interface NavItem {
  module: ModuleId
  href: string
  icon: React.ElementType
  label: string
  group: string
}

const navItems: NavItem[] = [
  { module: "core", href: "/", icon: LayoutDashboard, label: "Dashboard", group: "CRM" },
  { module: "core", href: "/companies", icon: Building2, label: "Companies", group: "CRM" },
  { module: "core", href: "/contacts", icon: Users, label: "Contacts", group: "CRM" },
  { module: "deals", href: "/deals", icon: Handshake, label: "Deals", group: "CRM" },
  { module: "leads", href: "/leads", icon: UserPlus, label: "Leads", group: "CRM" },
  { module: "tasks", href: "/tasks", icon: CheckSquare, label: "Tasks", group: "CRM" },
  { module: "contracts", href: "/contracts", icon: FileText, label: "Contracts", group: "CRM" },
  { module: "campaigns", href: "/campaigns", icon: Mail, label: "Campaigns", group: "Marketing" },
  { module: "campaigns", href: "/segments", icon: Filter, label: "Segments", group: "Marketing" },
  { module: "campaigns", href: "/email-templates", icon: Send, label: "Email Templates", group: "Marketing" },
  { module: "campaigns", href: "/email-log", icon: FileText, label: "Email Log", group: "Marketing" },
  { module: "campaigns", href: "/campaign-roi", icon: TrendingUp, label: "Campaign ROI", group: "Marketing" },
  { module: "leads", href: "/lead-scoring", icon: Target, label: "AI Scoring", group: "Marketing" },
  { module: "leads", href: "/journeys", icon: Workflow, label: "Journeys", group: "Marketing" },
  { module: "omnichannel", href: "/inbox", icon: MessageSquare, label: "Inbox", group: "Communication" },
  { module: "tickets", href: "/tickets", icon: Ticket, label: "Tickets", group: "Support" },
  { module: "knowledge-base", href: "/knowledge-base", icon: BookOpen, label: "Knowledge Base", group: "Support" },
  { module: "profitability", href: "/profitability", icon: Calculator, label: "Profitability", group: "Analytics" },
  { module: "profitability", href: "/pricing", icon: DollarSign, label: "Pricing", group: "Analytics" },
  { module: "reports", href: "/reports", icon: BarChart3, label: "Reports", group: "Analytics" },
  { module: "ai", href: "/ai-command-center", icon: Brain, label: "AI Center", group: "Analytics" },
  { module: "workflows", href: "/settings/workflows", icon: Zap, label: "Workflows", group: "Settings" },
  { module: "core", href: "/settings/smtp-settings", icon: Server, label: "SMTP", group: "Settings" },
  { module: "core", href: "/settings", icon: Settings, label: "Settings", group: "Settings" },
]

interface SidebarProps {
  org: { plan: string; addons?: string[]; modules?: Record<string, boolean> }
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const filteredItems = navItems.filter((item) => hasModule(org, item.module))
  const groups = [...new Set(filteredItems.map((item) => item.group))]

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-primary">LeadDrive</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
            )}
            {filteredItems
              .filter((item) => item.group === group)
              .map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
