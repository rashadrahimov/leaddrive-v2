"use client"

import { useState } from "react"
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from "@/lib/finance/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit2, Building2, Star } from "lucide-react"
import type { BankAccount, CreateBankAccountInput } from "@/lib/finance/types"

export function BankAccountsManager() {
  const { data: accounts, isLoading } = useBankAccounts()
  const createAccount = useCreateBankAccount()
  const updateAccount = useUpdateBankAccount()
  const deleteAccount = useDeleteBankAccount()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>

  const editingAccount = editId ? accounts?.find((a: BankAccount) => a.id === editId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Банковские счета</h3>
          <p className="text-sm text-muted-foreground">Управление банковскими счетами организации</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Добавить счёт
        </Button>
      </div>

      {accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc: BankAccount) => (
            <Card key={acc.id} className={`relative ${!acc.isActive ? "opacity-60" : ""}`}>
              {acc.isDefault && (
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-amber-500" />
              )}
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">{acc.accountName}</p>
                      <p className="text-xs text-muted-foreground">{acc.bankName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {acc.isDefault && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                        <Star className="w-3 h-3 mr-0.5" /> По умолчанию
                      </Badge>
                    )}
                    {!acc.isActive && (
                      <Badge variant="secondary" className="text-[10px]">Неактивен</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {acc.accountNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Номер счёта</p>
                      <p className="font-mono text-xs">{acc.accountNumber}</p>
                    </div>
                  )}
                  {acc.bankCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">Код банка</p>
                      <p className="font-mono text-xs">{acc.bankCode}</p>
                    </div>
                  )}
                  {acc.swiftCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">SWIFT</p>
                      <p className="font-mono text-xs">{acc.swiftCode}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Валюта</p>
                    <p className="text-xs font-medium">{acc.currency}</p>
                  </div>
                </div>

                <div className="flex gap-1 pt-1 border-t">
                  {!acc.isDefault && acc.isActive && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateAccount.mutate({ id: acc.id, isDefault: true })}>
                      <Star className="w-3 h-3 mr-1" /> По умолчанию
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(acc.id)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Изменить
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => { if (confirm("Удалить этот банковский счёт?")) deleteAccount.mutate(acc.id) }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Банковских счетов пока нет</p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <BankAccountDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={(input) => createAccount.mutate(input, { onSuccess: () => setShowCreate(false) })}
        isPending={createAccount.isPending}
        title="Новый банковский счёт"
      />

      {/* Edit Dialog */}
      {editingAccount && (
        <BankAccountDialog
          open={!!editId}
          onClose={() => setEditId(null)}
          onSave={(input) => updateAccount.mutate({ id: editId!, ...input }, { onSuccess: () => setEditId(null) })}
          isPending={updateAccount.isPending}
          title="Редактировать банковский счёт"
          initial={editingAccount}
        />
      )}
    </div>
  )
}

function BankAccountDialog({ open, onClose, onSave, isPending, title, initial }: {
  open: boolean; onClose: () => void
  onSave: (input: CreateBankAccountInput) => void
  isPending: boolean; title: string
  initial?: BankAccount
}) {
  const [form, setForm] = useState({
    accountName: initial?.accountName || "",
    accountNumber: initial?.accountNumber || "",
    bankName: initial?.bankName || "",
    bankCode: initial?.bankCode || "",
    swiftCode: initial?.swiftCode || "",
    currency: initial?.currency || "AZN",
    isDefault: initial?.isDefault || false,
  })

  const handleSubmit = () => {
    if (!form.accountName || !form.bankName) return
    onSave({
      accountName: form.accountName,
      bankName: form.bankName,
      accountNumber: form.accountNumber || undefined,
      bankCode: form.bankCode || undefined,
      swiftCode: form.swiftCode || undefined,
      currency: form.currency,
      isDefault: form.isDefault,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Название счёта *</Label>
            <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="напр. Основной расчётный счёт" />
          </div>
          <div>
            <Label className="text-xs">Банк *</Label>
            <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="напр. Kapital Bank" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Номер счёта</Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="AZ..." className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">Код банка</Label>
              <Input value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} placeholder="505037" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">SWIFT</Label>
              <Input value={form.swiftCode} onChange={(e) => setForm({ ...form, swiftCode: e.target.value })} placeholder="AIIBAZ2X" />
            </div>
            <div>
              <Label className="text-xs">Валюта</Label>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="AZN" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded border-border" />
            <span className="text-sm">Счёт по умолчанию</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.accountName || !form.bankName}>
            {isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
