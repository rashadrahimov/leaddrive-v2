"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { Brain, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const grades = [
  { label: "A", description: "Горячие (80–100)", count: 0, color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" },
  { label: "B", description: "Тёплые (60–79)", count: 0, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" },
  { label: "C", description: "Нейтральные (40–59)", count: 0, color: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30" },
  { label: "D", description: "Холодные (20–39)", count: 0, color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30" },
  { label: "F", description: "Мёртвые (0–19)", count: 0, color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" },
]

export default function LeadScoringPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Lead Scoring</h1>
          <p className="text-muted-foreground mt-1">
            AI-скоринг лидов — автоматическая оценка и ранжирование
          </p>
        </div>
        <Button disabled>
          <Sparkles className="mr-2 h-4 w-4" />
          Оценить все лиды с AI
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {grades.map((grade) => (
          <Card key={grade.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("inline-flex items-center rounded-full px-3 py-1 text-lg font-bold", grade.color)}>
                    {grade.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{grade.description}</p>
                </div>
                <span className="text-3xl font-bold">{grade.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Результаты скоринга</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Brain className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Coming soon</p>
              <p className="text-sm mt-1">
                AI проанализирует ваших лидов и присвоит каждому оценку на основе активности, профиля и вероятности конверсии
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
