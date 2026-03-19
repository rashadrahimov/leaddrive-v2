"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Trash2, Eye, Code, Bold, Italic, Underline, List, ListOrdered, Link } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailTemplateFormData {
  name: string
  subject: string
  htmlBody: string
  category: string
  language: string
  isActive: boolean
}

interface EmailTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: any
  orgId?: string
  onDelete?: () => void
}

const variableButtons = [
  { label: "Имя клиента", variable: "client_name", icon: "👤" },
  { label: "Email клиента", variable: "client_email", icon: "📧" },
  { label: "Компания", variable: "company", icon: "🏢" },
  { label: "Услуга", variable: "service", icon: "🔧" },
  { label: "Новые услуги", variable: "new_services", icon: "🆕" },
  { label: "Улучшения", variable: "improvements", icon: "📊" },
  { label: "Предстоящее", variable: "upcoming", icon: "📅" },
  { label: "Дата", variable: "date", icon: "📆" },
  { label: "Месяц", variable: "month", icon: "🗓" },
  { label: "Год", variable: "year", icon: "📅" },
]

const categoryOptions = [
  { value: "general", label: "Общее" },
  { value: "welcome", label: "Приветствие" },
  { value: "onboarding", label: "Онбординг" },
  { value: "notification", label: "Уведомление" },
  { value: "marketing", label: "Рассылка" },
  { value: "follow_up", label: "Последующее" },
  { value: "proposal", label: "Предложение" },
]

