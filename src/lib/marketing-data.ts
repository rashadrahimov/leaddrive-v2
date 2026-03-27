import {
  BarChart3, Users, TrendingUp, Zap, Mail, MessageSquare,
  Shield, Brain, DollarSign, Calculator, FileText, Target,
  Headphones, Globe, PieChart, Building2, UserCheck, Settings,
  Inbox, Bot, LineChart, Receipt, Briefcase, LayoutDashboard,
  Megaphone, Route, CalendarDays, Star, Gauge, BookOpen,
} from "lucide-react"

/* ────────────────────── STATS ────────────────────── */
export const stats = [
  { value: 63, label: "Modules", suffix: "+" },
  { value: 7, label: "Channels", suffix: "" },
  { value: 3, label: "Languages", suffix: "" },
  { value: 94, label: "Data Models", suffix: "" },
]

/* ────────────────────── PAIN / SOLUTION ────────────────────── */
export const painPoints = [
  {
    title: "Scattered tools",
    description: "Juggling 5+ apps for sales, marketing, support, and finance. Data silos everywhere.",
    icon: Settings,
  },
  {
    title: "Invisible margins",
    description: "No idea which clients or services are actually profitable. Revenue ≠ profit.",
    icon: DollarSign,
  },
  {
    title: "Manual everything",
    description: "Hours spent on data entry, follow-ups, and reports that should be automated.",
    icon: FileText,
  },
]

export const solutions = [
  {
    title: "One unified platform",
    description: "CRM, marketing, support, finance, and analytics — all in one place. No more tab-switching.",
    icon: LayoutDashboard,
  },
  {
    title: "See your real margins",
    description: "Built-in cost model engine shows per-client, per-service profitability with AI insights.",
    icon: PieChart,
  },
  {
    title: "AI does the work",
    description: "Native AI agents handle follow-ups, scoring, insights, and customer service automatically.",
    icon: Brain,
  },
]

/* ────────────────────── MODULE SHOWCASE ────────────────────── */
export type ModuleGroup = {
  id: string
  title: string
  icon: typeof BarChart3
  description: string
  features: string[]
  screenshot: string
}

export const moduleGroups: ModuleGroup[] = [
  {
    id: "crm",
    title: "CRM",
    icon: Users,
    description: "Full-cycle sales management from lead to close. Pipeline visualization, deal tracking, and contact management with AI-powered lead scoring.",
    features: ["Dashboard & KPIs", "Companies & Contacts", "Deals & Pipeline", "Leads & Scoring", "Tasks & Calendar", "Contracts & Invoices", "Products Catalog"],
    screenshot: "/marketing/crm-dashboard.png",
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    description: "Multi-channel campaign automation with journey builder, email sequences, and ROI tracking.",
    features: ["Campaign Manager", "Email Templates", "Journey Builder", "Segments", "Events", "AI Scoring", "Campaign ROI"],
    screenshot: "/marketing/marketing-campaigns.png",
  },
  {
    id: "communication",
    title: "Communication",
    icon: MessageSquare,
    description: "7 messaging channels in one unified inbox. Email, SMS, Telegram, WhatsApp, Facebook, Instagram, VK.",
    features: ["Unified Inbox", "Email", "SMS", "Telegram", "WhatsApp", "Facebook & Instagram", "VKontakte"],
    screenshot: "/marketing/inbox-channels.png",
  },
  {
    id: "support",
    title: "Support",
    icon: Headphones,
    description: "Full helpdesk with SLA enforcement, agent desktop, knowledge base, and customer self-service portal.",
    features: ["Ticket Management", "SLA Policies", "Agent Desktop", "Knowledge Base", "Customer Portal", "Portal Chat"],
    screenshot: "/marketing/support-tickets.png",
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: LineChart,
    description: "Profitability engine, budgeting & P&L, finance management, dynamic pricing, and AI-powered reports.",
    features: ["Cost Model Engine", "Budgeting & P&L", "Finance (A/R, A/P, Funds)", "Dynamic Pricing", "Reports", "AI Insights"],
    screenshot: "/marketing/analytics-profitability.png",
  },
  {
    id: "erp",
    title: "ERP",
    icon: Briefcase,
    description: "Project management with milestones, team tracking, budget allocation, and completion analytics.",
    features: ["Projects", "Milestones", "Team Members", "Budget Tracking", "Completion %"],
    screenshot: "/marketing/erp-projects.png",
  },
  {
    id: "settings",
    title: "Platform",
    icon: Settings,
    description: "Enterprise-grade configurability: roles, workflows, custom fields, audit logs, and multi-tenant SaaS architecture.",
    features: ["Users & Roles", "Workflows", "Custom Fields", "Currencies", "Audit Log", "Web-to-Lead", "API & Webhooks"],
    screenshot: "/marketing/platform-settings.png",
  },
]

