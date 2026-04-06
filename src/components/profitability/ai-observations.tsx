"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, ChevronDown, ChevronRight, AlertCircle } from "lucide-react"
import { useAiAnalysis, useRefreshAiAnalysis } from "@/lib/cost-model/hooks"
import { sanitizeRichHtml } from "@/lib/sanitize"

interface AIObservationsProps {
  tab: string
}

/**
 * Simple markdown-like text to HTML:
 * - **bold** → <strong>
 * - \n → <br/>
 * - Lines starting with "- " → list items
 * - Lines starting with "###" → h4
 * - Lines starting with "##" → h3
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function markdownToHtml(text: string): string {
  const lines = text.split("\n")
  let html = ""
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false }
      html += `<h4 class="font-semibold text-sm mt-3 mb-1">${escapeHtml(trimmed.slice(4))}</h4>`
    } else if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false }
      html += `<h3 class="font-bold text-base mt-4 mb-2">${escapeHtml(trimmed.slice(3))}</h3>`
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html += '<ul class="list-disc pl-5 space-y-1">'; inList = true }
      html += `<li class="text-sm">${escapeHtml(trimmed.slice(2))}</li>`
    } else if (trimmed === "") {
      if (inList) { html += "</ul>"; inList = false }
      html += "<br/>"
    } else {
      if (inList) { html += "</ul>"; inList = false }
      html += `<p class="text-sm mb-1">${escapeHtml(trimmed)}</p>`
    }
  }

  if (inList) html += "</ul>"

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')

  return html
}

export function AIObservations({ tab }: AIObservationsProps) {
  const [enabled, setEnabled] = useState(false)
  const [showThinking, setShowThinking] = useState(false)

  const { data, isLoading, isError, error } = useAiAnalysis(tab, { enabled })
  const refreshMutation = useRefreshAiAnalysis()

  const handleAnalyze = () => {
    setEnabled(true)
  }

  const handleRefresh = () => {
    refreshMutation.mutate({ tab, lang: "ru" })
  }

  const isRefreshing = refreshMutation.isPending

  // Use mutation result if available, otherwise query result
  const result = refreshMutation.data || data

  return (
    <Card className="ai-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-[hsl(var(--ai-from))]" />
          <span className="ai-pulse-dot" />
          Da Vinci Analiz
          {result?.cached && (
            <Badge variant="outline" className="text-[10px] ml-1">
              Cached
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {!enabled && !result && (
            <Button variant="default" size="sm" onClick={handleAnalyze}>
              <Brain className="h-4 w-4 mr-1" />
              Da Vinci Analiz
            </Button>
          )}
          {(enabled || result) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              Yenilə
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Not yet requested */}
        {!enabled && !result && !isLoading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Da Vinci analizi hələ başlamayıb.</p>
            <p className="text-xs mt-1">Yuxarıdakı &quot;Da Vinci Analiz&quot; düyməsini sıxın.</p>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || isRefreshing) && !result && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <div className="relative inline-block mb-4">
              <Brain className="h-10 w-10 animate-pulse" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-violet-500 rounded-full animate-ping" />
            </div>
            <p className="font-medium">Da Vinci düşünür... (30-60 san.)</p>
            <p className="text-xs mt-1 text-muted-foreground">
              Məlumatlar təhlil olunur, bir az gözləyin.
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && !result && (
          <div className="text-center py-8 text-red-600 text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="font-medium">Analiz zamanı xəta baş verdi</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : "Bir daha cəhd edin."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleAnalyze}>
              Təkrar cəhd
            </Button>
          </div>
        )}

        {/* Refresh error */}
        {refreshMutation.isError && (
          <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-950 text-red-600 text-xs">
            Yeniləmə xətası: {refreshMutation.error instanceof Error ? refreshMutation.error.message : "Naməlum xəta"}
          </div>
        )}

        {/* Analysis result */}
        {result?.analysis && (
          <div className="space-y-4">
            {/* Main analysis content */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(markdownToHtml(result.analysis)) }}
            />

            {/* Thinking section (collapsible) */}
            {result.thinking && (
              <div className="border-t pt-3 mt-4">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showThinking ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Düşüncə prosesi (thinking)
                </button>
                {showThinking && (
                  <div className="mt-2 p-3 rounded bg-muted/50 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                    {result.thinking}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              Da Vinci texnologiyası {result.cached ? "(cached)" : ""}
              {isRefreshing && " — yenilənir..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
