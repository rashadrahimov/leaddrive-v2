"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { Building2 } from "lucide-react"

const categoryColors: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-600",
}

export default function MtmCustomersPage() {
  const t = useTranslations("nav")
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/customers?limit=50")
      .then((r) => r.json())
      .then((r) => { if (r.success) setCustomers(r.data.customers || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <PageDescription icon={Building2} title={t("mtmCustomers")} description="Field customers — stores, pharmacies, outlets" />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No customers yet</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">City</th>
                <th className="px-4 py-2 font-medium">Address</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{c.code || "—"}</td>
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[c.category] || ""}`}>{c.category}</span>
                  </td>
                  <td className="px-4 py-2">{c.city || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{c.address || "—"}</td>
                  <td className="px-4 py-2">{c.contactPerson || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
