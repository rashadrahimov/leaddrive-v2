"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitCompare } from "lucide-react"

interface DiffLine {
  category: string
  department: string | null
  lineType: string
  planA: number
  planB: number
  delta: number
  status: "added" | "removed" | "changed" | "unchanged"
}

interface DiffData {
  planA: string
  planB: string
  totalChanges: number
  diff: DiffLine[]
}

interface Props {
  data: DiffData | null
  isLoading?: boolean
  versionLabelA?: string
  versionLabelB?: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
  added: { bg: "bg-green-50", text: "text-green-700", labelKey: "versionDiff_added" },
  removed: { bg: "bg-red-50", text: "text-red-700", labelKey: "versionDiff_removed" },
  changed: { bg: "bg-yellow-50", text: "text-yellow-700", labelKey: "versionDiff_changed" },
  unchanged: { bg: "bg-card", text: "text-muted-foreground", labelKey: "versionDiff_same" },
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function BudgetVersionDiff({ data, isLoading, versionLabelA, versionLabelB }: Props) {
  const t = useTranslations("budgeting")
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("versionDiff_loading")}
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const changes = data.diff.filter((d) => d.status !== "unchanged")
  const unchanged = data.diff.filter((d) => d.status === "unchanged")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          {t("versionDiff_title")}
          <Badge variant="outline" className="ml-2">
            {t("versionDiff_changes", { count: data.totalChanges })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">{t("versionDiff_category")}</th>
                <th className="py-2 pr-4 font-medium">{t("versionDiff_dept")}</th>
                <th className="py-2 pr-4 font-medium">{t("versionDiff_type")}</th>
                <th className="py-2 pr-4 font-medium text-right">{versionLabelA || t("versionDiff_planA")}</th>
                <th className="py-2 pr-4 font-medium text-right">{versionLabelB || t("versionDiff_planB")}</th>
                <th className="py-2 pr-4 font-medium text-right">{t("versionDiff_delta")}</th>
                <th className="py-2 font-medium">{t("versionDiff_status")}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((line, i) => {
                const style = STATUS_STYLES[line.status]
                return (
                  <tr key={i} className={`border-b ${style.bg}`}>
                    <td className="py-1.5 pr-4">{line.category}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{line.department || "—"}</td>
                    <td className="py-1.5 pr-4">{line.lineType}</td>
                    <td className="py-1.5 pr-4 text-right font-mono">{fmt(line.planA)}</td>
                    <td className="py-1.5 pr-4 text-right font-mono">{fmt(line.planB)}</td>
                    <td className={`py-1.5 pr-4 text-right font-mono font-medium ${
                      line.delta > 0 ? "text-green-600" : line.delta < 0 ? "text-red-600" : ""
                    }`}>
                      {line.delta > 0 ? "+" : ""}{fmt(line.delta)}
                    </td>
                    <td className="py-1.5">
                      <Badge className={`text-[10px] ${style.bg} ${style.text} border`}>
                        {t(style.labelKey)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {unchanged.length > 0 && (
                <tr className="border-b bg-muted/30">
                  <td colSpan={7} className="py-2 text-center text-xs text-muted-foreground">
                    {t("versionDiff_unchangedHidden", { count: unchanged.length })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
