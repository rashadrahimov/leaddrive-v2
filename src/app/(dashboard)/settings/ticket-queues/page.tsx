"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, ListOrdered, Zap } from "lucide-react"

interface TicketQueue {
  id: string
  name: string
  skills: string[]
  priority: number
  autoAssign: boolean
  assignMethod: string
  isActive: boolean
  createdAt: string
}

interface QueueFormData {
  name: string
  skills: string
  priority: number
  autoAssign: boolean
  assignMethod: string
}

function QueueFormDialog({
  open,
  onOpenChange,
  onSaved,
  orgId,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  orgId?: string
  t: (key: string) => string
}) {
  const [form, setForm] = useState<QueueFormData>({
    name: "",
    skills: "",
    priority: 0,
    autoAssign: true,
    assignMethod: "least_loaded",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({ name: "", skills: "", priority: 0, autoAssign: true, assignMethod: "least_loaded" })
      setError("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const skills = form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch("/api/v1/ticket-queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
        },
        body: JSON.stringify({
          name: form.name,
          skills,
          priority: form.priority,
          autoAssign: form.autoAssign,
          assignMethod: form.assignMethod,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create queue")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("createTicketQueue")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">
              {error}
            </div>
          )}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{t("queueName")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("queueNamePlaceholder")}
                required
              />
            </div>
            <div>
              <Label htmlFor="skills">{t("skills")}</Label>
              <Input
                id="skills"
                value={form.skills}
                onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                placeholder={t("skillsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("skillsHint")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priority">{t("priorityLabel")}</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="assignMethod">{t("assignmentMethod")}</Label>
                <Select
                  value={form.assignMethod}
                  onChange={(e) => setForm((f) => ({ ...f, assignMethod: e.target.value }))}
                >
                  <option value="least_loaded">{t("leastLoaded")}</option>
                  <option value="round_robin">{t("roundRobin")}</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoAssign"
                checked={form.autoAssign}
                onChange={(e) => setForm((f) => ({ ...f, autoAssign: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="autoAssign" className="mb-0 cursor-pointer">
                {t("autoAssign")}
              </Label>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("creating")}
              </>
            ) : (
              t("createQueue")
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function TicketQueuesPage() {
  const { data: session } = useSession()
  const t = useTranslations("ticketQueues")
  const [queues, setQueues] = useState<TicketQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<TicketQueue | null>(null)
  const orgId = session?.user?.organizationId

  const fetchQueues = async () => {
    try {
      const res = await fetch("/api/v1/ticket-queues", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) setQueues(json.data)
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueues()
  }, [session])

  const handleToggleActive = async (queue: TicketQueue) => {
    await fetch(`/api/v1/ticket-queues/${queue.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
      },
      body: JSON.stringify({ isActive: !queue.isActive }),
    })
    fetchQueues()
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/ticket-queues/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchQueues()
  }

  const columns = [
    {
      key: "name",
      label: t("colQueueName"),
      sortable: true,
      render: (item: TicketQueue) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "skills",
      label: t("colSkills"),
      render: (item: TicketQueue) => (
        <div className="flex flex-wrap gap-1">
          {item.skills.length > 0 ? (
            item.skills.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{t("catchAll")}</span>
          )}
        </div>
      ),
    },
    {
      key: "assignMethod",
      label: t("colMethod"),
      render: (item: TicketQueue) => (
        <Badge
          className={
            item.assignMethod === "round_robin"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
          }
        >
          {item.assignMethod === "round_robin" ? t("roundRobin") : t("leastLoaded")}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: t("colPriority"),
      sortable: true,
      render: (item: TicketQueue) => <span className="font-mono text-sm">{item.priority}</span>,
    },
    {
      key: "isActive",
      label: t("colStatus"),
      render: (item: TicketQueue) => (
        <Badge
          className={`cursor-pointer ${
            item.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => handleToggleActive(item)}
        >
          {item.isActive ? t("active") : t("inactive")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (item: TicketQueue) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteItem(item)
            setDeleteOpen(true)
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("newQueue")}
        </Button>
      </div>

      {queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <ListOrdered className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{t("noQueues")}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {t("noQueuesDesc")}
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("createFirstQueue")}
          </Button>
        </div>
      ) : (
        <DataTable data={queues as any} columns={columns as any} searchKey="name" searchPlaceholder={t("searchQueues")} />
      )}

      <QueueFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchQueues} orgId={orgId} t={t} />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title={t("deleteTitle")}
        itemName={deleteItem?.name}
      />
    </div>
  )
}
