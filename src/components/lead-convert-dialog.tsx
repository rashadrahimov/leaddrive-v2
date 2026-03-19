"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { ArrowRight } from "lucide-react"

interface LeadConvertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConverted: () => void
  lead: {
    id: string
    contactName: string
    companyName?: string
    email?: string
    phone?: string
    estimatedValue?: number
  }
  orgId?: string
}

export function LeadConvertDialog({ open, onOpenChange, onConverted, lead, orgId }: LeadConvertDialogProps) {
  const [dealTitle, setDealTitle] = useState(`Deal from ${lead.contactName}`)
  const [dealStage, setDealStage] = useState("QUALIFIED")
  const [dealValue, setDealValue] = useState(String(lead.estimatedValue || ""))
  const [createCompany, setCreateCompany] = useState(!!lead.companyName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/v1/leads/${lead.id}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          dealTitle,
          dealStage,
          dealValue: dealValue ? parseFloat(dealValue) : undefined,
          createCompany,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to convert")
      onConverted()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" /> Convert Lead to Deal
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleConvert}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}

          <div className="bg-muted/50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium">Converting Lead:</p>
            <p className="text-sm">{lead.contactName} {lead.companyName ? `(${lead.companyName})` : ""}</p>
            {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
          </div>

          <div className="grid gap-4">
            <div className="text-sm font-medium text-muted-foreground">This will create:</div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">1. Contact: {lead.contactName}</p>
              {lead.companyName && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={createCompany} onChange={(e) => setCreateCompany(e.target.checked)} className="rounded" />
                  <span className="text-sm">2. Company: {lead.companyName}</span>
                </label>
              )}
            </div>

            <div>
              <Label htmlFor="dealTitle">Deal Title *</Label>
              <Input id="dealTitle" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dealStage">Deal Stage</Label>
                <Select value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
                  <option value="LEAD">Lead (10%)</option>
                  <option value="QUALIFIED">Qualified (25%)</option>
                  <option value="PROPOSAL">Proposal (50%)</option>
                  <option value="NEGOTIATION">Negotiation (75%)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="dealValue">Deal Value</Label>
                <Input id="dealValue" type="number" value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Converting..." : "Convert Lead"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
