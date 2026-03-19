"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Building2, Plus, Users, Pencil, Trash2 } from "lucide-react"
import { CompanyForm } from "@/components/company-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

interface Company {
  id: string
  name: string
  industry: string | null
  status: string
  city: string | null
  country: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  description: string | null
  _count: { contacts: number; deals: number }
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "destructive",
}

export default function CompaniesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Company | null>(null)
  const orgId = (session?.user as any)?.organizationId

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/v1/companies?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
        const json = await res.json()
        if (json.success) {
          setCompanies(json.data.companies)
          setTotal(json.data.total)
        }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCompanies() }, [session])

  function handleEdit(item: Company) {
    setEditData({ id: item.id, name: item.name, industry: item.industry, website: item.website, phone: item.phone, email: item.email, address: item.address, city: item.city, country: item.country, status: item.status, description: item.description })
    setFormOpen(true)
  }

  function handleAdd() {
    setEditData(undefined)
    setFormOpen(true)
  }

  function handleDelete(item: Company) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/companies/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchCompanies()
  }

  const activeCount = companies.filter((c) => c.status === "active").length
  const prospectCount = companies.filter((c) => c.status === "prospect").length
  const totalContacts = companies.reduce((s, c) => s + (c._count?.contacts || 0), 0)

  const columns = [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (item: any) => (
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
    { key: "city", label: "City", sortable: true, render: (item: any) => item.city || "—" },
    {
      key: "contactCount",
      label: "Contacts",
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          {item._count?.contacts || 0}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: any) => (
        <Badge variant={statusColors[item.status] || "outline"}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title="Edit">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Manage your client companies</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={total} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Active" value={activeCount} trend="up" description="Active clients" />
        <StatCard title="Prospects" value={prospectCount} />
        <StatCard title="Contacts" value={totalContacts} icon={<Users className="h-4 w-4" />} />
      </div>

      <DataTable
        columns={columns}
        data={companies}
        searchPlaceholder="Search companies..."
        searchKey="name"
        onRowClick={(item) => router.push(`/companies/${item.id}`)}
      />

      <CompanyForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchCompanies} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Delete Company" itemName={deleteItem?.name} />
    </div>
  )
}
