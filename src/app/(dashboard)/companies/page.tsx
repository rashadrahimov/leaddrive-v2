"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Building2, Plus, Globe, Users } from "lucide-react"

// TODO: Replace with real API call after Prisma generate
const MOCK_COMPANIES = [
  { id: "1", name: "Zeytun Pharma", industry: "Pharma", status: "active", contactCount: 3, city: "Baku" },
  { id: "2", name: "Delta Telecom", industry: "Telecom", status: "active", contactCount: 5, city: "Baku" },
  { id: "3", name: "Azmade", industry: "IT", status: "active", contactCount: 8, city: "Baku" },
  { id: "4", name: "Tabia", industry: "IT", status: "prospect", contactCount: 2, city: "Baku" },
  { id: "5", name: "Novex", industry: "Retail", status: "inactive", contactCount: 0, city: "Ganja" },
]

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "destructive",
}

export default function CompaniesPage() {
  const router = useRouter()

  const columns = [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (item: typeof MOCK_COMPANIES[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
            {item.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">{item.industry || "—"}</div>
          </div>
        </div>
      ),
    },
    { key: "city", label: "City", sortable: true },
    {
      key: "contactCount",
      label: "Contacts",
      sortable: true,
      render: (item: typeof MOCK_COMPANIES[0]) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          {item.contactCount}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: typeof MOCK_COMPANIES[0]) => (
        <Badge variant={statusColors[item.status] || "outline"}>
          {item.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Manage your client companies</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={MOCK_COMPANIES.length} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Active" value={MOCK_COMPANIES.filter(c => c.status === "active").length} trend="up" description="Active clients" />
        <StatCard title="Prospects" value={MOCK_COMPANIES.filter(c => c.status === "prospect").length} />
        <StatCard title="Contacts" value={MOCK_COMPANIES.reduce((s, c) => s + c.contactCount, 0)} icon={<Users className="h-4 w-4" />} />
      </div>

      <DataTable
        columns={columns}
        data={MOCK_COMPANIES}
        searchPlaceholder="Search companies..."
        searchKey="name"
        onRowClick={(item) => router.push(`/companies/${item.id}`)}
      />
    </div>
  )
}
