"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Users, Plus, Mail, Phone, Pencil, Trash2 } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

interface Contact {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  position: string | null
  source: string | null
  companyId: string | null
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
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Contact | null>(null)
  const orgId = session?.user?.organizationId

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

  useEffect(() => { fetchContacts() }, [session])

  function handleEdit(item: Contact) {
    setEditData({ id: item.id, fullName: item.fullName, email: item.email, phone: item.phone, position: item.position, companyId: item.companyId, source: item.source })
    setFormOpen(true)
  }

  function handleAdd() {
    setEditData(undefined)
    setFormOpen(true)
  }

  function handleDelete(item: Contact) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/contacts/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchContacts()
  }

  const columns = [
    {
      key: "fullName",
      label: "Name",
      sortable: true,
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {item.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
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
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /> Add Contact</Button>
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

      <ContactForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchContacts} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Delete Contact" itemName={deleteItem?.fullName} />
    </div>
  )
}
