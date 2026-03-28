"use client"

import { useTranslations } from "next-intl"
import { Megaphone } from "lucide-react"

export function CampaignStats({ campaigns }: { campaigns: any[] }) {
  const t = useTranslations("dashboard")

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-4 w-4 text-pink-500" />
          <span className="text-sm font-semibold">{t("campaignStats")}</span>
        </div>
        <a href="/campaigns" className="text-[10px] text-violet-600 hover:underline">{t("viewAll")} →</a>
      </div>
      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-2">
          {campaigns.slice(0, 2).map((c: any) => (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{c.name}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  {t("active")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { v: c.sent?.toLocaleString() || "0", l: t("sent") },
                  { v: `${c.openRate || 0}%`, l: t("openRate") },
                  { v: `${c.clickRate || 0}%`, l: t("clickRate") },
                ].map((m) => (
                  <div key={m.l} className="text-center p-1 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="text-xs font-semibold">{m.v}</div>
                    <div className="text-[8px] text-muted-foreground">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
