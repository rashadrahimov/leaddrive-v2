"use client"

import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// Direct Unlayer integration — bypasses react-email-editor wrapper
// which has stale module-level closure issues with Next.js dynamic + React 19

const UNLAYER_SCRIPT_URL = "https://editor.unlayer.com/embed.js?2"

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

/** Load Unlayer embed script once — with retry and proper state tracking */
let unlayerLoadPromise: Promise<void> | null = null

function loadUnlayerScriptOnce(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Already loaded from a previous page visit
    if (typeof window !== "undefined" && (window as any).unlayer) {
      resolve()
      return
    }

    // Remove any stale script tags (from failed attempts or HMR)
    document.querySelectorAll(`script[src*="editor.unlayer.com"]`).forEach(el => el.remove())

    const script = document.createElement("script")
    script.src = UNLAYER_SCRIPT_URL
    script.async = true

    script.onload = () => {
      // Poll for window.unlayer — the script sets it asynchronously
      let attempts = 0
      const check = setInterval(() => {
        attempts++
        if ((window as any).unlayer) {
          clearInterval(check)
          resolve()
        } else if (attempts > 50) { // 5 seconds
          clearInterval(check)
          reject(new Error("Unlayer global not available after script load"))
        }
      }, 100)
    }

    script.onerror = () => {
      reject(new Error("Failed to load Unlayer embed script"))
    }

    document.head.appendChild(script)
  })
}

function loadUnlayerScript(retries = 3, delay = 1500): Promise<void> {
  // Return cached promise if already loading/loaded
  if (unlayerLoadPromise) return unlayerLoadPromise

  unlayerLoadPromise = (async () => {
    let lastError: Error | null = null
    for (let i = 0; i < retries; i++) {
      try {
        await loadUnlayerScriptOnce()
        return
      } catch (err: any) {
        lastError = err
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, delay * (i + 1)))
        }
      }
    }
    throw lastError || new Error("Failed to load Unlayer embed script")
  })()

  // Reset on failure so retry is possible on next mount
  unlayerLoadPromise.catch(() => { unlayerLoadPromise = null })

  return unlayerLoadPromise
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

let editorIdCounter = 0

export const EmailVisualEditor = forwardRef<EmailVisualEditorHandle, Props>(
  function EmailVisualEditor({ designJson, onExport, labels, mergeTagNames }, ref) {
    const t = useTranslations("emailTemplates")
    const editorRef = useRef<any>(null)
    const containerIdRef = useRef<string>(`unlayer-editor-${++editorIdCounter}`)
    const [ready, setReady] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
    const [retryCount, setRetryCount] = useState(0)
    const destroyedRef = useRef(false)

    // Initialize Unlayer editor directly
    useEffect(() => {
      destroyedRef.current = false
      let editorInstance: any = null

      const init = async () => {
        try {
          setLoading(true)
          setError(null)
          await loadUnlayerScript()

          if (destroyedRef.current) return

          const unlayer = (window as any).unlayer
          if (!unlayer) {
            setError("Unlayer global not found after script load")
            setLoading(false)
            return
          }

          // Build merge tags with optional translated names
          const tags: Record<string, any> = {}
          for (const [key, val] of Object.entries(MERGE_TAGS)) {
            tags[key] = { ...val, name: mergeTagNames?.[key] || val.name }
          }

          editorInstance = unlayer.createEditor({
            id: containerIdRef.current,
            displayMode: "email",
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
            mergeTags: tags,
            source: { name: "react-email-editor", version: "1.8.0" },
          })

          editorInstance.addEventListener("editor:ready", () => {
            if (destroyedRef.current) return
            editorRef.current = editorInstance

            if (designJson) {
              editorInstance.loadDesign(designJson)
            }

            editorInstance.setMergeTags(tags)
            setReady(true)
            setLoading(false)
          })
        } catch (err: any) {
          if (!destroyedRef.current) {
            setError(err.message || "Failed to initialize editor")
            setLoading(false)
          }
        }
      }

      init()

      return () => {
        destroyedRef.current = true
        if (editorInstance) {
          try { editorInstance.destroy() } catch {}
        }
        editorRef.current = null
        setReady(false)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount])

    // Load design when designJson changes after init
    useEffect(() => {
      if (ready && editorRef.current && designJson) {
        editorRef.current.loadDesign(designJson)
      }
    }, [designJson, ready])

    // Promise-based export
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
        editorRef.current.showPreview(mode)
      }
    }

    return (
      <div className="border rounded-lg flex flex-col flex-1" style={{ minHeight: 0 }}>
        {/* Preview toggle toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 flex-shrink-0">
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

        {/* Editor container — flex-1 fills all available space */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{labels?.loading || "Loading editor..."}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-destructive/5">
              <div className="text-center">
                <p className="text-sm text-destructive font-medium">{t("editorFailedToLoad")}</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button
                    type="button"
                    className="text-xs text-primary underline font-medium"
                    onClick={() => {
                      unlayerLoadPromise = null
                      setRetryCount(c => c + 1)
                    }}
                  >
                    {t("retry")}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => window.location.reload()}
                  >
                    {t("reloadPage")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            id={containerIdRef.current}
            style={{
              flex: 1,
              display: "flex",
              minHeight: 0,
            }}
          />
        </div>
      </div>
    )
  }
)
