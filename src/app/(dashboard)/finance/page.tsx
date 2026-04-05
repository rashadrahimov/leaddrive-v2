"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinanceDashboard } from "@/components/finance/finance-dashboard"
import { ARDashboard } from "@/components/finance/ar-dashboard"
import { APDashboard } from "@/components/finance/ap-dashboard"
import { FundManager } from "@/components/finance/fund-manager"
import { PaymentsDashboard } from "@/components/finance/payments-dashboard"
import { LayoutDashboard, FileText, CreditCard, PiggyBank, Banknote } from "lucide-react"

const TABS = [
  { value: "overview", label: "Обзор", icon: LayoutDashboard },
  { value: "receivables", label: "Дебиторка (A/R)", icon: FileText },
  { value: "payables", label: "Кредиторка (A/P)", icon: CreditCard },
  { value: "funds", label: "Фонды", icon: PiggyBank },
  { value: "payments", label: "Платежи", icon: Banknote },
] as const

export default function FinancePage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Финансы</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <FinanceDashboard />
        </TabsContent>

        <TabsContent value="receivables">
          <ARDashboard />
        </TabsContent>

        <TabsContent value="payables">
          <APDashboard />
        </TabsContent>

        <TabsContent value="funds">
          <FundManager />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
