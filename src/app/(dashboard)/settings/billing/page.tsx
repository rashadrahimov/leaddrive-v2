"use client"

import { useTranslations } from "next-intl"
import { useAutoTour } from "@/components/tour/tour-provider"
import { TourReplayButton } from "@/components/tour/tour-replay-button"

export default function BillingPage() {
  const ts = useTranslations("settings")
  useAutoTour("billing")

  return (
    <div className="space-y-6">
      <div>
        <h1 data-tour-id="billing-header" className="text-2xl font-bold tracking-tight flex items-center gap-2">{ts("billing")} <TourReplayButton tourId="billing" /></h1>
      </div>
    </div>
  )
}
