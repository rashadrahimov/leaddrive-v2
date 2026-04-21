"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Trash2, Eye, Code, Bold, Italic, Underline, List, ListOrdered, Link, X, Undo, Redo, AlignLeft, AlignCenter, AlignRight, Image } from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeRichHtml } from "@/lib/sanitize"

interface EmailTemplateFormData {
  name: string
  subject: string
  htmlBody: string
  category: string
  language: string
  isActive: boolean
  designJson: any | null
  editorType: "html" | "visual"
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
  { labelKey: "varClientName", variable: "client_name", icon: "👤" },
  { labelKey: "varClientEmail", variable: "client_email", icon: "📧" },
  { labelKey: "varCompany", variable: "company", icon: "🏢" },
  { labelKey: "varService", variable: "service", icon: "🔧" },
  { labelKey: "varNewServices", variable: "new_services", icon: "🆕" },
  { labelKey: "varImprovements", variable: "improvements", icon: "📊" },
  { labelKey: "varUpcoming", variable: "upcoming", icon: "📅" },
  { labelKey: "varDate", variable: "date", icon: "📆" },
  { labelKey: "varMonth", variable: "month", icon: "🗓" },
  { labelKey: "varYear", variable: "year", icon: "📅" },
]

// Pre-styled block snippets the user can drop into the WYSIWYG canvas.
// All styling is inline + email-safe (Gmail / Outlook / Apple Mail render
// identically). These replace Unlayer's drag-drop block palette — a user
// clicks once, the HTML lands at the cursor, and the block is then
// freely editable in the contentEditable surface.
const BLOCK_TEMPLATES: { key: string; label: string; icon: string; html: string }[] = [
  {
    key: "hero",
    label: "Hero / Заголовок",
    icon: "🎯",
    html: `<div style="background:#0f172a;color:#ffffff;padding:40px 24px;text-align:center;border-radius:8px;margin:12px 0;">
<h1 style="margin:0;font-size:28px;font-weight:700;line-height:1.3;">Ваш заголовок</h1>
<p style="margin:12px 0 0;font-size:16px;opacity:0.85;line-height:1.5;">Короткое вступление — 1-2 предложения о ценности.</p>
</div>`,
  },
  {
    key: "text",
    label: "Текстовый блок",
    icon: "📝",
    html: `<div style="padding:16px 0;font-size:15px;line-height:1.6;color:#1f2937;">
<p style="margin:0 0 12px;">Здравствуйте, {{client_name}}!</p>
<p style="margin:0;">Текст письма. Замените этот абзац на ваш контент — можно редактировать прямо здесь.</p>
</div>`,
  },
  {
    key: "button",
    label: "Кнопка CTA",
    icon: "🔘",
    html: `<div style="text-align:center;padding:20px 0;">
<a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:600;">Призыв к действию</a>
</div>`,
  },
  {
    key: "two-col",
    label: "2 колонки",
    icon: "⫴",
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
<td valign="top" style="width:50%;padding-right:12px;vertical-align:top;">
<h3 style="margin:0 0 8px;font-size:17px;color:#0f172a;">Колонка 1</h3>
<p style="margin:0;font-size:14px;line-height:1.5;color:#4b5563;">Описание первой колонки.</p>
</td>
<td valign="top" style="width:50%;padding-left:12px;vertical-align:top;">
<h3 style="margin:0 0 8px;font-size:17px;color:#0f172a;">Колонка 2</h3>
<p style="margin:0;font-size:14px;line-height:1.5;color:#4b5563;">Описание второй колонки.</p>
</td>
</tr></table>`,
  },
  {
    key: "image",
    label: "Картинка",
    icon: "🖼️",
    html: `<div style="text-align:center;padding:16px 0;">
<img src="https://placehold.co/600x300/e2e8f0/64748b?text=Замените+картинку" alt="Описание картинки" style="max-width:100%;height:auto;border-radius:6px;display:inline-block;" />
<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Подпись к картинке</p>
</div>`,
  },
  {
    key: "image-text",
    label: "Картинка + текст",
    icon: "🖼️📝",
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
<td style="width:40%;padding-right:16px;vertical-align:top;">
<img src="https://placehold.co/240x180/e2e8f0/64748b?text=Image" alt="" style="width:100%;height:auto;border-radius:6px;" />
</td>
<td style="vertical-align:top;">
<h3 style="margin:0 0 8px;font-size:17px;color:#0f172a;">Заголовок раздела</h3>
<p style="margin:0;font-size:14px;line-height:1.5;color:#4b5563;">Описание справа от картинки. Замените на ваш текст.</p>
</td>
</tr></table>`,
  },
  {
    key: "divider",
    label: "Разделитель",
    icon: "➖",
    html: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
  },
  {
    key: "quote",
    label: "Цитата",
    icon: "❝",
    html: `<blockquote style="margin:16px 0;padding:16px 20px;border-left:4px solid #2563eb;background:#eff6ff;color:#1e40af;font-size:15px;line-height:1.6;font-style:italic;">
«Цитата клиента или ключевая фраза. Замените на вашу.»
<footer style="margin-top:8px;font-size:13px;font-style:normal;color:#64748b;">— Автор, Должность</footer>
</blockquote>`,
  },
  {
    key: "footer",
    label: "Футер",
    icon: "🔚",
    html: `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;line-height:1.6;">
<p style="margin:0 0 6px;"><strong>{{company}}</strong></p>
<p style="margin:0;">Адрес компании · Телефон · <a href="#" style="color:#6b7280;text-decoration:underline;">Отписаться</a></p>
</div>`,
  },
]

