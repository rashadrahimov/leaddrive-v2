"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Zap, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageDescription } from "@/components/page-description"
import { useAutoTour } from "@/components/tour/tour-provider"
import { TourReplayButton } from "@/components/tour/tour-replay-button"

interface MacroAction {
  type: string
  value: string
}

interface TicketMacro {
  id: string
  name: string
  description: string | null
  category: string
  actions: MacroAction[]
  shortcutKey: string | null
  usageCount: number
  isActive: boolean
  sortOrder: number
}

const ACTION_TYPE_KEYS = [
  { value: "set_status", tKey: "setStatus" },
  { value: "set_priority", tKey: "setPriority" },
  { value: "add_comment", tKey: "addReply" },
  { value: "add_internal_note", tKey: "addInternalNote" },
  { value: "add_tag", tKey: "addTag" },
  { value: "remove_tag", tKey: "removeTag" },
  { value: "set_assignee", tKey: "setAssignee" },
]

const CATEGORIES = ["general", "billing", "technical", "onboarding", "sales"]

export default function MacrosSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("macrosPage")
  useAutoTour("macros")
  const tc = useTranslations("common")
  const orgId = session?.user?.organizationId
  const headers = orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>

  const [macros, setMacros] = useState<TicketMacro[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [shortcutKey, setShortcutKey] = useState("")
  const [actions, setActions] = useState<MacroAction[]>([{ type: "add_comment", value: "" }])

  const fetchMacros = async () => {
    try {
      const res = await fetch("/api/v1/ticket-macros", { headers })
      const json = await res.json()
      if (json.success) setMacros(json.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchMacros() }, [session])

  const resetForm = () => {
    setName("")
    setDescription("")
    setCategory("general")
    setShortcutKey("")
    setActions([{ type: "add_comment", value: "" }])
    setEditId(null)
  }

  const openEdit = (macro: TicketMacro) => {
    setEditId(macro.id)
    setName(macro.name)
    setDescription(macro.description || "")
    setCategory(macro.category)
    setShortcutKey(macro.shortcutKey || "")
    setActions(macro.actions || [{ type: "add_comment", value: "" }])
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim() || actions.length === 0) return
    const validActions = actions.filter(a => a.value.trim())
    if (validActions.length === 0) return

    const payload = { name, description: description || undefined, category, shortcutKey: shortcutKey || undefined, actions: validActions }

    if (editId) {
      await fetch(`/api/v1/ticket-macros/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch("/api/v1/ticket-macros", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
    }

    resetForm()
    setShowForm(false)
    fetchMacros()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/ticket-macros/${id}`, { method: "DELETE", headers })
    fetchMacros()
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/ticket-macros/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ isActive }),
    })
    fetchMacros()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-tour-id="macros-header" className="text-2xl font-bold tracking-tight flex items-center gap-2">{t("title")} <TourReplayButton tourId="macros" /></h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
          <PageDescription text={t("description")} />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> {t("newMacro")}
        </Button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : macros.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t("noMacros")}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Shortcut</th>
                <th className="text-left px-4 py-2 font-medium">Actions</th>
                <th className="text-right px-4 py-2 font-medium">Uses</th>
                <th className="text-right px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {macros.map(macro => (
                <tr key={macro.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(macro)}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{macro.name}</div>
                    {macro.description && <div className="text-xs text-muted-foreground">{macro.description}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize">{macro.category}</td>
                  <td className="px-4 py-3">
                    {macro.shortcutKey && <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{macro.shortcutKey}</kbd>}
                  </td>
                  <td className="px-4 py-3">{(macro.actions as MacroAction[]).length} actions</td>
                  <td className="px-4 py-3 text-right">{macro.usageCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); toggleActive(macro.id, !macro.isActive) }}
                      className={cn("text-xs px-2 py-0.5 rounded-full border", macro.isActive ? "bg-green-50 text-green-600 border-green-200" : "bg-muted text-muted-foreground")}
                    >
                      {macro.isActive ? tc("active") : tc("inactive")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(macro.id) }} className="h-7 w-7 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Macro Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) resetForm() }}>
        <DialogHeader>
          <DialogTitle>{editId ? t("editMacro") : t("newMacro")}</DialogTitle>
        </DialogHeader>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("name")}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("placeholderName")} />
              </div>
              <div>
                <Label>{t("category")}</Label>
                <Select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(c as any)}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("description2")}</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t("placeholderDesc")} />
            </div>
            <div>
              <Label>{t("shortcutKey")}</Label>
              <Select value={shortcutKey} onChange={e => setShortcutKey(e.target.value)}>
                <option value="">{t("none")}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <option key={n} value={`Alt+${n}`}>Alt+{n}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("actions")}</Label>
              <div className="space-y-2 mt-2">
                {actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Select value={action.type} onChange={e => {
                      const next = [...actions]
                      next[i] = { ...next[i], type: e.target.value }
                      setActions(next)
                    }} className="w-40 shrink-0">
                      {ACTION_TYPE_KEYS.map(at => <option key={at.value} value={at.value}>{t(at.tKey as any)}</option>)}
                    </Select>
                    <Input
                      value={action.value}
                      onChange={e => {
                        const next = [...actions]
                        next[i] = { ...next[i], value: e.target.value }
                        setActions(next)
                      }}
                      placeholder={action.type.startsWith("set_") ? "Value..." : "Text..."}
                      className="flex-1"
                    />
                    {actions.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setActions(actions.filter((_, j) => j !== i))} className="h-9 w-9 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setActions([...actions, { type: "add_comment", value: "" }])} className="text-xs text-primary hover:underline">
                  {t("addAction")}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editId ? t("saveChanges") : t("createMacro")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
