"use client"

import { useState } from "react"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { MessageSquareWarning } from "lucide-react"

export type ComplaintMetaInput = {
  complaintType: "complaint" | "suggestion"
  brand: string
  productionArea: string
  productCategory: string
  complaintObject: string
  complaintObjectDetail: string
  responsibleDepartment: string
  riskLevel: "low" | "medium" | "high"
}

export const EMPTY_COMPLAINT_META: ComplaintMetaInput = {
  complaintType: "complaint",
  brand: "",
  productionArea: "",
  productCategory: "",
  complaintObject: "",
  complaintObjectDetail: "",
  responsibleDepartment: "",
  riskLevel: "medium",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  orgId?: string
  onConverted?: (id: string) => void
}

// Dialog that converts an existing ticket into a Complaint Register entry by
// POSTing to /api/v1/tickets/[id]/convert-to-complaint with the industrial
// meta-fields. Closes and navigates caller-side on success.
export function ConvertToComplaintDialog({ open, onOpenChange, ticketId, orgId, onConverted }: Props) {
  const [form, setForm] = useState<ComplaintMetaInput>(EMPTY_COMPLAINT_META)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function u<K extends keyof ComplaintMetaInput>(k: K, v: ComplaintMetaInput[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/convert-to-complaint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          complaintType: form.complaintType,
          brand: form.brand || null,
          productionArea: form.productionArea || null,
          productCategory: form.productCategory || null,
          complaintObject: form.complaintObject || null,
          complaintObjectDetail: form.complaintObjectDetail || null,
          responsibleDepartment: form.responsibleDepartment || null,
          riskLevel: form.riskLevel,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Не удалось конвертировать")
        return
      }
      onConverted?.(ticketId)
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сети")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-amber-600" />
          Перевести в реестр жалоб
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          <p className="text-sm text-muted-foreground mb-3">
            Этот тикет появится в разделе «Реестр жалоб» вместе с отраслевыми полями. Тема, описание,
            статус и ответы сохранятся.
          </p>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">
              {error}
            </div>
          )}
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип</Label>
                <Select value={form.complaintType} onChange={(e) => u("complaintType", e.target.value as "complaint" | "suggestion")}>
                  <option value="complaint">Жалоба</option>
                  <option value="suggestion">Предложение</option>
                </Select>
              </div>
              <div>
                <Label>Уровень риска</Label>
                <Select value={form.riskLevel} onChange={(e) => u("riskLevel", e.target.value as "low" | "medium" | "high")}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Бренд</Label>
                <Input value={form.brand} onChange={(e) => u("brand", e.target.value)} />
              </div>
              <div>
                <Label>Область производства</Label>
                <Input value={form.productionArea} onChange={(e) => u("productionArea", e.target.value)} />
              </div>
              <div>
                <Label>Категория продукта</Label>
                <Input value={form.productCategory} onChange={(e) => u("productCategory", e.target.value)} />
              </div>
              <div>
                <Label>Объект жалобы</Label>
                <Input value={form.complaintObject} onChange={(e) => u("complaintObject", e.target.value)} />
              </div>
              <div>
                <Label>Объект жалобы 2</Label>
                <Input value={form.complaintObjectDetail} onChange={(e) => u("complaintObjectDetail", e.target.value)} />
              </div>
              <div>
                <Label>Ответственный отдел</Label>
                <Input
                  value={form.responsibleDepartment}
                  onChange={(e) => u("responsibleDepartment", e.target.value)}
                  placeholder="Keyfiyyət nəzarət şöbəsi…"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Если оставить «Риск» или «Отдел» пустыми, AI попробует подсказать на основе описания.
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Конвертация…" : "Перевести"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
