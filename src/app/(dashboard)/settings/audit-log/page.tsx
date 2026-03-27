"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { Shield } from "lucide-react"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityName: string | null
  userId: string | null
  createdAt: string
}

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  login: "outline",
  export: "outline",
}

export default function AuditLogPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.email) return

    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/v1/audit-log")
        if (response.ok) {
          const result = await response.json()
          const formattedLogs = (result.data.logs || []).map((log: any) => ({
            ...log,
            createdAt: new Date(log.createdAt).toLocaleString(),
          }))
          setLogs(formattedLogs)
        }
      } catch (error) {
        console.error("Failed to fetch audit logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [session])

  const columns = [
    { key: "createdAt", label: tc("date"), sortable: true },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (item: any) => <Badge variant={actionColors[item.action] || "outline"}>{item.action}</Badge>,
    },
    { key: "entityType", label: "Entity", sortable: true },
    { key: "entityName", label: tc("name"), sortable: true },
    {
      key: "userId",
      label: "User",
      sortable: true,
      render: (item: any) => <span>{item.userId || "System"}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" /> {t("auditLog")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("auditLogDesc")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("hintAuditLog")}</p>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{tc("loading")}</p>
      ) : (
        <DataTable columns={columns} data={logs} searchPlaceholder={tc("search")} searchKey="entityName" />
      )}
    </div>
  )
}
