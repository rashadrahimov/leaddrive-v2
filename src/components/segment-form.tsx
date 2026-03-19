"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { X, Eye, Building2, LinkIcon, UserCircle, Tag, Calendar, Type, Mail, Phone } from "lucide-react"

interface SegmentConditions {
  company: string
  source: string
  role: string
  tag: string
  createdAfter: string
  createdBefore: string
  name: string
  hasEmail: boolean
  hasPhone: boolean
}

const emptyConditions: SegmentConditions = {
  company: "",
  source: "",
  role: "",
  tag: "",
  createdAfter: "",
  createdBefore: "",
  name: "",
  hasEmail: false,
  hasPhone: false,
}

const sourceOptions = [
  { value: "", label: "— Любой —" },
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "cold_call", label: "Холодный звонок" },
  { value: "email", label: "Email" },
  { value: "social", label: "Соц. сети" },
  { value: "event", label: "Мероприятие" },
  { value: "other", label: "Другое" },
]

interface SegmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: any
  orgId?: string
}

export function SegmentForm({ open, onOpenChange, onSaved, initialData, orgId }: SegmentFormProps) {
  const isEdit = !!initialData?.id
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDynamic, setIsDynamic] = useState(true)
  const [conditions, setConditions] = useState<SegmentConditions>(emptyConditions)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialData?.name || "")
      setDescription(initialData?.description || "")
      setIsDynamic(initialData?.isDynamic !== false)
      setPreviewCount(null)
      setError("")

      if (initialData?.conditions && typeof initialData.conditions === "object") {
        const c = initialData.conditions as any
        setConditions({
          company: c.company || "",
          source: c.source || "",
          role: c.role || "",
          tag: c.tag || "",
          createdAfter: c.createdAfter || c.created_after || "",
          createdBefore: c.createdBefore || c.created_before || "",
          name: c.name || "",
          hasEmail: !!c.hasEmail || !!c.has_email,
          hasPhone: !!c.hasPhone || !!c.has_phone,
        })
      } else {
        setConditions(emptyConditions)
      }
    }
  }, [open, initialData])

  const updateCond = (key: keyof SegmentConditions, value: any) => {
    setConditions(c => ({ ...c, [key]: value }))
    setPreviewCount(null)
  }

  const getCleanConditions = () => {
    const clean: any = {}
    if (conditions.company.trim()) clean.company = conditions.company.trim()
    if (conditions.source) clean.source = conditions.source
    if (conditions.role.trim()) clean.role = conditions.role.trim()
    if (conditions.tag.trim()) clean.tag = conditions.tag.trim()
    if (conditions.createdAfter) clean.createdAfter = conditions.createdAfter
    if (conditions.createdBefore) clean.createdBefore = conditions.createdBefore
    if (conditions.name.trim()) clean.name = conditions.name.trim()
    if (conditions.hasEmail) clean.hasEmail = true
    if (conditions.hasPhone) clean.hasPhone = true
    return clean
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch("/api/v1/segments/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ conditions: getCleanConditions() }),
      })
      const json = await res.json()
      if (json.success) setPreviewCount(json.data.count)
    } catch {} finally { setPreviewing(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Введите название сегмента")
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/segments/${initialData!.id}` : "/api/v1/segments"
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        isDynamic,
        conditions: getCleanConditions(),
        contactCount: previewCount ?? initialData?.contactCount ?? 0,
      }
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify(payload),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? "Редактировать сегмент" : "Новый сегмент"}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Задайте условия фильтрации контактов</p>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            {/* Name */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Название *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='напр. «VIP клиенты» или «IT лиды»'
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Описание</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Необязательное описание для чего нужен этот сегмент"
                rows={2}
              />
            </div>

            {/* Type toggle */}
            <div className="flex items-center gap-3">
              <input
                id="isDynamic"
                type="checkbox"
                checked={isDynamic}
                onChange={e => setIsDynamic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDynamic" className="text-sm">
                Динамический сегмент
                <span className="text-xs text-muted-foreground ml-1">(автоматически обновляется)</span>
              </Label>
            </div>

            {/* Conditions builder */}
            <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30">
              <div className="px-4 py-3 border-b border-purple-200/50 dark:border-purple-800/30">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                  </span>
                  Условия
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Все условия объединяются логикой И</p>
              </div>
              <div className="p-4 grid gap-4">
                {/* Row 1: Company + Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Компания
                    </Label>
                    <Input
                      value={conditions.company}
                      onChange={e => updateCond("company", e.target.value)}
                      placeholder="Содержит..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Частичное совпадение</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" /> Источник
                    </Label>
                    <Select
                      value={conditions.source}
                      onChange={e => updateCond("source", e.target.value)}
                    >
                      {sourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Откуда пришёл контакт?</p>
                  </div>
                </div>

                {/* Row 2: Role + Tag */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserCircle className="h-3 w-3" /> Роль
                    </Label>
                    <Input
                      value={conditions.role}
                      onChange={e => updateCond("role", e.target.value)}
                      placeholder="Содержит..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">напр. «CEO», «Менеджер»</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Тег
                    </Label>
                    <Input
                      value={conditions.tag}
                      onChange={e => updateCond("tag", e.target.value)}
                      placeholder="Имя тега"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Контакты с этим тегом</p>
                  </div>
                </div>

                {/* Row 3: Created dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Создан после
                    </Label>
                    <Input
                      type="date"
                      value={conditions.createdAfter}
                      onChange={e => updateCond("createdAfter", e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Контакты после этой даты</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Создан до
                    </Label>
                    <Input
                      type="date"
                      value={conditions.createdBefore}
                      onChange={e => updateCond("createdBefore", e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Контакты до этой даты</p>
                  </div>
                </div>

                {/* Row 4: Name + checkboxes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Type className="h-3 w-3" /> Имя
                    </Label>
                    <Input
                      value={conditions.name}
                      onChange={e => updateCond("name", e.target.value)}
                      placeholder="Содержит..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">По имени/фамилии контакта</p>
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conditions.hasEmail}
                        onChange={e => updateCond("hasEmail", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Есть Email
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conditions.hasPhone}
                        onChange={e => updateCond("hasPhone", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Есть Телефон
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview result */}
            {previewCount !== null && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-center">
                <p className="text-sm">
                  Найдено контактов: <span className="font-bold text-blue-700 dark:text-blue-300 text-lg">{previewCount.toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={previewing}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            {previewing ? "Загрузка..." : "Предпросмотр"}
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
