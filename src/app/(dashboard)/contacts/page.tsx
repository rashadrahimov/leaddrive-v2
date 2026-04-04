"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ColorStatCard } from "@/components/color-stat-card"
import { Select } from "@/components/ui/select"
import { Users, Plus, Mail, Phone, Pencil, Trash2, Search, ChevronLeft, ChevronRight, CheckSquare, Square, MinusSquare, Globe, UserCheck, PhoneCall, Linkedin, AtSign, Upload } from "lucide-react"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { ContactForm } from "@/components/contact-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"

interface Contact {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  position: string | null
  source: string | null
  companyId: string | null
  isActive: boolean
  portalAccessEnabled: boolean
  portalPasswordHash: string | null
  company: { id: string; name: string } | null
}

export default function ContactsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const t = useTranslations("contacts")
  const tc = useTranslations("common")
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
  const [importOpen, setImportOpen] = useState(false)
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
    } catch (err) { console.error(err) } finally { setLoading(false) }
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
      toast.error(`Ошибка: ${err.message}`)
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
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> CSV Import</Button>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> {t("addContact")}</Button>
        </div>
      </div>

      <PageDescription text={t("pageDescription")} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={total} icon={<Users className="h-4 w-4" />} color="blue" hint={t("hintTotalContacts")} />
        <ColorStatCard label={t("statActive")} value={contacts.filter(c => c.isActive).length} icon={<Users className="h-4 w-4" />} color="green" hint={t("hintActiveContacts")} />
        <ColorStatCard label={t("statWithEmail")} value={contacts.filter(c => c.email).length} icon={<Mail className="h-4 w-4" />} color="violet" />
        <ColorStatCard label={t("statWithPhone")} value={contacts.filter(c => c.phone).length} icon={<Phone className="h-4 w-4" />} color="orange" />
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {t("selected", { count: selected.size, total: filtered.length })}
          </span>
          {!allFilteredSelected && (
            <button onClick={selectAllFiltered} className="text-sm text-blue-600 hover:text-blue-800 underline">
              {t("selectAll", { count: filtered.length })}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="text-sm text-muted-foreground hover:text-foreground">
            {t("deselectAll")}
          </button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("deleteSelected", { count: selected.size })}
          </Button>
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{tc("results", { count: filtered.length })}</span>
        <div className="flex-1" />
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[200px]">
          <option value="name_asc">{t("sortNameAsc")}</option>
          <option value="name_desc">{t("sortNameDesc")}</option>
          <option value="company">{t("sortCompany")}</option>
          <option value="email">{t("sortWithEmail")}</option>
          <option value="active">{t("sortActiveFirst")}</option>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><span className="inline-flex items-center gap-1">{t("colName")} <InfoHint text={t("hintColName")} size={12} /></span></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><span className="inline-flex items-center gap-1">{t("colCompany")} <InfoHint text={t("hintColCompany")} size={12} /></span></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><span className="inline-flex items-center gap-1">{t("colEmail")} <InfoHint text={t("hintColEmail")} size={12} /></span></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><span className="inline-flex items-center gap-1">{t("colPhone")} <InfoHint text={t("hintColPhone")} size={12} /></span></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colSource") || "Source"}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colStatus")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><span className="inline-flex items-center gap-1">{t("colPortal")} <InfoHint text={t("hintColPortal")} size={12} /></span></th>
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
                  {item.source ? (
                    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                      item.source === "website" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      item.source === "referral" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      item.source === "cold_call" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      item.source === "linkedin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                      item.source === "email" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}>
                      {item.source === "website" ? <Globe className="h-3 w-3" /> :
                       item.source === "referral" ? <UserCheck className="h-3 w-3" /> :
                       item.source === "cold_call" ? <PhoneCall className="h-3 w-3" /> :
                       item.source === "linkedin" ? <Linkedin className="h-3 w-3" /> :
                       item.source === "email" ? <AtSign className="h-3 w-3" /> : null}
                      {item.source}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? tc("active") : tc("inactive")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {item.portalAccessEnabled ? (
                    item.portalPasswordHash ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Portal</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">Pending</Badge>
                    )
                  ) : null}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title={tc("edit")}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title={tc("delete")}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? t("noResults") : t("noContacts")}
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
            {tc("pageOf", { page, totalPages })}
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
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("deleteContact")} itemName={deleteItem?.fullName} />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title={t("deleteContact")}
        itemName={t("contactsSelected", { count: selected.size })}
      />

      {/* CSV Import */}
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType="contacts"
        onImported={fetchContacts}
      />
    </div>
  )
}
