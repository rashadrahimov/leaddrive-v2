"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Mail, Phone, Plus } from "lucide-react"

interface Row {
  id: string
  email: string | null
  phone: string | null
  surveyId: string | null
  createdAt: string
  reason: string | null
}

interface Props {
  surveyId: string
  orgId: string | number | undefined
}

export function SurveyUnsubscribesPanel({ surveyId, orgId }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [scope, setScope] = useState<"survey" | "org">("survey")

  const headers: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}

  const load = () => {
    setLoading(true)
    fetch(`/api/v1/surveys/${surveyId}/unsubscribes`, { headers })
      .then(r => r.json())
      .then(res => { if (res.success) setRows(res.data.unsubscribes) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [surveyId, orgId])

  const add = async () => {
    if (!newEmail.trim() && !newPhone.trim()) return
    setAdding(true)
    try {
      await fetch(`/api/v1/surveys/${surveyId}/unsubscribes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          email: newEmail.trim() || undefined,
          phone: newPhone.trim() || undefined,
          scope,
        }),
      })
      setNewEmail("")
      setNewPhone("")
      load()
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove from suppression list?")) return
    await fetch(`/api/v1/surveys/${surveyId}/unsubscribes?rowId=${id}`, { method: "DELETE", headers })
    load()
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Unsubscribes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Recipients who opted out of this survey (or all surveys org-wide). Manually add by email or phone for off-channel complaints.
        </p>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px] space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Email</label>
          <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" className="h-8" />
        </div>
        <div className="flex-1 min-w-[140px] space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
          <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+994..." className="h-8" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Scope</label>
          <select value={scope} onChange={e => setScope(e.target.value as any)} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="survey">This survey</option>
            <option value="org">All surveys (org-wide)</option>
          </select>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={add} disabled={adding || (!newEmail.trim() && !newPhone.trim())}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse bg-muted rounded" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No suppressed recipients yet.</p>
      ) : (
        <div className="border-t pt-3 space-y-1.5 max-h-72 overflow-y-auto">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs py-1">
              <Badge variant="outline" className="text-[10px]">{r.surveyId ? "survey" : "org-wide"}</Badge>
              {r.email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>
              )}
              {r.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>
              )}
              <span className="ml-auto text-muted-foreground tabular-nums">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-red-500" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
