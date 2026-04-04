"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { CheckSquare } from "lucide-react"

export default function MtmVisitsPage() {
  const t = useTranslations("nav")
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/visits?limit=50")
      .then((r) => r.json())
      .then((r) => { if (r.success) setVisits(r.data.visits || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <PageDescription icon={CheckSquare} title={t("mtmVisits")} description="Visit log — check-ins and check-outs" />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No visits yet</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Check-in</th>
                <th className="px-4 py-2 font-medium">Check-out</th>
                <th className="px-4 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">{v.agent?.name}</td>
                  <td className="px-4 py-2">{v.customer?.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === "CHECKED_OUT" ? "bg-green-100 text-green-700" :
                      v.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(v.checkInAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.checkOutAt ? new Date(v.checkOutAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v.duration ? `${v.duration} min` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