export function EmailTemplateForm({ open, onOpenChange, onSaved, initialData, orgId, onDelete }: EmailTemplateFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<EmailTemplateFormData>({
    name: "",
    subject: "",
    htmlBody: "",
    category: "general",
    language: "ru",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor")
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        subject: initialData?.subject || "",
        htmlBody: initialData?.htmlBody || "",
        category: initialData?.category || "general",
        language: initialData?.language || "ru",
        isActive: initialData?.isActive !== false,
      })
      setError("")
      setActiveTab("editor")
    }
  }, [open, initialData])

  // Sync contentEditable with form state
  useEffect(() => {
    if (editorRef.current && activeTab === "editor") {
      if (editorRef.current.innerHTML !== form.htmlBody) {
        editorRef.current.innerHTML = form.htmlBody
      }
    }
  }, [activeTab, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject) {
      setError("Заполните название и тему письма")
      return
    }
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/email-templates/${initialData!.id}` : "/api/v1/email-templates"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
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

  const update = (key: keyof EmailTemplateFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    syncEditorContent()
  }

  const syncEditorContent = () => {
    if (editorRef.current) {
      update("htmlBody", editorRef.current.innerHTML)
    }
  }

  const insertVariable = (variable: string) => {
    const tag = `{{${variable}}}`
    if (activeTab === "editor" && editorRef.current) {
      editorRef.current.focus()
      document.execCommand("insertText", false, tag)
      syncEditorContent()
    } else {
      update("htmlBody", form.htmlBody + tag)
    }
  }

  const toggleHtmlMode = () => {
    if (activeTab === "editor") {
      // Switch to showing raw HTML in a textarea-like view
      setActiveTab("preview")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? "Редактировать шаблон" : "Новый шаблон"}</DialogTitle>
          {isEdit && (
            <button
              type="button"
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors",
                form.isActive
                  ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-gray-50 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400"
              )}
              onClick={() => update("isActive", !form.isActive)}
            >
              {form.isActive ? "Активен" : "Неактивен"}
            </button>
          )}
        </div>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="max-h-[75vh] overflow-y-auto">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Название шаблона</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Категория</Label>
                <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                  {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            </div>

            {/* Subject + Language */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs uppercase text-muted-foreground">Тема письма</Label>
                <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Язык</Label>
                <Select value={form.language} onChange={(e) => update("language", e.target.value)}>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="az">🇦🇿 Азербайджанский</option>
                  <option value="en">🇬🇧 English</option>
                </Select>
              </div>
            </div>

            {/* Body editor */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Тело письма (HTML)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                💡 Нажмите на цветные кнопки под панелью чтобы вставить динамические поля
              </p>

              {/* Tabs: Editor / Preview */}
              <div className="flex border-b mb-0">
                <button
                  type="button"
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeTab === "editor"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("editor")}
                >
                  ✏️ Редактор
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeTab === "preview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("preview")}
                >
                  👁 Предпросмотр
                </button>
              </div>

              {activeTab === "editor" ? (
                <div className="border rounded-b-lg">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
                    <button type="button" onClick={() => execCommand("bold")} className="p-1.5 rounded hover:bg-muted" title="Жирный">
                      <Bold className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("italic")} className="p-1.5 rounded hover:bg-muted" title="Курсив">
                      <Italic className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("underline")} className="p-1.5 rounded hover:bg-muted" title="Подчёркнутый">
                      <Underline className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-1.5 rounded hover:bg-muted" title="Список">
                      <List className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-1.5 rounded hover:bg-muted" title="Нумерованный список">
                      <ListOrdered className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <select
                      className="text-xs border rounded px-1.5 py-1 bg-background"
                      onChange={e => { if (e.target.value) execCommand("fontSize", e.target.value); e.target.value = "" }}
                      defaultValue=""
                    >
                      <option value="" disabled>Разм</option>
                      <option value="1">Мелкий</option>
                      <option value="3">Обычный</option>
                      <option value="5">Крупный</option>
                      <option value="7">Огромный</option>
                    </select>
                    <input
                      type="color"
                      className="w-7 h-7 rounded border cursor-pointer"
                      title="Цвет"
                      onChange={e => execCommand("foreColor", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("URL ссылки:")
                        if (url) execCommand("createLink", url)
                      }}
                      className="p-1.5 rounded hover:bg-muted"
                      title="Ссылка"
                    >
                      <Link className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Toggle raw HTML editing
                        const current = editorRef.current
                        if (current) {
                          const isShowingCode = current.getAttribute("data-raw") === "true"
                          if (isShowingCode) {
                            const html = current.innerText
                            update("htmlBody", html)
                            current.innerHTML = html
                            current.removeAttribute("data-raw")
                          } else {
                            current.innerText = current.innerHTML
                            current.setAttribute("data-raw", "true")
                          }
                        }
                      }}
                      className="p-1.5 rounded hover:bg-muted"
                      title="HTML код"
                    >
                      <Code className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Variable insert buttons */}
                  <div className="flex flex-wrap gap-1.5 p-2 border-b bg-muted/10">
                    <span className="text-xs text-muted-foreground font-medium self-center mr-1">ВСТАВИТЬ:</span>
                    {variableButtons.map(v => (
                      <button
                        key={v.variable}
                        type="button"
                        onClick={() => insertVariable(v.variable)}
                        className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        {v.icon} {v.label}
                      </button>
                    ))}
                  </div>

                  {/* ContentEditable area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 focus:outline-none text-sm"
                    onInput={syncEditorContent}
                    onBlur={syncEditorContent}
                    suppressContentEditableWarning
                  />
                </div>
              ) : (
                /* Preview tab */
                <div className="border rounded-b-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-white dark:bg-gray-950">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: form.htmlBody
                        .replace(/\{\{client_name\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Иван Иванов</span>')
                        .replace(/\{\{client_email\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">ivan@example.com</span>')
                        .replace(/\{\{company\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Güven Technology</span>')
                        .replace(/\{\{service\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">CRM Service</span>')
                        .replace(/\{\{date\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">19.03.2026</span>')
                        .replace(/\{\{month\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Март</span>')
                        .replace(/\{\{year\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">2026</span>')
                        .replace(/\{\{(\w+)\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">{{$1}}</span>')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter className="flex-wrap gap-2">
          {isEdit && onDelete && (
            <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
