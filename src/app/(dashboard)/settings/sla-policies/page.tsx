"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Clock, AlertTriangle } from "lucide-react"

interface SlaPolicy {
  id: string
  name: string
  description: string
  priority: string
  firstResponseHours: number
  resolutionHours: number
  escalationHours: number
  escalateTo: string
  isActive: boolean
  isDefault: boolean
}

const INITIAL_POLICIES: SlaPolicy[] = [
  {
    id: "1", name: "Critical", description: "System-down situations affecting multiple users",
    priority: "critical", firstResponseHours: 0.5, resolutionHours: 4, escalationHours: 2,
    escalateTo: "Team Lead + Manager", isActive: true, isDefault: true,
  },
  {
    id: "2", name: "High Priority", description: "Significant impact on business operations",
    priority: "high", firstResponseHours: 1, resolutionHours: 8, escalationHours: 4,
    escalateTo: "Team Lead", isActive: true, isDefault: true,
  },
  {
    id: "3", name: "Standard", description: "Normal business requests and issues",
    priority: "medium", firstResponseHours: 4, resolutionHours: 24, escalationHours: 12,
    escalateTo: "Team Lead", isActive: true, isDefault: true,
  },
  {
    id: "4", name: "Low Priority", description: "Non-urgent requests and information queries",
    priority: "low", firstResponseHours: 8, resolutionHours: 48, escalationHours: 24,
    escalateTo: "Team Lead", isActive: true, isDefault: true,
  },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

function formatHours(h: number): string {
  if (h < 1) return `${h * 60}m`
  if (h === Math.floor(h)) return `${h}h`
  return `${Math.floor(h)}h ${(h % 1) * 60}m`
}

export default function SlaPoliciesPage() {
  const [policies, setPolicies] = useState<SlaPolicy[]>(INITIAL_POLICIES)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" /> SLA Policies
          </h1>
          <p className="text-sm text-muted-foreground">Define response and resolution time targets for each priority level</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add Policy</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {policies.map(p => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {p.name} — 1st Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatHours(p.firstResponseHours)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {policies.map(policy => (
          <Card key={policy.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <Badge className={PRIORITY_COLORS[policy.priority]}>{policy.priority}</Badge>
                <div>
                  <CardTitle className="text-base">{policy.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {policy.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                <Badge variant={policy.isActive ? "default" : "secondary"}>
                  {policy.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">First Response</p>
                  <p className="font-mono font-medium">{formatHours(policy.firstResponseHours)}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">Resolution</p>
                  <p className="font-mono font-medium">{formatHours(policy.resolutionHours)}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">Escalation After</p>
                  <p className="font-mono font-medium">{formatHours(policy.escalationHours)}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Escalate To</p>
                  <p className="font-medium">{policy.escalateTo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
