"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { StatCard } from "@/components/stat-card"
import {
  Users, Plus, Pencil, Trash2, Shield, ShieldCheck, Eye,
  Loader2, UserCheck, UserX, Search,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  department: string | null
  isActive: boolean
  lastLogin: string | null
  loginCount: number
  totpEnabled: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  agent: "Агент",
  viewer: "Наблюдатель",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  agent: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  manager: <ShieldCheck className="h-3 w-3" />,
  agent: <UserCheck className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
}

interface UserFormData {
  name: string
  email: string
  password: string
  role: string
  phone: string
  department: string
  isActive: boolean
}

function UserFormDialog({
  open, onOpenChange, onSaved, editUser, orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  editUser?: User
  orgId?: string
}) {
  const isEdit = !!editUser
  const [form, setForm] = useState<UserFormData>({
    name: "", email: "", password: "", role: "viewer",
    phone: "", department: "", isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: editUser?.name || "",
        email: editUser?.email || "",
        password: "",
        role: editUser?.role || "viewer",
        phone: editUser?.phone || "",
        department: editUser?.department || "",
        isActive: editUser?.isActive ?? true,
      })
      setError("")
    }
  }, [open, editUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const payload: Record<string, any> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || null,
        department: form.department || null,
        isActive: form.isActive,
      }
      if (!isEdit) {
        payload.password = form.password
      } else if (form.password) {
        payload.password = form.password
      }

      const url = isEdit ? `/api/v1/users/${editUser!.id}` : "/api/v1/users"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
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
        <DialogTitle>{isEdit ? "Редактировать пользователя" : "Добавить пользователя"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Имя *</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="password">{isEdit ? "Новый пароль (оставьте пустым)" : "Пароль *"}</Label>
              <Input
                id="password" type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!isEdit} minLength={6} placeholder={isEdit ? "••••••" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="role">Роль</Label>
                <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Администратор</option>
                  <option value="manager">Менеджер</option>
                  <option value="agent">Агент</option>
                  <option value="viewer">Наблюдатель</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Отдел</Label>
                <Input id="department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="isActive" checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="mb-0 cursor-pointer">Активен</Label>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохранение...</> : isEdit ? "Обновить" : "Создать"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function UsersSettingsPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/v1/users", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setUsers(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/users/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || "Failed to delete")
    }
    fetchUsers()
  }

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/v1/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    fetchUsers()
  }

  const activeCount = users.filter(u => u.isActive).length
  const adminCount = users.filter(u => u.role === "admin").length

  const columns = [
    {
      key: "name", label: "Пользователь", sortable: true,
      render: (item: User) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.email}</div>
        </div>
      ),
    },
    {
      key: "role", label: "Роль", sortable: true,
      render: (item: User) => (
        <Badge className={`${ROLE_COLORS[item.role] || ROLE_COLORS.viewer} gap-1`}>
          {ROLE_ICONS[item.role]}{ROLE_LABELS[item.role] || item.role}
        </Badge>
      ),
    },
    {
      key: "department", label: "Отдел", sortable: true,
      render: (item: User) => (
        <span className="text-sm">{item.department || "—"}</span>
      ),
    },
    {
      key: "isActive", label: "Статус", sortable: true,
      render: (item: User) => (
        <Badge
          className={`cursor-pointer ${item.isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
          onClick={() => handleToggleActive(item)}
        >
          {item.isActive ? "Активен" : "Отключён"}
        </Badge>
      ),
    },
    {
      key: "lastLogin", label: "Последний вход", sortable: true,
      render: (item: User) => (
        <div className="text-sm">
          {item.lastLogin
            ? new Date(item.lastLogin).toLocaleDateString("ru-RU", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : <span className="text-muted-foreground">Никогда</span>
          }
        </div>
      ),
    },
    {
      key: "totpEnabled", label: "2FA",
      render: (item: User) => (
        <span className={`text-xs font-medium ${item.totpEnabled ? "text-green-600" : "text-muted-foreground"}`}>
          {item.totpEnabled ? "Вкл" : "Выкл"}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: (item: User) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); setEditUser(item); setShowForm(true) }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); setDeleteName(item.name) }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Пользователи ({users.length})</h1>
          <p className="text-sm text-muted-foreground">Управление пользователями системы</p>
        </div>
        <Button onClick={() => { setEditUser(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Всего" value={users.length} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Активные" value={activeCount} icon={<UserCheck className="h-4 w-4" />} />
        <StatCard title="Отключённые" value={users.length - activeCount} icon={<UserX className="h-4 w-4" />} />
        <StatCard title="Администраторы" value={adminCount} icon={<Shield className="h-4 w-4" />} />
      </div>

      <DataTable data={users} columns={columns} searchKey="name" searchPlaceholder="Поиск пользователей..." />

      <UserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSaved={fetchUsers}
        editUser={editUser}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Удалить пользователя"
        itemName={deleteName}
      />
    </div>
  )
}
