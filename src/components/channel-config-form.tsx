"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Mail, Send, MessageSquare, Smartphone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChannelConfigFormData {
  configName: string
  channelType: string
  botToken: string
  webhookUrl: string
  apiKey: string
  phoneNumber: string
  isActive: boolean
}

interface ChannelConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<ChannelConfigFormData> & { id?: string }
  orgId?: string
}

const channelTypes = [
  { value: "email", label: "Email", icon: Mail, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", borderActive: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  { value: "telegram", label: "Telegram", icon: Send, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30", borderActive: "border-sky-500 bg-sky-50 dark:bg-sky-900/20" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", borderActive: "border-green-500 bg-green-50 dark:bg-green-900/20" },
  { value: "sms", label: "SMS", icon: Smartphone, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30", borderActive: "border-gray-500 bg-gray-50 dark:bg-gray-900/20" },
]

export function ChannelConfigForm({ open, onOpenChange, onSaved, initialData, orgId }: ChannelConfigFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ChannelConfigFormData>({
    configName: "",
    channelType: "email",
    botToken: "",
    webhookUrl: "",
    apiKey: "",
    phoneNumber: "",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        configName: initialData?.configName || "",
        channelType: initialData?.channelType || "email",
        botToken: initialData?.botToken || "",
        webhookUrl: initialData?.webhookUrl || "",
        apiKey: initialData?.apiKey || "",
        phoneNumber: initialData?.phoneNumber || "",
        isActive: initialData?.isActive ?? true,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.configName.trim()) {
      setError("Введите название канала")
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/channels/${initialData!.id}` : "/api/v1/channels"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          configName: form.configName,
          channelType: form.channelType,
          botToken: form.botToken || undefined,
          webhookUrl: form.webhookUrl || undefined,
          apiKey: form.apiKey || undefined,
          phoneNumber: form.phoneNumber || undefined,
          isActive: form.isActive,
        }),
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

  const update = (key: keyof ChannelConfigFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Редактировать канал" : "Новый канал"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Название */}
            <div>
              <Label htmlFor="configName" className="text-sm font-medium">Название</Label>
              <Input
                id="configName"
                value={form.configName}
                onChange={(e) => update("configName", e.target.value)}
                placeholder="Например: Рабочий Email, Telegram бот"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Описательное название для идентификации в списках
              </p>
            </div>

            {/* Тип канала — визуальный выбор */}
            <div>
              <Label className="text-sm font-medium">Тип канала</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {channelTypes.map(ct => {
                  const Icon = ct.icon
                  const selected = form.channelType === ct.value
                  return (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => update("channelType", ct.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all",
                        selected
                          ? ct.borderActive + " border-2"
                          : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", selected ? ct.color : "")} />
                      {ct.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Тип канала связи — Telegram, WhatsApp, Email или SMS
              </p>
            </div>

            {/* Динамические поля по типу канала */}
            {form.channelType === "telegram" && (
              <div>
                <Label htmlFor="botToken" className="text-sm font-medium">Bot Token</Label>
                <Input
                  id="botToken"
                  value={form.botToken}
                  onChange={(e) => update("botToken", e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="mt-1.5 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Токен от @BotFather в Telegram
                </p>
              </div>
            )}

            {form.channelType === "email" && (
              <>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">API Key / SMTP пароль</Label>
                  <Input
                    id="apiKey"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="sk-... или SMTP пароль"
                    className="mt-1.5 font-mono text-sm"
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    API ключ почтового сервиса или пароль приложения
                  </p>
                </div>
                <div>
                  <Label htmlFor="webhookUrl" className="text-sm font-medium">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={form.webhookUrl}
                    onChange={(e) => update("webhookUrl", e.target.value)}
                    placeholder="https://hooks.example.com/..."
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL для входящих уведомлений (опционально)
                  </p>
                </div>
              </>
            )}

            {form.channelType === "whatsapp" && (
              <>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
                  <Input
                    id="apiKey"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="Ключ WhatsApp Business API"
                    className="mt-1.5 font-mono text-sm"
                    type="password"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">Номер телефона</Label>
                  <Input
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    placeholder="+994501234567"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Номер, подключённый к WhatsApp Business
                  </p>
                </div>
              </>
            )}

            {form.channelType === "sms" && (
              <>
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
                  <Input
                    id="apiKey"
                    value={form.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="Ключ SMS-сервиса"
                    className="mt-1.5 font-mono text-sm"
                    type="password"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">Номер отправителя</Label>
                  <Input
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    placeholder="+994501234567"
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            {/* Статус */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
                className="rounded h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">Канал активен</span>
                <p className="text-xs text-muted-foreground">Неактивные каналы не будут использоваться для отправки</p>
              </div>
            </label>
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
