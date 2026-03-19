"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Users, Plus, Mail, Phone } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

interface Contact {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  position: string | null
  isActive: boolean
  company: { id: string; name: string } | null
}

export default function ContactsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const orgId = (session?.user as any)?.organizationId

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/v1/contacts?limit=500", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        const json = await res.json()
        if (json.success) {
          setContacts(json.data.contacts)
          setTotal(json.data.total)
        }
      } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchContacts()
  }, [session])

  const columns = [
    {
      key: "fullName",
      label: "Name",
      sortable: true,
      render: (item: any) => (
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
      render: (item: any) => item.company?.name || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (item: any) => item.email ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Mail className="h-3 w-3" /> {item.email}
        </div>
      ) : "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (item: any) => item.phone ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="h-3 w-3" /> {item.phone}
        </div>
      ) : "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage your contact database</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add Contact</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={total} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Active" value={contacts.filter(c => c.isActive).length} trend="up" description="Active contacts" />
        <StatCard title="With Email" value={contacts.filter(c => c.email).length} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="With Phone" value={contacts.filter(c => c.phone).length} icon={<Phone className="h-4 w-4" />} />
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        searchPlaceholder="Search contacts..."
        searchKey="fullName"
        onRowClick={(item) => router.push(`/contacts/${item.id}`)}
      />

      <ContactForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchContacts} orgId={orgId} />
    </div>
  )
}
