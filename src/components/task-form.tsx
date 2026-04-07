"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Building2, User, Handshake, Target, Ticket, X, Loader2 } from "lucide-react"

const ENTITY_TYPES = [
  { value: "company", icon: Building2 },
  { value: "contact", icon: User },
  { value: "deal", icon: Handshake },
  { value: "lead", icon: Target },
  { value: "ticket", icon: Ticket },
] as const

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

export function TaskForm({ open, onOpenChange, onSaved, initialData, orgId }: TaskFormProps) {
  const t = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
    status: initialData?.status || "pending",
    dueDate: initialData?.dueDate?.slice?.(0, 10) || initialData?.dueDate || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Entity linking state
  const [relatedType, setRelatedType] = useState<string>(initialData?.relatedType || "")
  const [relatedId, setRelatedId] = useState<string>(initialData?.relatedId || "")
  const [relatedName, setRelatedName] = useState<string>(initialData?.relatedName || "")
  const [entitySearch, setEntitySearch] = useState("")
  const [entityResults, setEntityResults] = useState<{ id: string; name: string }[]>([])
  const [entityLoading, setEntityLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setForm({
        title: initialData?.title || "",
        description: initialData?.description || "",
        priority: initialData?.priority || "medium",
        status: initialData?.status || "pending",
        dueDate: initialData?.dueDate?.slice?.(0, 10) || initialData?.dueDate || "",
      })
      setRelatedType(initialData?.relatedType || "")
      setRelatedId(initialData?.relatedId || "")
      setRelatedName(initialData?.relatedName || "")
      setEntitySearch("")
      setEntityResults([])
      setShowDropdown(false)
      setError("")
    }
  }, [open, initialData])

  // Search entities when typing
  useEffect(() => {
    if (!relatedType || entitySearch.length < 1) {
      setEntityResults([])
      setShowDropdown(false)
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setEntityLoading(true)
      try {
        const endpoint = getSearchEndpoint(relatedType, entitySearch)
        const res = await fetch(endpoint, {
          headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
        })
        const json = await res.json()
        if (json.success) {
          setEntityResults(parseResults(relatedType, json.data))
          setShowDropdown(true)
        }
      } catch {} finally {
        setEntityLoading(false)
      }
    }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [entitySearch, relatedType])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/tasks/${initialData!.id}` : "/api/v1/tasks"
      const body: Record<string, any> = { ...form, dueDate: form.dueDate || undefined }
      if (relatedType && relatedId) {
        body.relatedType = relatedType
        body.relatedId = relatedId
      }
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleEntityTypeChange = (type: string) => {
    setRelatedType(type)
    setRelatedId("")
    setRelatedName("")
    setEntitySearch("")
    setEntityResults([])
    setShowDropdown(false)
  }

  const selectEntity = (entity: { id: string; name: string }) => {
    setRelatedId(entity.id)
    setRelatedName(entity.name)
    setEntitySearch("")
    setShowDropdown(false)
  }

  const clearEntity = () => {
    setRelatedId("")
    setRelatedName("")
    setEntitySearch("")
    setEntityResults([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? t("editTask") : t("newTask")}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label>{tc("title")} *</Label><Input value={form.title} onChange={e => u("title", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{tc("priority")}</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
              <div><Label>{tc("dueDate")}</Label><Input type="date" value={form.dueDate} onChange={e => u("dueDate", e.target.value)} /></div>
            </div>
            {isEdit && (
              <div><Label>{tc("status")}</Label><Select value={form.status} onChange={e => u("status", e.target.value)}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></div>
            )}

            {/* Entity linking */}
            <div>
              <Label>{tc("linkToEntity")}</Label>
              <div className="flex gap-1.5 mt-1.5 mb-2">
                {ENTITY_TYPES.map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleEntityTypeChange(relatedType === value ? "" : value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      relatedType === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tc(value)}
                  </button>
                ))}
              </div>

              {relatedType && (
                <div className="relative" ref={dropdownRef}>
                  {relatedId ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30">
                      {(() => { const E = ENTITY_TYPES.find(e => e.value === relatedType)?.icon; return E ? <E className="h-4 w-4 text-muted-foreground" /> : null })()}
                      <span className="text-sm font-medium flex-1">{relatedName}</span>
                      <button type="button" onClick={clearEntity} className="p-0.5 rounded hover:bg-muted transition-colors">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Input
                          value={entitySearch}
                          onChange={e => setEntitySearch(e.target.value)}
                          placeholder={tc("searchEntity")}
                          autoFocus
                        />
                        {entityLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      {showDropdown && entityResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                          {entityResults.map(entity => (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => selectEntity(entity)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              {entity.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {showDropdown && entityResults.length === 0 && !entityLoading && entitySearch.length >= 1 && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                          {tc("noResults")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div><Label>{tc("description")}</Label><Textarea value={form.description} onChange={e => u("description", e.target.value)} rows={3} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? tc("saving") : isEdit ? tc("update") : tc("create")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function getSearchEndpoint(type: string, query: string): string {
  const q = encodeURIComponent(query)
  switch (type) {
    case "company": return `/api/v1/companies?search=${q}&limit=10`
    case "contact": return `/api/v1/contacts?search=${q}&limit=10`
    case "deal": return `/api/v1/deals?search=${q}&limit=10`
    case "lead": return `/api/v1/leads?search=${q}&limit=10`
    case "ticket": return `/api/v1/tickets?search=${q}&limit=10`
    default: return ""
  }
}

function parseResults(type: string, data: any): { id: string; name: string }[] {
  if (!data) return []
  const list = Array.isArray(data) ? data : data.companies || data.contacts || data.deals || data.leads || data.tickets || []
  return list.slice(0, 10).map((item: any) => ({
    id: item.id,
    name: type === "contact"
      ? item.fullName || item.name || item.id
      : type === "lead"
        ? item.contactName || item.companyName || item.id
        : type === "ticket"
          ? item.subject || item.title || item.id
          : item.name || item.id,
  }))
}
