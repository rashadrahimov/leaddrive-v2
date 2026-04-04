"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StickyNote, ListTodo, Mail, Send, Loader2, ChevronDown, AlertCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type ActionType = "note" | "task" | "email"

export interface DealContact {
  id: string
  fullName: string
  email: string | null
  isPrimary?: boolean
}

interface QuickActionBarProps {
  dealId: string
  orgId?: string
  contacts?: DealContact[]
  onActivityAdded?: () => void
  onTaskAdded?: () => void
  labels: {
    placeholder: string
    note: string
    task: string
    email: string
    send: string
  }
}

export function QuickActionBar({ dealId, orgId, contacts = [], onActivityAdded, onTaskAdded, labels }: QuickActionBarProps) {
  const [activeType, setActiveType] = useState<ActionType>("note")
  const [text, setText] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // Filter contacts with email
  const emailContacts = useMemo(() => contacts.filter(c => c.email), [contacts])

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  // Set default contact when contacts load
  useEffect(() => {
    if (emailContacts.length > 0 && !selectedContactId) {
      const primary = emailContacts.find(c => c.isPrimary)
      setSelectedContactId(primary?.id || emailContacts[0]?.id || null)
    }
  }, [emailContacts, selectedContactId])

  const selectedContact = emailContacts.find(c => c.id === selectedContactId) || null

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": orgId } : {}),
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSendResult(null)
    try {
      if (activeType === "email") {
        if (!selectedContact?.email || !emailSubject.trim() || !emailBody.trim()) return
        const res = await fetch(`/api/v1/deals/${dealId}/send-email`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            contactId: selectedContact.id,
            subject: emailSubject.trim(),
            body: emailBody.trim(),
          }),
        })
        const json = await res.json()
        if (json.success) {
          setSendResult({
            success: json.emailSent,
            message: json.emailSent
              ? `Отправлено → ${json.recipientEmail}`
              : `Записано (SMTP: ${json.emailError || "не настроен"})`,
          })
          setEmailSubject("")
          setEmailBody("")
          onActivityAdded?.()
        } else {
          setSendResult({ success: false, message: json.error || "Ошибка" })
        }
      } else if (activeType === "note") {
        if (!text.trim()) return
        await fetch("/api/v1/activities", {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "note",
            subject: text.trim(),
            description: "",
            relatedType: "deal",
            relatedId: dealId,
          }),
        })
        setText("")
        onActivityAdded?.()
      } else if (activeType === "task") {
        if (!text.trim()) return
        await fetch(`/api/v1/deals/${dealId}/next-steps`, {
          method: "POST",
          headers,
          body: JSON.stringify({ title: text.trim() }),
        })
        setText("")
        onTaskAdded?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-clear send result after 4s
  useEffect(() => {
    if (!sendResult) return
    const t = setTimeout(() => setSendResult(null), 4000)
    return () => clearTimeout(t)
  }, [sendResult])

  const types: { key: ActionType; icon: typeof StickyNote; label: string }[] = [
    { key: "note", icon: StickyNote, label: labels.note },
    { key: "task", icon: ListTodo, label: labels.task },
    { key: "email", icon: Mail, label: labels.email },
  ]

  const emailDisabled = activeType === "email" && (!selectedContact?.email || !emailSubject.trim() || !emailBody.trim())
  const noteTaskDisabled = activeType !== "email" && !text.trim()

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2.5">
      {/* Type selector */}
      <div className="flex items-center gap-1">
        {types.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setActiveType(key); setSendResult(null) }}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeType === key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {activeType === key && (
              <motion.div
                layoutId="quickActionTab"
                className="absolute inset-0 bg-muted rounded-lg"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {activeType === "email" ? (
          <motion.div
            key="email-form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            {emailContacts.length === 0 ? (
              /* No contacts warning */
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Добавьте контакт с email к сделке (секция &quot;Роли контактов&quot;)
              </div>
            ) : (
              <>
                {/* Recipient selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowContactPicker(!showContactPicker)}
                    className="w-full flex items-center gap-2 text-xs border rounded-lg px-3 py-2 bg-background hover:bg-muted/50 transition-colors"
                  >
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Кому:</span>
                    <span className="font-medium truncate">
                      {selectedContact?.fullName} &lt;{selectedContact?.email}&gt;
                    </span>
                    {emailContacts.length > 1 && (
                      <ChevronDown className={cn("h-3 w-3 ml-auto text-muted-foreground transition-transform", showContactPicker && "rotate-180")} />
                    )}
                  </button>

                  {/* Dropdown */}
                  {showContactPicker && emailContacts.length > 1 && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-popover border rounded-lg shadow-lg py-1">
                      {emailContacts.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedContactId(c.id); setShowContactPicker(false) }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-2",
                            c.id === selectedContactId && "bg-muted"
                          )}
                        >
                          <span className="font-medium">{c.fullName}</span>
                          <span className="text-muted-foreground">&lt;{c.email}&gt;</span>
                          {c.isPrimary && <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 rounded">Primary</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <input
                  className="w-full h-9 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/60"
                  placeholder="Тема письма"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />

                {/* Body */}
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/60 resize-none min-h-[80px]"
                  placeholder="Текст письма..."
                  rows={3}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />

                {/* Send button + result */}
                <div className="flex items-center gap-2">
                  {sendResult && (
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                      sendResult.success
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                    )}>
                      {sendResult.success ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {sendResult.message}
                    </div>
                  )}
                  <Button
                    size="sm"
                    disabled={emailDisabled || submitting}
                    onClick={handleSubmit}
                    className="gap-1.5 shrink-0 ml-auto"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {labels.send}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* Note / Task — original single input */
          <motion.div
            key="note-task"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2"
          >
            <input
              className="flex-1 h-9 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/60"
              placeholder={labels.placeholder}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && text.trim()) handleSubmit() }}
            />
            <Button
              size="sm"
              disabled={noteTaskDisabled || submitting}
              onClick={handleSubmit}
              className="gap-1.5 shrink-0"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {labels.send}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
