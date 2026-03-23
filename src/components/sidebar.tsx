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
  TrendingUp, Filter, Workflow, Server, Bell, CalendarDays, Headphones,
} from "lucide-react"
import { useState } from "react"
import { Logo } from "@/components/logo"
import { useTranslations } from "next-intl"

interface NavItem {
  module: ModuleId
  href: string
  icon: React.ElementType
  tKey: string
  group: string
}

const navItems: NavItem[] = [
  { module: "core", href: "/", icon: LayoutDashboard, tKey: "dashboard", group: "CRM" },
  { module: "core", href: "/companies", icon: Building2, tKey: "companies", group: "CRM" },
  { module: "core", href: "/contacts", icon: Users, tKey: "contacts", group: "CRM" },
  { module: "deals", href: "/deals", icon: Handshake, tKey: "deals", group: "CRM" },
  { module: "leads", href: "/leads", icon: UserPlus, tKey: "leads", group: "CRM" },
  { module: "tasks", href: "/tasks", icon: CheckSquare, tKey: "tasks", group: "CRM" },
  { module: "contracts", href: "/contracts", icon: FileText, tKey: "contracts", group: "CRM" },
  { module: "core", href: "/notifications", icon: Bell, tKey: "notifications", group: "CRM" },
  { module: "campaigns", href: "/campaigns", icon: Mail, tKey: "campaigns", group: "Marketing" },
  { module: "campaigns", href: "/segments", icon: Filter, tKey: "segments", group: "Marketing" },
  { module: "campaigns", href: "/email-templates", icon: Send, tKey: "emailTemplates", group: "Marketing" },
  { module: "campaigns", href: "/email-log", icon: FileText, tKey: "emailLog", group: "Marketing" },
  { module: "campaigns", href: "/campaign-roi", icon: TrendingUp, tKey: "campaignRoi", group: "Marketing" },
  { module: "leads", href: "/ai-scoring", icon: Target, tKey: "aiScoring", group: "Marketing" },
  { module: "leads", href: "/journeys", icon: Workflow, tKey: "journeys", group: "Marketing" },
  { module: "events", href: "/events", icon: CalendarDays, tKey: "events", group: "Marketing" },
  { module: "omnichannel", href: "/inbox", icon: MessageSquare, tKey: "inbox", group: "Communication" },
  { module: "tickets", href: "/tickets", icon: Ticket, tKey: "tickets", group: "Support" },
  { module: "tickets", href: "/support/agent-desktop", icon: Headphones, tKey: "agentDesktop", group: "Support" },
  { module: "knowledge-base", href: "/knowledge-base", icon: BookOpen, tKey: "knowledgeBase", group: "Support" },
  { module: "profitability", href: "/profitability", icon: Calculator, tKey: "profitability", group: "Analytics" },
  { module: "profitability", href: "/pricing", icon: DollarSign, tKey: "pricing", group: "Analytics" },
  { module: "reports", href: "/reports", icon: BarChart3, tKey: "reports", group: "Analytics" },
  { module: "ai", href: "/ai-command-center", icon: Brain, tKey: "aiCenter", group: "Analytics" },
  { module: "workflows", href: "/settings/workflows", icon: Zap, tKey: "workflows", group: "Settings" },
  { module: "core", href: "/settings/users", icon: Users, tKey: "users", group: "Settings" },
  { module: "core", href: "/settings/smtp-settings", icon: Server, tKey: "smtp", group: "Settings" },
  { module: "core", href: "/settings", icon: Settings, tKey: "settings", group: "Settings" },
]

interface SidebarProps {
  org: { plan: string; addons?: string[]; modules?: Record<string, boolean> }
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const t = useTranslations("nav")

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
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo collapsed={collapsed} size="sm" />
        </Link>
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
                {t(`groups.${group}`)}
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
                    title={collapsed ? t(item.tKey) : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t(item.tKey)}</span>}
                  </Link>
                )
              })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
