"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Key, Plus, Trash2, Copy, CheckCircle2, AlertTriangle, Shield, Clock } from "lucide-react"
import { PageDescription } from "@/components/page-description"

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type ScopeDef = {
  key: string
  label: string
  description?: string
}

export default function ApiKeysPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const role = (session?.user as { role?: string })?.role || "viewer"
  const canCreate = role === "admin" || role === "superadmin"

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [scopeList, setScopeList] = useState<ScopeDef[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: "", scopes: [] as string[], expiresInDays: "" as string })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Raw key — shown once after creation, never again
  const [newlyCreated, setNewlyCreated] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Deletion confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const headers = orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>)

  const fetchAll = useCallback(async () => {
    try {
      const [keysRes, scopesRes] = await Promise.all([
        fetch("/api/v1/api-keys", { headers }).then((r) => r.json()),
        fetch("/api/v1/api-keys/scopes", { headers }).then((r) => r.json()),
      ])
      if (keysRes.success) setKeys(keysRes.data)
      if (scopesRes.success) {
        // scopes endpoint returns `{ modules, scopes }` — flatten scopes
        // into a shape the UI can render as a checkbox list.
        const raw = scopesRes.data?.scopes
        const flat: ScopeDef[] = Array.isArray(raw)
          ? raw.map((s: unknown) =>
              typeof s === "string"
                ? { key: s, label: s }
                : (s as ScopeDef),
            )
          : Object.entries(raw || {}).map(([k, v]) => ({
              key: k,
              label: typeof v === "string" ? v : k,
            }))
        setScopeList(flat)
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    if (orgId) void fetchAll()
  }, [orgId, fetchAll])

  function toggleScope(s: string) {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s],
    }))
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!form.name.trim() || form.scopes.length === 0) {
      setCreateError("Name and at least one scope required")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: form.name,
          scopes: form.scopes,
          ...(form.expiresInDays ? { expiresInDays: Number(form.expiresInDays) } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setCreateError(json.error || "Failed to create")
        return
      }
      setNewlyCreated({ key: json.data.key, name: json.data.name })
      setCreateOpen(false)
      setForm({ name: "", scopes: [], expiresInDays: "" })
      void fetchAll()
    } finally {
      setCreating(false)
    }
  }

  async function doDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE", headers })
      await fetchAll()
    } finally {
      setDeletingId(null)
    }
  }

  async function copyKey() {
    if (!newlyCreated) return
    try {
      await navigator.clipboard.writeText(newlyCreated.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" />
            API Keys
          </h1>
          <PageDescription text="Ключи для программного доступа к LeadDrive API. Используйте их в интеграциях (заголовок Authorization: Bearer ld_…). Создаёт только администратор, отзываемо в любой момент." />
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Создать ключ
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Загрузка…</div>
      ) : keys.length === 0 ? (
        <div className="border rounded-lg py-12 text-center">
          <Key className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-medium">Нет ключей</p>
          <p className="text-sm text-muted-foreground mt-1">
            Создайте первый ключ для подключения внешних систем.
          </p>
          {canCreate && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Создать ключ
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="border rounded-lg p-4 flex items-center gap-4 bg-card">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{k.name}</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{k.keyPrefix}…</code>
                  {k.isActive ? (
                    <Badge variant="outline" className="border-emerald-400 text-emerald-600 text-[10px]">
                      active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-400 text-red-600 text-[10px]">
                      revoked
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {k.scopes.length} scope{k.scopes.length !== 1 ? "s" : ""}
                  </span>
                  {k.lastUsedAt && (
                    <span>Last used: {new Date(k.lastUsedAt).toLocaleDateString("ru-RU")}</span>
                  )}
                  {k.expiresAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(k.expiresAt).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                  <span>Created: {new Date(k.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {k.scopes.slice(0, 6).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                      {s}
                    </span>
                  ))}
                  {k.scopes.length > 6 && (
                    <span className="text-[10px] text-muted-foreground">+{k.scopes.length - 6}</span>
                  )}
                </div>
              </div>
              {canCreate && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deletingId === k.id}
                  onClick={() => {
                    if (confirm(`Отозвать ключ "${k.name}"? Интеграции с этим ключом перестанут работать.`)) {
                      void doDelete(k.id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader>
          <DialogTitle>Новый API ключ</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogContent>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Production integration"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Внутреннее имя — чтобы различать ключи разных интеграций.
                </p>
              </div>

              <div>
                <Label>Срок действия</Label>
                <Select
                  value={form.expiresInDays}
                  onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
                >
                  <option value="">Бессрочный</option>
                  <option value="30">30 дней</option>
                  <option value="90">90 дней</option>
                  <option value="365">1 год</option>
                </Select>
              </div>

              <div>
                <Label>Права доступа (scopes)</Label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Выбирайте только то, что реально нужно интеграции — принцип наименьших привилегий.
                </p>
                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-1.5 bg-muted/20">
                  {scopeList.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Загрузка scope-ов…</p>
                  ) : (
                    scopeList.map((s) => (
                      <label key={s.key} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded p-1">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={form.scopes.includes(s.key)}
                          onChange={() => toggleScope(s.key)}
                        />
                        <span>
                          <span className="font-mono text-xs">{s.key}</span>
                          {s.description && (
                            <span className="block text-[11px] text-muted-foreground">{s.description}</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {createError && (
                <div className="text-sm text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded p-3">
                  {createError}
                </div>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Создание…" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Show raw key once */}
      <Dialog open={!!newlyCreated} onOpenChange={(o) => !o && setNewlyCreated(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Ключ создан
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Скопируйте ключ сейчас — после закрытия окна он больше не будет показан. Храните его в безопасном месте (например, в password manager).
              </p>
            </div>

            <div>
              <Label className="text-xs">Название</Label>
              <p className="text-sm">{newlyCreated?.name}</p>
            </div>

            <div>
              <Label className="text-xs">API ключ</Label>
              <div className="flex gap-2">
                <Input readOnly value={newlyCreated?.key || ""} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyKey}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono break-all">
              <div className="text-muted-foreground mb-1">Пример использования:</div>
              curl -H &quot;Authorization: Bearer {newlyCreated?.key}&quot; \<br />
              {"  "}https://app.leaddrivecrm.org/api/v1/contacts
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setNewlyCreated(null)}>Готово</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
