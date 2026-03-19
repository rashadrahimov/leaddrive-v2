"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Users, Plus, Mail, Phone } from "lucide-react"

const MOCK_CONTACTS = [
  { id: "1", fullName: "Rashad Rahimov", email: "rashad.rahimov@zeytunpharma.az", phone: "+994512060838", company: "Zeytun Pharma", position: "IT Manager", isActive: true },
  { id: "2", fullName: "Kamran Hasanov", email: "k.hasanov@deltatelecom.az", phone: "+99450111222", company: "Delta Telecom", position: "CTO", isActive: true },
  { id: "3", fullName: "Aliya Mammadova", email: "aliya@testportal.az", phone: "+994551112233", company: "", position: "HR", isActive: true },
  { id: "4", fullName: "Tarlan Mammadli", email: "tarlan.mammadli@azmade.az", phone: "+99450251-72-23", company: "Azmade", position: "Director", isActive: false },
]

export default function ContactsPage() {
  const router = useRouter()

  const columns = [
    {
      key: "fullName",
      label: "Name",
      sortable: true,
      render: (item: typeof MOCK_CONTACTS[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {item.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="font-medium">{item.fullName}</div>
            <div className="text-xs text-muted-foreground">{item.position || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      label: "Company",
      sortable: true,
      render: (item: typeof MOCK_CONTACTS[0]) => item.company || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (item: typeof MOCK_CONTACTS[0]) => item.email ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Mail className="h-3 w-3" /> {item.email}
        </div>
      ) : "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (item: typeof MOCK_CONTACTS[0]) => item.phone ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="h-3 w-3" /> {item.phone}
        </div>
      ) : "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: (item: typeof MOCK_CONTACTS[0]) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage your contact database</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={MOCK_CONTACTS.length} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Active" value={MOCK_CONTACTS.filter(c => c.isActive).length} trend="up" description="Active contacts" />
        <StatCard title="With Email" value={MOCK_CONTACTS.filter(c => c.email).length} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="With Phone" value={MOCK_CONTACTS.filter(c => c.phone).length} icon={<Phone className="h-4 w-4" />} />
      </div>

      <DataTable
        columns={columns}
        data={MOCK_CONTACTS}
        searchPlaceholder="Search contacts..."
        searchKey="fullName"
        onRowClick={(item) => router.push(`/contacts/${item.id}`)}
      />
    </div>
  )
}
