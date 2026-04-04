"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { type ModuleId, hasModule } from "@/lib/modules"
import { isSidebarItemAccessible, getRequiredPlan } from "@/lib/plan-config"
import {
  LayoutDashboard, Building2, Users, Handshake, UserPlus,
  CheckSquare, FileText, FileSpreadsheet, Calculator, Brain,
  Ticket, BookOpen, BarChart3, Mail, MessageSquare, Zap,
  Settings, ChevronLeft, DollarSign, Target, Send,
  TrendingUp, Filter, Workflow, Server, Bell, CalendarDays, Headphones, Package,
  Lock, PiggyBank, FolderKanban, Wallet, MapPin, Route, Camera, AlertTriangle,
  ClipboardList, ShoppingCart, UserCog, GitBranch,
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
  { module: "core", href: "/dashboard", icon: LayoutDashboard, tKey: "dashboard", group: "CRM" },
  { module: "core", href: "/companies", icon: Building2, tKey: "companies", group: "CRM" },
  { module: "core", href: "/contacts", icon: Users, tKey: "contacts", group: "CRM" },
  { module: "deals", href: "/deals", icon: Handshake, tKey: "deals", group: "CRM" },
  { module: "leads", href: "/leads", icon: UserPlus, tKey: "leads", group: "CRM" },
  { module: "tasks", href: "/tasks", icon: CheckSquare, tKey: "tasks", group: "CRM" },
  { module: "contracts", href: "/contracts", icon: FileText, tKey: "contracts", group: "CRM" },
  { module: "core", href: "/products", icon: Package, tKey: "products", group: "CRM" },
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
  { module: "tickets", href: "/support/calendar", icon: CalendarDays, tKey: "agentCalendar", group: "Support" },
  { module: "knowledge-base", href: "/knowledge-base", icon: BookOpen, tKey: "knowledgeBase", group: "Support" },
  { module: "invoices", href: "/invoices", icon: FileSpreadsheet, tKey: "invoices", group: "Finance" },
  { module: "budgeting", href: "/finance", icon: Wallet, tKey: "finance", group: "Finance" },
  { module: "budgeting", href: "/budgeting", icon: PiggyBank, tKey: "budgeting", group: "Finance" },
  { module: "profitability", href: "/profitability", icon: Calculator, tKey: "profitability", group: "Finance" },
  { module: "profitability", href: "/pricing", icon: DollarSign, tKey: "pricing", group: "Finance" },
  { module: "reports", href: "/reports", icon: BarChart3, tKey: "reports", group: "Analytics" },
  { module: "ai", href: "/ai-command-center", icon: Brain, tKey: "aiCenter", group: "Analytics" },
  { module: "projects", href: "/projects", icon: FolderKanban, tKey: "projects", group: "ERP" },
  { module: "mtm", href: "/mtm", icon: MapPin, tKey: "mtmDashboard", group: "Route & Field" },
  { module: "mtm", href: "/mtm/map", icon: MapPin, tKey: "mtmMap", group: "Route & Field" },
  { module: "mtm", href: "/mtm/routes", icon: Route, tKey: "mtmRoutes", group: "Route & Field" },
  { module: "mtm", href: "/mtm/visits", icon: CheckSquare, tKey: "mtmVisits", group: "Route & Field" },
  { module: "mtm", href: "/mtm/tasks", icon: ClipboardList, tKey: "mtmTasks", group: "Route & Field" },
  { module: "mtm", href: "/mtm/customers", icon: Building2, tKey: "mtmCustomers", group: "Route & Field" },
  { module: "mtm", href: "/mtm/photos", icon: Camera, tKey: "mtmPhotos", group: "Route & Field" },
  { module: "mtm", href: "/mtm/alerts", icon: AlertTriangle, tKey: "mtmAlerts", group: "Route & Field" },
  { module: "mtm", href: "/mtm/orders", icon: ShoppingCart, tKey: "mtmOrders", group: "Route & Field" },
  { module: "mtm", href: "/mtm/agents", icon: UserCog, tKey: "mtmAgents", group: "Route & Field" },
  { module: "mtm", href: "/mtm/settings", icon: Settings, tKey: "mtmSettings", group: "Route & Field" },
  { module: "core", href: "/settings/pipelines", icon: GitBranch, tKey: "pipelines", group: "Settings" },
  { module: "workflows", href: "/settings/workflows", icon: Zap, tKey: "workflows", group: "Settings" },
  { module: "core", href: "/settings/users", icon: Users, tKey: "users", group: "Settings" },
  { module: "core", href: "/settings/smtp-settings", icon: Server, tKey: "smtp", group: "Settings" },
  { module: "core", href: "/settings", icon: Settings, tKey: "settings", group: "Settings" },
]