export function EmailTemplateForm({ open, onOpenChange, onSaved, initialData, orgId, onDelete }: EmailTemplateFormProps) {
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const t = useTranslations("emailTemplates")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<EmailTemplateFormData>({
    name: "",
    subject: "",
    htmlBody: "",
    category: "general",
    language: "ru",
    isActive: true,
    designJson: null,
    editorType: "html",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "split">("editor")
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
        designJson: initialData?.designJson || null,
        editorType: initialData?.editorType || "html",
      })
      setError("")
      setActiveTab("editor")
    }
  }, [open, initialData])

  // Sync contentEditable with form state when switching to editor or opening
  const [editorInitialized, setEditorInitialized] = useState(false)
  useEffect(() => {
    if (open && activeTab === "editor" && editorRef.current && !editorInitialized) {
      editorRef.current.innerHTML = sanitizeRichHtml(form.htmlBody || "")
      setEditorInitialized(true)
    }
    if (!open) setEditorInitialized(false)
  }, [activeTab, open, form.htmlBody, editorInitialized])

  // Re-initialize editor when switching back from preview
  useEffect(() => {
    if (activeTab === "editor" && editorRef.current) {
      editorRef.current.innerHTML = sanitizeRichHtml(form.htmlBody || "")
    }
  }, [activeTab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject) {
      setError(t("errorNameSubject") || "Name and subject are required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/email-templates/${initialData!.id}` : "/api/v1/email-templates"
      const payload = {
        name: form.name,
        subject: form.subject,
        htmlBody: form.htmlBody,
        category: form.category,
        language: form.language,
        isActive: form.isActive,
        designJson: form.designJson,
        editorType: form.editorType,
      }
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc("failedToSave"))
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

  // Insert a pre-styled HTML block at the cursor position inside the
  // contentEditable. Email-safe inline styles are used (no external CSS,
  // no webfonts) so the output renders identically in Gmail, Outlook,
  // Apple Mail and Yandex.Mail.
  const insertBlock = (html: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()

    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const wrapper = document.createElement("div")
      wrapper.innerHTML = html
      const frag = document.createDocumentFragment()
      let node: ChildNode | null
      while ((node = wrapper.firstChild)) frag.appendChild(node)
      range.insertNode(frag)
      // Move cursor after inserted content
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      // No selection inside editor — append to end
      editorRef.current.insertAdjacentHTML("beforeend", html)
    }
    syncEditorContent()
  }

  const toggleHtmlMode = () => {
    if (activeTab === "editor") {
      // Switch to showing raw HTML in a textarea-like view
      setActiveTab("preview")
    }
  }

  // Always use a large dialog — email template editing needs breathing room
  // (toolbar, block palette, contentEditable canvas, preview). The old narrow
  // dialog was fine for a quick subject/category edit but unusable for actually
  // composing an email. Previously this was conditional on Unlayer mode; now
  // it's always on because the block-palette canvas needs the same real estate.
  const isFullscreen = true

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative bg-background rounded-lg shadow-lg flex flex-col",
            isFullscreen ? "w-full h-full max-w-[98vw] max-h-[98vh] overflow-visible" : "w-full max-w-lg max-h-[85vh] overflow-hidden"
          )}
          onClick={e => e.stopPropagation()}
        >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>{isEdit ? tf("editEmailTemplate") : tf("newEmailTemplate")}</DialogTitle>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  form.isActive
                    ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-muted text-muted-foreground border-border"
                )}
                onClick={() => update("isActive", !form.isActive)}
              >
                {form.isActive ? tc("active") : tc("inactive")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className={cn("flex-1 min-h-0", isFullscreen ? "p-4 flex flex-col" : "p-6 overflow-y-auto")}>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className={cn("gap-3", isFullscreen ? "flex flex-col flex-1 min-h-0" : "grid")}>
            {/* Name + Category — compact row in visual mode */}
            <div className={cn("grid gap-3", isFullscreen ? "grid-cols-4" : "grid-cols-2")}>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">{tc("name")}</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">{tc("category")}</Label>
                <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="general">{t("catGeneral")}</option>
                  <option value="welcome">{t("catWelcome")}</option>
                  <option value="onboarding">{t("catOnboarding")}</option>
                  <option value="notification">{t("catNotification")}</option>
                  <option value="marketing">{t("catMarketing")}</option>
                  <option value="follow_up">{t("catFollowUp")}</option>
                  <option value="proposal">{t("catProposal")}</option>
                </Select>
              </div>
              {/* Subject + Language inline in fullscreen mode */}
              {isFullscreen && (
                <>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">{tc("subject")}</Label>
                    <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">{tc("language")}</Label>
                    <Select value={form.language} onChange={(e) => update("language", e.target.value)}>
                      <option value="ru">🇷🇺 RU</option>
                      <option value="az">🇦🇿 AZ</option>
                      <option value="en">🇬🇧 EN</option>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Subject + Language — hidden in fullscreen visual mode (moved to top row) */}
            <div className={cn("grid grid-cols-3 gap-3", isFullscreen && "hidden")}>
              <div className="col-span-2">
                <Label className="text-xs uppercase text-muted-foreground">{tc("subject")}</Label>
                <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">{tc("language")}</Label>
                <Select value={form.language} onChange={(e) => update("language", e.target.value)}>
                  <option value="ru">🇷🇺 {tc("langRussian")}</option>
                  <option value="az">🇦🇿 {tc("langAzerbaijani")}</option>
                  <option value="en">🇬🇧 {tc("langEnglish")}</option>
                </Select>
              </div>
            </div>

            {/* Editor — single contentEditable WYSIWYG with toolbar + merge-tag chips */}
            <div className={cn(isFullscreen && "flex flex-col flex-1 min-h-0")}>
              <Label className="text-xs uppercase text-muted-foreground mb-2 block flex-shrink-0">{tc("content")}</Label>
              {/*
                Previously there was a toggle between "Визуальный редактор" (Unlayer iframe)
                and "HTML редактор" (contentEditable). The Unlayer editor depended on
                editor.unlayer.com / api.unlayer.com iframes that ad-blockers and corporate
                firewalls routinely block, causing an infinite "Loading editor…" spinner.
                We kept the contentEditable path only — it's already a full WYSIWYG with
                toolbar (bold/italic/underline/fontSize/color/align/lists/links), merge-tag
                insert buttons, preview, and a raw-HTML toggle. Zero third-party iframes.
              */}
              <>
              <p className="text-xs text-muted-foreground mb-2">
                {t("editorHint")}
              </p>

              {/* Block palette — click a block, it appends to the canvas at cursor.
                  Each block is plain email-safe HTML with inline styles, so the
                  output renders identically in all mail clients. User can then
                  edit the inserted block inline in the contentEditable. */}
              {activeTab === "editor" && (
                <div className="mb-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🧱 Блоки</span>
                    <span className="text-xs text-muted-foreground">клик вставляет блок в позицию курсора</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_TEMPLATES.map(b => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => insertBlock(b.html)}
                        className="text-xs px-2.5 py-1.5 rounded-md bg-background border border-border hover:border-primary hover:bg-primary/5 transition-colors font-medium text-foreground"
                        title={b.label}
                      >
                        <span className="mr-1">{b.icon}</span>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  ✏️ {t("tabEditor")}
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
                  👁 {t("tabPreview")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeTab === "split"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("split")}
                >
                  ⬛ Split
                </button>
              </div>

              {activeTab === "split" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg">
                    <div className="px-3 py-1.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">{t("htmlEditor")}</div>
                    <textarea
                      className="w-full h-[250px] p-3 text-xs font-mono resize-none bg-background focus:outline-none"
                      value={form.htmlBody}
                      onChange={e => update("htmlBody", e.target.value)}
                    />
                  </div>
                  <div className="border rounded-lg">
                    <div className="px-3 py-1.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">Live Preview</div>
                    <div className="p-3 h-[250px] overflow-y-auto bg-card">
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRichHtml(
                            form.htmlBody
                              .replace(/\{\{client_name\}\}/g, '<span class="bg-yellow-100 px-1 rounded">Иван Иванов</span>')
                              .replace(/\{\{client_email\}\}/g, '<span class="bg-yellow-100 px-1 rounded">ivan@example.com</span>')
                              .replace(/\{\{company\}\}/g, '<span class="bg-yellow-100 px-1 rounded">Güven Technology</span>')
                              .replace(/\{\{(\w+)\}\}/g, '<span class="bg-yellow-100 px-1 rounded">{{$1}}</span>')
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : activeTab === "editor" ? (
                <div className="border rounded-b-lg">
                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 p-2 border-b bg-muted/30 flex-wrap">
                    <button type="button" onClick={() => execCommand("undo")} className="p-1.5 rounded hover:bg-muted" title="Undo (Ctrl+Z)">
                      <Undo className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("redo")} className="p-1.5 rounded hover:bg-muted" title="Redo (Ctrl+Y)">
                      <Redo className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <button type="button" onClick={() => execCommand("bold")} className="p-1.5 rounded hover:bg-muted font-bold" title="Bold (Ctrl+B)">
                      <Bold className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("italic")} className="p-1.5 rounded hover:bg-muted" title="Italic (Ctrl+I)">
                      <Italic className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("underline")} className="p-1.5 rounded hover:bg-muted" title="Underline (Ctrl+U)">
                      <Underline className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <select
                      className="text-xs border rounded px-1.5 py-1 bg-background"
                      onChange={e => { if (e.target.value) execCommand("fontSize", e.target.value); e.target.value = "" }}
                      defaultValue=""
                    >
                      <option value="" disabled>{t("fontSize")}</option>
                      <option value="1">{t("fontSmall")}</option>
                      <option value="3">{t("fontNormal")}</option>
                      <option value="5">{t("fontLarge")}</option>
                      <option value="7">{t("fontHeading")}</option>
                    </select>
                    <input
                      type="color"
                      className="w-7 h-7 rounded border cursor-pointer"
                      title={t("textColor")}
                      defaultValue="#000000"
                      onChange={e => execCommand("foreColor", e.target.value)}
                    />
                    <span className="w-px h-5 bg-border mx-1" />
                    <button type="button" onClick={() => execCommand("justifyLeft")} className="p-1.5 rounded hover:bg-muted" title="Align left">
                      <AlignLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("justifyCenter")} className="p-1.5 rounded hover:bg-muted" title="Align center">
                      <AlignCenter className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("justifyRight")} className="p-1.5 rounded hover:bg-muted" title="Align right">
                      <AlignRight className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-1.5 rounded hover:bg-muted" title="Bullet list">
                      <List className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-1.5 rounded hover:bg-muted" title="Numbered list">
                      <ListOrdered className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("URL:")
                        if (url) execCommand("createLink", url)
                      }}
                      className="p-1.5 rounded hover:bg-muted"
                      title="Insert link"
                    >
                      <Link className="h-4 w-4" />
                    </button>
                    <span className="w-px h-5 bg-border mx-1" />
                    <button
                      type="button"
                      onClick={() => {
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
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                      title="Show HTML source"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Variable insert buttons */}
                  <div className="flex flex-wrap gap-1.5 p-2 border-b bg-blue-50/50 dark:bg-blue-950/20">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium self-center mr-1">{t("clientData")}:</span>
                    {variableButtons.map(v => (
                      <button
                        key={v.variable}
                        type="button"
                        onClick={() => insertVariable(v.variable)}
                        className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700 transition-colors font-medium"
                        title={`{{${v.variable}}}`}
                      >
                        {v.icon} {t(v.labelKey as any)}
                      </button>
                    ))}
                  </div>

                  {/* ContentEditable area */}
                  <div className="relative">
                    <div
                      ref={editorRef}
                      contentEditable
                      className="min-h-[200px] max-h-[300px] overflow-y-auto p-4 focus:outline-none text-sm leading-relaxed"
                      onInput={syncEditorContent}
                      onBlur={syncEditorContent}
                      suppressContentEditableWarning
                      data-placeholder={t("editorPlaceholder")}
                    />
                    {!form.htmlBody && (
                      <div className="absolute top-4 left-4 text-sm text-muted-foreground/50 pointer-events-none leading-relaxed">
                        {t("editorPlaceholder")}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Preview tab */
                <div className="border rounded-b-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-card">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichHtml(
                        form.htmlBody
                          .replace(/\{\{client_name\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Иван Иванов</span>')
                          .replace(/\{\{client_email\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">ivan@example.com</span>')
                          .replace(/\{\{company\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Güven Technology</span>')
                          .replace(/\{\{service\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">CRM Service</span>')
                          .replace(/\{\{date\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">19.03.2026</span>')
                          .replace(/\{\{month\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">Март</span>')
                          .replace(/\{\{year\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">2026</span>')
                          .replace(/\{\{(\w+)\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">{{$1}}</span>')
                      )
                    }}
                  />
                </div>
              )}
              </>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {isEdit && onDelete && (
            <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </form>
        </div>
      </div>
    </div>
  )
}
