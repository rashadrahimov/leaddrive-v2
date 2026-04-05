"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

// Unlayer must be loaded client-side only
const EmailEditor = dynamic(() => import("react-email-editor").then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/30">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading editor...</p>
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

interface Props {
  designJson?: any | null
  onExport: (design: any, html: string) => void
}

export function EmailVisualEditor({ designJson, onExport }: Props) {
  const editorRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")

  const onReady = useCallback((unlayer: any) => {
    editorRef.current = unlayer

    if (designJson) {
      unlayer.loadDesign(designJson)
    }

    unlayer.setMergeTags(MERGE_TAGS)
    setReady(true)
  }, [designJson])

  const exportHtml = useCallback(() => {
    if (!editorRef.current) return
    editorRef.current.exportHtml((data: any) => {
      const { design, html } = data
      onExport(design, html)
    })
  }, [onExport])

  // Expose export via a custom event for parent to trigger
  useEffect(() => {
    const handler = () => exportHtml()
    window.addEventListener("unlayer-export", handler)
    return () => window.removeEventListener("unlayer-export", handler)
  }, [exportHtml])

  const togglePreview = (mode: "desktop" | "mobile") => {
    setPreviewMode(mode)
    if (editorRef.current) {
      if (mode === "mobile") {
        editorRef.current.setAppearance({ panels: { tools: { dock: "left" } } })
      }
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Preview toggle toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Visual Email Editor</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => togglePreview("desktop")}
            className={cn(
              "p-1.5 rounded transition-colors",
              previewMode === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            title="Desktop preview"
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
            title="Mobile preview"
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <span className="w-px h-5 bg-border mx-1" />
          <Button type="button" size="sm" variant="outline" onClick={exportHtml} disabled={!ready}>
            Export HTML
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ width: previewMode === "mobile" ? "375px" : "100%", margin: previewMode === "mobile" ? "0 auto" : undefined, transition: "width 0.3s" }}>
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
    </div>
  )
}
