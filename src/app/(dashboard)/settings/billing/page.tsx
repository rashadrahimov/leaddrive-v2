"use client"

import { useTranslations } from "next-intl"

export default function BillingPage() {
  const ts = useTranslations("settings")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ts("billing")}</h1>
      </div>
    </div>
  )
}
