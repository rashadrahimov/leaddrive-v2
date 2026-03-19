"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { Building2, Users, Handshake, Ticket, TrendingUp, Clock, CheckSquare } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const REVENUE_DATA = [
  { month: "Oct", revenue: 52000 },
  { month: "Nov", revenue: 58000 },
  { month: "Dec", revenue: 61000 },
  { month: "Jan", revenue: 55000 },
  { month: "Feb", revenue: 63000 },
  { month: "Mar", revenue: 67000 },
]

const RECENT_ACTIVITY = [
  { id: "1", text: "CRM prezentasiya", user: "Afsana F.", time: "2 days ago", type: "task" },
  { id: "2", text: "Встреча в офисе GT LLC", user: "Rashad R.", time: "3 days ago", type: "meeting" },
  { id: "3", text: "New deal: Zeytunpharma", user: "Azar A.", time: "4 days ago", type: "deal" },
  { id: "4", text: "Ticket TK-0042 resolved", user: "Admin", time: "5 days ago", type: "ticket" },
]

const MY_TASKS = [
  { id: "1", title: "Очистить историю коммуникаций", priority: "high", dueDate: "Mar 16" },
  { id: "2", title: "Подготовить контракт Zeytun", priority: "high", dueDate: "Mar 22" },
  { id: "3", title: "Провести телефонный звонок", priority: "medium", dueDate: "Mar 20" },
]

const activityIcons: Record<string, string> = {
  task: "✅", meeting: "🤝", deal: "💰", ticket: "🎫", email: "📧",
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Companies" value={59} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Contacts" value={577} icon={<Users className="h-4 w-4" />} description="+3 this week" trend="up" />
        <StatCard title="Active Deals" value={3} icon={<Handshake className="h-4 w-4" />} description="28,784 ₼ pipeline" />
        <StatCard title="Open Tickets" value={5} icon={<Ticket className="h-4 w-4" />} trend="down" description="2 overdue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">{activityIcons[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.text}</div>
                    <div className="text-xs text-muted-foreground">{item.user} · {item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MY_TASKS.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
                  <span className="text-sm">{task.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                    {task.priority}
                  </span>
                  <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
