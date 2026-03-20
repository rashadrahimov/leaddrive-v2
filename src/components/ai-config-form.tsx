"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  X, Zap, BrainCircuit, Sparkles, Save,
  Ticket, FilePlus, FileText, FolderOpen, PhoneForwarded,
  BookOpen, MessageCircle,
} from "lucide-react"

interface AiConfigFormData {
  configName: string
  model: string
  maxTokens: number
  temperature: number
  systemPrompt: string
  toolsEnabled: string[]
  kbEnabled: boolean
  kbMaxArticles: number
  isActive: boolean
  notes: string
}

interface AiConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<AiConfigFormData> & { id?: string }
  orgId?: string
}

const MODEL_OPTIONS = [
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    desc: "Быстрые ответы, низкая стоимость. Идеален для стандартных запросов.",
    price: "$0.8 вход / $4 выход за 1М токенов",
    icon: Zap,
    color: "from-emerald-400 to-teal-500",
    bgSelected: "border-emerald-400 bg-emerald-50/50",
  },
  {
    id: "claude-sonnet-4-6-20250514",
    name: "Claude Sonnet 4.6",
    desc: "Баланс скорости и качества. Хорош для сложных запросов.",
    price: "$3 вход / $15 выход за 1М токенов",
    icon: BrainCircuit,
    color: "from-blue-400 to-indigo-500",
    bgSelected: "border-blue-400 bg-blue-50/50",
  },
  {
    id: "claude-opus-4-6-20250514",
    name: "Claude Opus 4.6",
    desc: "Максимальное качество. Для самых сложных задач.",
    price: "$15 вход / $75 выход за 1М токенов",
    icon: Sparkles,
    color: "from-purple-400 to-pink-500",
    bgSelected: "border-purple-400 bg-purple-50/50",
  },
]

const AVAILABLE_TOOLS = [
  { id: "get_tickets", name: "Получить тикеты", desc: "Получение списка тикетов клиента из CRM", icon: Ticket, color: "bg-blue-100 text-blue-600" },
  { id: "create_ticket", name: "Создать тикет", desc: "Создание нового тикета от имени клиента", icon: FilePlus, color: "bg-green-100 text-green-600" },
  { id: "contracts", name: "Контракты", desc: "Просмотр контрактов и условий", icon: FileText, color: "bg-purple-100 text-purple-600" },
  { id: "documents", name: "Документы", desc: "Доступ к документам клиента", icon: FolderOpen, color: "bg-amber-100 text-amber-600" },
  { id: "escalate_to_human", name: "Эскалация", desc: "Перевод разговора на живого оператора", icon: PhoneForwarded, color: "bg-red-100 text-red-600" },
  { id: "kb_search", name: "Поиск в KB", desc: "Поиск в базе знаний компании", icon: BookOpen, color: "bg-indigo-100 text-indigo-600" },
]