/* ────────────────────── UNIQUE ADVANTAGES ────────────────────── */
export const advantages = [
  {
    title: "Cost Model Engine",
    description: "See per-client, per-service profitability. Track overhead across 18 categories. AI generates actionable insights.",
    icon: Calculator,
    color: "#F97316",
    href: "/features/analytics",
  },
  {
    title: "AI Agent Platform",
    description: "Native Claude integration for customer service, lead scoring, and business insights. Not an add-on — it's core.",
    icon: Bot,
    color: "#7c3aed",
    href: "/features/ai",
  },
  {
    title: "7-Channel Inbox",
    description: "Email, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — all conversations in one unified inbox.",
    icon: Inbox,
    color: "#f59e0b",
    href: "/features/inbox",
  },
  {
    title: "Dynamic Pricing",
    description: "Per-company pricing, margin simulation, service-level cost routing. Know your numbers before you quote.",
    icon: Receipt,
    color: "#ef4444",
    href: "/features/analytics",
  },
]

/* ────────────────────── PRICING PLANS ────────────────────── */
export type PlanTier = {
  id: string
  name: string
  tagline: string
  popular?: boolean
  features: string[]
}

export const plans: PlanTier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For small teams getting started",
    features: [
      "Companies & Contacts",
      "Deals & Pipeline",
      "Leads & Scoring",
      "Tasks & Calendar",
      "Products Catalog",
      "Up to 5 users",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For growing sales teams",
    features: [
      "Everything in Starter",
      "Tickets & SLA",
      "Knowledge Base",
      "Contracts",
      "Agent Desktop",
      "Roles & Permissions",
      "Up to 20 users",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For marketing & sales teams",
    popular: true,
    features: [
      "Everything in Business",
      "Campaign Automation",
      "Journey Builder",
      "Invoicing & Recurring",
      "Email Templates",
      "Events & Segments",
      "AI Scoring",
      "Projects & ERP",
      "Reports",
      "Up to 50 users",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For data-driven organizations",
    features: [
      "Everything in Professional",
      "Cost Model & Profitability",
      "Budgeting & P&L",
      "Finance (A/R, A/P, Funds)",
      "Dynamic Pricing Engine",
      "7-Channel Inbox",
      "AI Command Center",
      "Customer Portal",
      "Custom Fields & Workflows",
      "Audit Log",
      "Unlimited users",
    ],
  },
]

/* ────────────────────── TESTIMONIALS ────────────────────── */
export const testimonials = [
  {
    quote: "LeadDrive finally showed us which clients are profitable and which are draining our resources. Game-changer for our consulting firm.",
    name: "Elvin Mammadov",
    title: "CEO",
    company: "TechPrime Solutions",
    rating: 5,
  },
  {
    quote: "The 7-channel inbox saved us from juggling WhatsApp, Telegram, and email separately. Our response time dropped by 60%.",
    name: "Aysel Hasanova",
    title: "Head of Support",
    company: "CloudBridge IT",
    rating: 5,
  },
  {
    quote: "We replaced Salesforce + HubSpot + a spreadsheet for P&L tracking. One platform, one source of truth.",
    name: "Rustam Aliyev",
    title: "COO",
    company: "DataFlow Agency",
    rating: 5,
  },
  {
    quote: "The AI agent handles 40% of our support tickets automatically. The cost model shows exactly where our margins are.",
    name: "Nigar Karimova",
    title: "Operations Director",
    company: "Innovate MSP",
    rating: 5,
  },
  {
    quote: "Budgeting module with P&L tracking — this is what we needed all along. No more exporting to Excel for financial analysis.",
    name: "Farid Huseynov",
    title: "CFO",
    company: "GreenTech Services",
    rating: 4,
  },
  {
    quote: "Journey builder for invoice reminders cut our overdue payments by 45%. Automated follow-ups actually work.",
    name: "Leyla Ibrahimova",
    title: "Finance Manager",
    company: "Nexus Consulting",
    rating: 5,
  },
]

/* ────────────────────── FAQ ────────────────────── */
export const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! Start with a 14-day free trial on any plan. No credit card required.",
  },
  {
    q: "How is LeadDrive different from Salesforce or HubSpot?",
    a: "LeadDrive includes built-in cost model engine, profitability analytics, and budgeting/P&L — features that competitors either don't have or charge extra for. Plus, our AI agents are native, not add-ons.",
  },
  {
    q: "Can I import data from my current CRM?",
    a: "Absolutely. We support CSV/Excel imports and have migration scripts for popular CRMs. Our team can help with complex migrations.",
  },
  {
    q: "What languages are supported?",
    a: "The platform supports English, Russian, and Azerbaijani. More languages are on the roadmap.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use PostgreSQL with full encryption, role-based access control, 2FA, audit logging, and complete data isolation per organization.",
  },
  {
    q: "Can I customize the CRM for my industry?",
    a: "Yes. Custom fields, workflow automation, configurable dashboards, and dynamic pricing let you adapt LeadDrive to any business model.",
  },
  {
    q: "Do you offer on-premise deployment?",
    a: "Currently we offer cloud deployment. On-premise options are available for Enterprise customers — contact our sales team.",
  },
  {
    q: "How does the 7-channel inbox work?",
    a: "Connect your Email, SMS, Telegram, WhatsApp, Facebook, Instagram, and VK accounts. All messages appear in one unified inbox with conversation threading per contact.",
  },
]
