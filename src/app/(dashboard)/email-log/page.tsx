"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { Mail, Send, Inbox, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react"

export default function EmailLogPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Log</h1>
        <p className="text-muted-foreground mt-1">
          Все отправленные и полученные письма — статус доставки, ошибки и история
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Всего" value={0} icon={<Mail className="h-4 w-4" />} />
        <StatCard title="Исходящие" value={0} icon={<Send className="h-4 w-4" />} />
        <StatCard title="Входящие" value={0} icon={<Inbox className="h-4 w-4" />} />
        <StatCard title="Отправлено" value={0} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard title="Ошибок" value={0} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard title="Отскочено" value={0} icon={<RotateCcw className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История писем</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Coming soon</p>
              <p className="text-sm mt-1">
                Здесь будет полный лог всех email — отправленных и полученных, с фильтрами и поиском
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
