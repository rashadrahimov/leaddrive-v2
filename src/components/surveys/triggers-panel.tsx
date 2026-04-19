"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Save, Zap } from "lucide-react"

interface Props {
  surveyId: string
  orgId: string | number | undefined
  initialTriggers: Record<string, any>
}

const TRIGGER_KEYS = [
  { key: "afterTicketResolve", label: "After ticket is resolved", hint: "Sends this survey to the ticket's contact once a support ticket moves into 'resolved'." },
  { key: "afterDealWon", label: "After deal is won", hint: "Fires when a deal stage transitions into WON. Uses the deal's linked contact." },
  { key: "afterLeadConverted", label: "After lead is converted", hint: "Fires during lead → contact/deal conversion with the freshly-created contact." },
  { key: "afterInvoicePaid", label: "After invoice is paid", hint: "Not yet wired into the invoice flow — flag is stored for future use." },
] as const

export function SurveyTriggersPanel({ surveyId, orgId, initialTriggers }: Props) {
  const [triggers, setTriggers] = useState<Record<string, boolean>>(() => {
    const t: Record<string, boolean> = {}
    for (const { key } of TRIGGER_KEYS) t[key] = !!initialTriggers?.[key]
    return t
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const toggle = (key: string) => setTriggers(t => ({ ...t, [key]: !t[key] }))

  const save = async () => {
    setSaving(true)
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      }
      const res = await fetch(`/api/v1/surveys/${surveyId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ triggers }),
      })
      if (res.ok) setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Automation triggers
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Send this survey automatically when an event happens. Recipients who already responded are skipped.
        </p>
      </div>

      <div className="space-y-2">
        {TRIGGER_KEYS.map(({ key, label, hint }) => (
          <label key={key} className="flex items-start gap-3 p-2 rounded-md border hover:bg-muted/40 cursor-pointer">
            <input
              type="checkbox"
              checked={triggers[key]}
              onChange={() => toggle(key)}
              className="mt-0.5 h-4 w-4"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {savedAt && (
          <span className="text-[11px] text-muted-foreground">
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save triggers"}
        </Button>
      </div>
    </div>
  )
}
