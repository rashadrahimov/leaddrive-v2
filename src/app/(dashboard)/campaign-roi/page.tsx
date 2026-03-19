"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { DollarSign, TrendingUp, BarChart3, Target } from "lucide-react"

export default function CampaignROIPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaign ROI</h1>
        <p className="text-muted-foreground mt-1">
          Анализ окупаемости инвестиций в кампании
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Общий доход" value="$0" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Общая стоимость" value="$0" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="ROI" value="0%" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard title="Кампании" value={0} icon={<Target className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Анализ ROI по кампаниям</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Coming soon</p>
              <p className="text-sm mt-1">
                Здесь будет детальный анализ окупаемости каждой кампании — расходы, доходы и конверсии
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