/* Salesforce Agentforce — dark navy sidebar with subtle accent colors */
const GROUP_ICON_COLOR: Record<string, string> = {
  CRM: "text-sky-400",
  Marketing: "text-orange-400",
  Communication: "text-blue-300",
  Support: "text-emerald-400",
  Finance: "text-amber-400",
  Analytics: "text-purple-400",
  ERP: "text-indigo-400",
  "Route & Field": "text-cyan-400",
  Settings: "text-slate-400",
}

const GROUP_LABEL_COLORS: Record<string, string> = {
  CRM: "text-sky-400/70",
  Marketing: "text-orange-400/70",
  Communication: "text-blue-300/70",
  Support: "text-emerald-400/70",
  Finance: "text-amber-400/70",
  Analytics: "text-purple-400/70",
  ERP: "text-indigo-400/70",
  "Route & Field": "text-cyan-400/70",
  Settings: "text-slate-400/70",
}

const GROUP_ACTIVE_BAR: Record<string, string> = {
  CRM: "before:bg-sky-400",
  Marketing: "before:bg-orange-400",
  Communication: "before:bg-blue-300",
  Support: "before:bg-emerald-400",
  Finance: "before:bg-amber-400",
  Analytics: "before:bg-purple-400",
  ERP: "before:bg-indigo-400",
  "Route & Field": "before:bg-cyan-400",
  Settings: "before:bg-slate-400",
}

interface SidebarProps {
  org: { plan: string; addons?: string[]; modules?: Record<string, boolean> }
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const t = useTranslations("nav")

  const plan = org.plan || "enterprise"

  // Filter by module system first, then annotate with plan accessibility
  const filteredItems = navItems
    .filter((item) => hasModule(org, item.module))
    .map((item) => ({
      ...item,
      locked: !isSidebarItemAccessible(plan, item.href),
      requiredPlan: getRequiredPlan(item.href),
    }))

  // Only show groups that have at least one accessible item
  const accessibleItems = filteredItems.filter((item) => !item.locked)
  const groups = [...new Set(accessibleItems.map((item) => item.group))]

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar-bg transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo header */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo collapsed={collapsed} size="sm" sidebar />
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 sidebar-scroll">
        {groups.map((group, groupIndex) => (
          <div
            key={group}
            className={cn(
              groupIndex > 0 && "border-t border-white/[0.06] pt-3 mt-3"
            )}
          >
            {!collapsed ? (
              <div className={cn(
                "mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest",
                GROUP_LABEL_COLORS[group] || "text-white/40"
              )}>
                {t(`groups.${group}`)}
              </div>
            ) : (
              groupIndex > 0 && <hr className="border-white/[0.06] mx-3 my-1" />
            )}
            {accessibleItems
              .filter((item) => item.group === group)
              .map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                const iconColor = GROUP_ICON_COLOR[group] || "text-slate-400"
                const activeBar = GROUP_ACTIVE_BAR[group] || "before:bg-sky-400"
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-150",
                      isActive
                        ? cn("font-medium text-white bg-white/[0.08] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r", activeBar)
                        : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                    )}
                    title={collapsed ? t(item.tKey) : undefined}
                  >
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md shrink-0 transition-all",
                      isActive ? iconColor : "text-white/40"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
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