export function AiConfigForm({ open, onOpenChange, onSaved, initialData, orgId }: AiConfigFormProps) {
  const isEdit = !!initialData?.id

  const parseTools = (tools: any): string[] => {
    if (Array.isArray(tools)) return tools
    if (typeof tools === "string" && tools.trim()) return tools.split(",").map(s => s.trim()).filter(Boolean)
    return []
  }

  const [form, setForm] = useState<AiConfigFormData>({
    configName: initialData?.configName || "",
    model: initialData?.model || "claude-haiku-4-5-20251001",
    maxTokens: Number(initialData?.maxTokens) || 2048,
    temperature: Number(initialData?.temperature) || 0.7,
    systemPrompt: initialData?.systemPrompt || "",
    toolsEnabled: parseTools(initialData?.toolsEnabled),
    kbEnabled: initialData?.kbEnabled ?? true,
    kbMaxArticles: Number(initialData?.kbMaxArticles) || 5,
    isActive: initialData?.isActive ?? true,
    notes: initialData?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        configName: initialData?.configName || "",
        model: initialData?.model || "claude-haiku-4-5-20251001",
        maxTokens: Number(initialData?.maxTokens) || 2048,
        temperature: Number(initialData?.temperature) || 0.7,
        systemPrompt: initialData?.systemPrompt || "",
        toolsEnabled: parseTools(initialData?.toolsEnabled),
        kbEnabled: initialData?.kbEnabled ?? true,
        kbMaxArticles: Number(initialData?.kbMaxArticles) || 5,
        isActive: initialData?.isActive ?? true,
        notes: initialData?.notes || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async () => {
    if (!form.configName.trim()) { setError("Введите название конфигурации"); return }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/ai-configs/${initialData!.id}` : "/api/v1/ai-configs"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(form),
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

  const toggleTool = (toolId: string) => {
    setForm(f => ({
      ...f,
      toolsEnabled: f.toolsEnabled.includes(toolId)
        ? f.toolsEnabled.filter(t => t !== toolId)
        : [...f.toolsEnabled, toolId],
    }))
  }

  if (!open) return null

  const selectedModel = MODEL_OPTIONS.find(m => m.id === form.model) || MODEL_OPTIONS[0]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{isEdit ? "Редактирование конфигурации" : "Новая конфигурация"}</h2>
              <p className="text-sm text-gray-500">Настройте параметры AI-агента</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</div>}

          {/* ── Config Name ── */}
          <div>
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span> Название конфигурации
            </label>
            <Input
              value={form.configName}
              onChange={(e) => setForm(f => ({ ...f, configName: e.target.value }))}
              placeholder="LeadDrive Support Pro"
              className="text-base h-12 rounded-xl"
            />
          </div>

          {/* ── Model Selection Cards ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold">Модель AI</h3>
                <p className="text-xs text-gray-500">Выберите модель для ответов агента</p>
              </div>
            </div>

            <div className="space-y-3">
              {MODEL_OPTIONS.map(model => {
                const Icon = model.icon
                const isSelected = form.model === model.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, model: model.id }))}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      isSelected ? model.bgSelected + " shadow-sm" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                    )}
                  >
                    <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", model.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{model.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">Выбрана</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{model.desc}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span>💰</span> {model.price}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Parameters with Sliders ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-sm">⚙️</span>
              </div>
              <div>
                <h3 className="font-semibold">Параметры</h3>
                <p className="text-xs text-gray-500">Настройте длину ответов, температуру и лимиты</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Max Tokens slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <span className="text-base">🎯</span> Макс. токенов
                    <span className="text-[10px] text-gray-400">Длина ответа</span>
                  </span>
                  <span className="text-lg font-bold text-blue-600">{form.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={256}
                  value={form.maxTokens}
                  onChange={(e) => setForm(f => ({ ...f, maxTokens: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>256</span>
                  <span>4096</span>
                </div>
              </div>

              {/* Temperature slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <span className="text-base">🌡️</span> Температура
                    <span className="text-[10px] text-gray-400">Креативность</span>
                  </span>
                  <span className="text-lg font-bold text-blue-600">{form.temperature}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => setForm(f => ({ ...f, temperature: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0</span>
                  <span>2</span>
                </div>
              </div>

              {/* KB Max Articles slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <span className="text-base">📚</span> Статей из KB
                    <span className="text-[10px] text-gray-400">Макс. контекст</span>
                  </span>
                  <span className="text-lg font-bold text-blue-600">{form.kbMaxArticles}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={form.kbMaxArticles}
                  onChange={(e) => setForm(f => ({ ...f, kbMaxArticles: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              {/* Active + KB toggle */}
              <div className="flex flex-col justify-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    form.isActive ? "bg-blue-500" : "bg-gray-300"
                  )} onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                    <div className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.isActive ? "translate-x-[22px]" : "translate-x-0.5"
                    )} />
                  </div>
                  <span className="text-sm font-medium">Активен</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    form.kbEnabled ? "bg-blue-500" : "bg-gray-300"
                  )} onClick={() => setForm(f => ({ ...f, kbEnabled: !f.kbEnabled }))}>
                    <div className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.kbEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                    )} />
                  </div>
                  <span className="text-sm font-medium">База знаний</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Tools Toggle Cards ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-sm">🔧</span>
              </div>
              <div>
                <h3 className="font-semibold">Инструменты</h3>
                <p className="text-xs text-gray-500">Включите/выключите доступные инструменты CRM</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_TOOLS.map(tool => {
                const Icon = tool.icon
                const isEnabled = form.toolsEnabled.includes(tool.id)
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      isEnabled
                        ? "border-blue-300 bg-blue-50/60 shadow-sm"
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {/* Toggle */}
                    <div className={cn(
                      "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                      isEnabled ? "bg-blue-500" : "bg-gray-300"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        isEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                      )} />
                    </div>
                    {/* Icon */}
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", tool.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {/* Text */}
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{tool.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{tool.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── System Prompt ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold">Системный промпт</h3>
                <p className="text-xs text-gray-500">Инструкции для AI-агента</p>
              </div>
            </div>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              rows={6}
              placeholder="Вы — помощник техподдержки LeadDrive CRM. Отвечайте профессионально и кратко..."
              className="rounded-xl"
            />
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <span className="text-lg">📝</span> Заметки
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Дополнительные заметки..."
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50/50 rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-6">
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Сохранение..." : isEdit ? "Сохранить изменения" : "Создать агента"}
          </Button>
        </div>
      </div>
    </div>
  )
}
