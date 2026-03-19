"use client"

import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { Shield } from "lucide-react"

const MOCK_LOGS = [
  { id: "1", action: "create", entityType: "company", entityName: "Zeytun Pharma", user: "Rashad", createdAt: "2026-03-18 10:30" },
  { id: "2", action: "update", entityType: "deal", entityName: "GT-OFF-2026-005", user: "Admin", createdAt: "2026-03-17 15:20" },
  { id: "3", action: "delete", entityType: "lead", entityName: "Test Lead", user: "Admin", createdAt: "2026-03-16 09:10" },
  { id: "4", action: "login", entityType: "user", entityName: "rashadrahimov", user: "System", createdAt: "2026-03-16 08:00" },
  { id: "5", action: "export", entityType: "report", entityName: "Monthly report", user: "Admin", createdAt: "2026-03-15 18:00" },
]

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default", update: "secondary", delete: "destructive", login: "outline", export: "outline",
}

export default function AuditLogPage() {
  const columns = [
    { key: "createdAt", label: "Date", sortable: true },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (item: typeof MOCK_LOGS[0]) => <Badge variant={actionColors[item.action]}>{item.action}</Badge>,
    },
    { key: "entityType", label: "Entity", sortable: true },
    { key: "entityName", label: "Name", sortable: true },
    { key: "user", label: "User", sortable: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" /> Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">All system actions and changes</p>
      </div>
      <DataTable columns={columns} data={MOCK_LOGS} searchPlaceholder="Search logs..." searchKey="entityName" />
    </div>
  )
}
