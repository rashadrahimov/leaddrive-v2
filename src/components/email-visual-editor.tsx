"use client"

import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// Unlayer must be loaded client-side only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EmailEditor: any = dynamic(() => import("react-email-editor").then(mod => mod.default) as any, {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/30">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">...</p>
      </div>
    </div>
  ),
})

const MERGE_TAGS = {
  client_name: { name: "Client Name", value: "{{client_name}}" },
  client_email: { name: "Client Email", value: "{{client_email}}" },
  company: { name: "Company", value: "{{company}}" },
  service: { name: "Service", value: "{{service}}" },
  new_services: { name: "New Services", value: "{{new_services}}" },
  improvements: { name: "Improvements", value: "{{improvements}}" },
  upcoming: { name: "Upcoming", value: "{{upcoming}}" },
  date: { name: "Date", value: "{{date}}" },
  month: { name: "Month", value: "{{month}}" },
  year: { name: "Year", value: "{{year}}" },
}

export interface EmailVisualEditorHandle {
  exportHtml: () => Promise<{ design: any; html: string }>
}

interface Props {
  designJson?: any | null
  onExport: (design: any, html: string) => void
  labels?: { title?: string; exportHtml?: string; loading?: string }
  mergeTagNames?: Record<string, string>
}

export const EmailVisualEditor = forwardRef<EmailVisualEditorHandle, Props>(
  function EmailVisualEditor({ designJson, onExport, labels, mergeTagNames }, ref) {
    const t = useTranslations("emailTemplates")
    const editorRef = useRef<any>(null)
    const [ready, setReady] = useState(false)
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")

    const onReady = useCallback((unlayer: any) => {
      editorRef.current = unlayer

      if (designJson) {
        unlayer.loadDesign(designJson)
      }

      // Build merge tags with optional translated names
      const tags: Record<string, any> = {}
      for (const [key, val] of Object.entries(MERGE_TAGS)) {
        tags[key] = { ...val, name: mergeTagNames?.[key] || val.name }
      }
      unlayer.setMergeTags(tags)
      setReady(true)
    }, [designJson, mergeTagNames])

    // Promise-based export — reliable, no setTimeout hacks
    const exportHtmlAsync = useCallback((): Promise<{ design: any; html: string }> => {
      return new Promise((resolve, reject) => {
        if (!editorRef.current) {
          reject(new Error("Editor not ready"))
          return
        }
        editorRef.current.exportHtml((data: any) => {
          const { design, html } = data
          onExport(design, html)
          resolve({ design, html })
        })
      })
    }, [onExport])

    // Expose exportHtml via ref for parent components
    useImperativeHandle(ref, () => ({
      exportHtml: exportHtmlAsync,
    }), [exportHtmlAsync])

    // Also listen for custom event (backward compat)
    useEffect(() => {
      const handler = () => { exportHtmlAsync().catch(() => {}) }
      window.addEventListener("unlayer-export", handler)
      return () => window.removeEventListener("unlayer-export", handler)
    }, [exportHtmlAsync])

    const togglePreview = (mode: "desktop" | "mobile") => {
      setPreviewMode(mode)
      if (editorRef.current) {
        // Use Unlayer's native preview API
        editorRef.current.showPreview(mode)
      }
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Preview toggle toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">{labels?.title || t("visualEditor")}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => togglePreview("desktop")}
              className={cn(
                "p-1.5 rounded transition-colors",
                previewMode === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              title={t("previewDesktop")}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => togglePreview("mobile")}
              className={cn(
                "p-1.5 rounded transition-colors",
                previewMode === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              title={t("previewMobile")}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-border mx-1" />
            <Button type="button" size="sm" variant="outline" onClick={() => exportHtmlAsync().catch(() => {})} disabled={!ready}>
              <Download className="h-3.5 w-3.5 mr-1" /> {labels?.exportHtml || t("exportHtml")}
            </Button>
          </div>
        </div>

        {/* Editor */}
        <EmailEditor
          onReady={onReady}
          minHeight={600}
          options={{
            appearance: { theme: "modern_light" },
            features: { stockImages: { enabled: true, safeSearch: true } },
            tools: {
              image: { enabled: true },
              button: { enabled: true },
              divider: { enabled: true },
              html: { enabled: true },
              social: { enabled: true },
              video: { enabled: true },
            },
            mergeTags: MERGE_TAGS,
          }}
        />
      </div>
    )
  }
)
