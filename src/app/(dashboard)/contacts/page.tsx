"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/stat-card"
import { Select } from "@/components/ui/select"
import { Users, Plus, Mail, Phone, Pencil, Trash2, Search, ChevronLeft, ChevronRight, CheckSquare, Square, MinusSquare } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"

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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [sortBy, setSortBy] = useState("name_asc")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const orgId = session?.user?.organizationId
  const pageSize = 20

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

  // Clear selection when search/sort changes
  useEffect(() => { setSelected(new Set()) }, [search, sortBy])

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
    setSelected(prev => { const next = new Set(prev); next.delete(deleteItem.id); return next })
    fetchContacts()
  }

  async function confirmBulkDelete() {
    if (selected.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selected)
      const res = await fetch("/api/v1/contacts/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
      setSelected(new Set())
      fetchContacts()
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`)
    } finally {
      setBulkDeleting(false)
    }
  }

  const filtered = useMemo(() => {
    let result = contacts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.company?.name || "").toLowerCase().includes(q)
      )
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.fullName.localeCompare(b.fullName)
        case "name_desc": return b.fullName.localeCompare(a.fullName)
        case "company": return (a.company?.name || "zzz").localeCompare(b.company?.name || "zzz")
        case "email": return (a.email ? 0 : 1) - (b.email ? 0 : 1)
        case "active": return (a.isActive ? 0 : 1) - (b.isActive ? 0 : 1)
        default: return 0
      }
    })
  }, [contacts, search, sortBy])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Selection helpers
  const allPageSelected = paginated.length > 0 && paginated.every(c => selected.has(c.id))
  const somePageSelected = paginated.some(c => selected.has(c.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  function toggleSelectAll() {
    if (allPageSelected) {
      // Deselect current page
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      // Select current page
      setSelected(prev => {
        const next = new Set(prev)
        paginated.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map(c => c.id)))
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Контакты</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Контакты</h1>
          <p className="text-sm text-muted-foreground">Управление базой контактов</p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /> Добавить контакт</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Всего" value={total} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Активные" value={contacts.filter(c => c.isActive).length} />
        <StatCard title="С Email" value={contacts.filter(c => c.email).length} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="С телефоном" value={contacts.filter(c => c.phone).length} icon={<Phone className="h-4 w-4" />} />
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Выбрано: {selected.size} из {filtered.length}
          </span>
          {!allFilteredSelected && (
            <button onClick={selectAllFiltered} className="text-sm text-blue-600 hover:text-blue-800 underline">
              Выбрать все {filtered.length}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="text-sm text-muted-foreground hover:text-foreground">
            Снять выделение
          </button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Удалить ({selected.size})
          </Button>
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск контактов..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} результатов</span>
        <div className="flex-1" />
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[200px]">
          <option value="name_asc">Имя А → Я</option>
          <option value="name_desc">Имя Я → А</option>
          <option value="company">Компания</option>
          <option value="email">С email</option>
          <option value="active">Активные первые</option>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-3 w-10">
                <button onClick={toggleSelectAll} className="p-0.5 rounded hover:bg-muted">
                  {allPageSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : somePageSelected ? (
                    <MinusSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Имя</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Телефон</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(item => (
              <tr
                key={item.id}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50 cursor-pointer",
                  selected.has(item.id) && "bg-blue-50/50 dark:bg-blue-900/10"
                )}
                onClick={() => router.push(`/contacts/${item.id}`)}
              >
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleSelect(item.id)} className="p-0.5 rounded hover:bg-muted">
                    {selected.has(item.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {item.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium">{item.fullName}</div>
                      <div className="text-xs text-muted-foreground">{item.position || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{item.company?.name || <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3">
                  {item.email ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {item.email}
                    </div>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  {item.phone ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {item.phone}
                    </div>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Активный" : "Неактивный"}
                  </Badge>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title="Редактировать">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Удалить">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Контакты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchContacts} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title="Удалить контакт" itemName={deleteItem?.fullName} />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Удалить контакты"
        itemName={`${selected.size} контакт(ов)`}
      />
    </div>
  )
}
