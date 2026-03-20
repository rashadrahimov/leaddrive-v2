"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface JourneyFormData {
  name: string
  description: string
  status: string
  triggerType: string
}

interface JourneyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<JourneyFormData> & { id?: string }
  orgId?: string
}

export function JourneyForm({ open, onOpenChange, onSaved, initialData, orgId }: JourneyFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<JourneyFormData>({
    name: "",
    description: "",
    status: "draft",
    triggerType: "manual",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        status: initialData?.status || "draft",
        triggerType: initialData?.triggerType || "manual",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Введите название цепочки")
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/journeys/${initialData!.id}` : "/api/v1/journeys"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Ошибка сохранения")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof JourneyFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Редактировать цепочку" : "Новая цепочка"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Название *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Например: Онбординг нового клиента"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status" className="text-sm font-medium">Статус</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)} className="mt-1.5">
                  <option value="draft">Черновик</option>
                  <option value="active">Активный</option>
                  <option value="paused">Приостановлен</option>
                  <option value="completed">Завершён</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="triggerType" className="text-sm font-medium">Триггер</Label>
                <Select value={form.triggerType} onChange={(e) => update("triggerType", e.target.value)} className="mt-1.5">
                  <option value="manual">Вручную</option>
                  <option value="lead_created">Новый лид</option>
                  <option value="contact_created">Новый контакт</option>
                  <option value="deal_stage_change">Смена стадии сделки</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Описание</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Краткое описание цепочки и её цели..."
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
