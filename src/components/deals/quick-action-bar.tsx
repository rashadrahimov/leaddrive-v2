"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StickyNote, ListTodo, Mail, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ActionType = "note" | "task" | "email"

interface QuickActionBarProps {
  dealId: string
  orgId?: string
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

export function QuickActionBar({ dealId, orgId, onActivityAdded, onTaskAdded, labels }: QuickActionBarProps) {
  const [activeType, setActiveType] = useState<ActionType>("note")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": orgId } : {}),
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      if (activeType === "note") {
        await fetch(`/api/v1/deals/${dealId}/activities`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "note", subject: text.trim(), description: "" }),
        })
        onActivityAdded?.()
      } else if (activeType === "task") {
        await fetch(`/api/v1/deals/${dealId}/next-steps`, {
          method: "POST",
          headers,
          body: JSON.stringify({ title: text.trim() }),
        })
        onTaskAdded?.()
      } else if (activeType === "email") {
        await fetch(`/api/v1/deals/${dealId}/activities`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "email", subject: text.trim(), description: "" }),
        })
        onActivityAdded?.()
      }
      setText("")
    } finally {
      setSubmitting(false)
    }
  }

  const types: { key: ActionType; icon: typeof StickyNote; label: string }[] = [
    { key: "note", icon: StickyNote, label: labels.note },
    { key: "task", icon: ListTodo, label: labels.task },
    { key: "email", icon: Mail, label: labels.email },
  ]

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2.5">
      {/* Type selector */}
      <div className="flex items-center gap-1">
        {types.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveType(key)}
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

      {/* Input */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.input
            key={activeType}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 h-9 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/60"
            placeholder={labels.placeholder}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && text.trim()) handleSubmit() }}
          />
        </AnimatePresence>
        <Button
          size="sm"
          disabled={!text.trim() || submitting}
          onClick={handleSubmit}
          className="gap-1.5 shrink-0"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {labels.send}
        </Button>
      </div>
    </div>
  )
}
