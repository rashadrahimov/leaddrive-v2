"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Check, X, Pencil, RefreshCw, Filter } from "lucide-react"

type AssignmentMethod = "round_robin" | "condition"

interface AssignmentRule {
  id: string
  name: string
  method: AssignmentMethod
  isActive: boolean
  priority: number
  conditions: Array<{
    field: string
    operator: string
    value: string
  }>
  assignees: string[]
  description: string
}

const INITIAL_RULES: AssignmentRule[] = [
  {
    id: "1", name: "Default Round Robin", method: "round_robin", isActive: true, priority: 100,
    conditions: [],
    assignees: ["Rashad Rahimov", "Azar Alili", "Nigar Hasanova"],
    description: "Distribute all unmatched leads evenly across the sales team",
  },
  {
    id: "2", name: "Enterprise Leads", method: "condition", isActive: true, priority: 10,
    conditions: [
      { field: "estimated_value", operator: ">=", value: "50000" },
    ],
    assignees: ["Rashad Rahimov"],
    description: "Route high-value enterprise leads to senior account executive",
  },
  {
    id: "3", name: "InfoSec Leads", method: "condition", isActive: true, priority: 20,
    conditions: [
      { field: "source", operator: "==", value: "website" },
      { field: "interest", operator: "contains", value: "infosec" },
    ],
    assignees: ["Azar Alili", "Nigar Hasanova"],
    description: "Route InfoSec-related web leads to specialized team",
  },
  {
    id: "4", name: "Partner Referrals", method: "condition", isActive: false, priority: 30,
    conditions: [
      { field: "source", operator: "==", value: "partner_referral" },
    ],
    assignees: ["Rashad Rahimov"],
    description: "Assign partner referral leads directly to partnership manager",
  },
]

const FIELD_OPTIONS = ["source", "estimated_value", "interest", "company_size", "country", "industry"]
const OPERATOR_OPTIONS = ["==", "!=", ">=", "<=", "contains", "starts_with"]

export default function LeadRulesPage() {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [rules, setRules] = useState<AssignmentRule[]>(INITIAL_RULES)
  const [editingId, setEditingId] = useState<string | null>(null)

  const toggleActive = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
  }

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const addRule = () => {
    const newRule: AssignmentRule = {
      id: String(Date.now()),
      name: "New Rule",
      method: "condition",
      isActive: false,
      priority: 50,
      conditions: [{ field: "source", operator: "==", value: "" }],
      assignees: [],
      description: "",
    }
    setRules(prev => [...prev, newRule])
    setEditingId(newRule.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="h-6 w-6" /> {t("leadRules")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("leadRulesDesc")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("hintLeadRules")}</p>
        </div>
        <Button onClick={addRule}>
          <Plus className="h-4 w-4 mr-1" /> {tc("add")} Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rules</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{rules.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Rules</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{rules.filter(r => r.isActive).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assignees</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{new Set(rules.flatMap(r => r.assignees)).size}</p></CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {rules.sort((a, b) => a.priority - b.priority).map(rule => (
          <Card key={rule.id} className={rule.isActive ? "" : "opacity-60"}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? tc("active") : tc("inactive")}
                  </Badge>
                  <Badge variant="outline">
                    {rule.method === "round_robin" ? (
                      <><RefreshCw className="h-3 w-3 mr-1" /> Round Robin</>
                    ) : (
                      <><Filter className="h-3 w-3 mr-1" /> Condition</>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Priority: {rule.priority}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(rule.id)} className="h-7 px-2 text-xs">
                  {rule.isActive ? "Disable" : tc("active")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(editingId === rule.id ? null : rule.id)} className="h-7 w-7 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="h-7 w-7 p-0">
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium">{rule.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>

              {rule.conditions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {rule.conditions.map((cond, i) => (
                    <div key={i} className="text-xs font-mono bg-muted/50 rounded px-2 py-1 inline-block mr-2">
                      {cond.field} {cond.operator} &quot;{cond.value}&quot;
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-1">
                {rule.assignees.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
