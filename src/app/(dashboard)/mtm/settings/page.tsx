"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { Settings, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MtmSettingsPage() {
  const t = useTranslations("nav")
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/v1/mtm/settings")
      .then((r) => r.json())
      .then((r) => { if (r.success) setSettings(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/v1/mtm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
    } catch {}
    setSaving(false)
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const settingGroups = [
    {
      title: "GPS Tracking",
      items: [
        { key: "gpsInterval", label: "GPS interval (seconds)", type: "number" },
        { key: "geofenceRadius", label: "Geofence radius (meters)", type: "number" },
        { key: "alertGpsSpoofing", label: "Alert on GPS spoofing", type: "boolean" },
      ],
    },
    {
      title: "Visit Settings",
      items: [
        { key: "photoRequired", label: "Photo required per visit", type: "boolean" },
        { key: "maxPhotosPerVisit", label: "Max photos per visit", type: "number" },
        { key: "autoCheckoutMinutes", label: "Auto checkout (minutes)", type: "number" },
      ],
    },
    {
      title: "Working Hours",
      items: [
        { key: "workingHoursStart", label: "Start time", type: "time" },
        { key: "workingHoursEnd", label: "End time", type: "time" },
        { key: "alertLateStart", label: "Alert on late start", type: "boolean" },
        { key: "alertMissedVisit", label: "Alert on missed visit", type: "boolean" },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Settings} title={t("mtmSettings")} description="Configure field team settings" />
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingGroups.map((group) => (
            <div key={group.title} className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">{group.title}</h3>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground">{item.label}</label>
                    {item.type === "boolean" ? (
                      <button
                        onClick={() => updateSetting(item.key, !settings[item.key])}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          settings[item.key] ? "bg-cyan-500" : "bg-slate-300"
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          settings[item.key] ? "translate-x-4.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    ) : item.type === "time" ? (
                      <input
                        type="time"
                        value={settings[item.key] || ""}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                        className="text-xs border rounded px-2 py-1 w-24 bg-background"
                      />
                    ) : (
                      <input
                        type="number"
                        value={settings[item.key] || ""}
                        onChange={(e) => updateSetting(item.key, parseInt(e.target.value) || 0)}
                        className="text-xs border rounded px-2 py-1 w-20 bg-background text-right"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
