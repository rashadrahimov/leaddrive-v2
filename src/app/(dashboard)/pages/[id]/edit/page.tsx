"use client"

import { use, Suspense } from "react"
import { useTranslations } from "next-intl"
import dynamic from "next/dynamic"

const GrapesEditor = dynamic(
  () =>
    import("@/components/grapes-editor").then((m) => ({
      default: m.default || m.GrapesEditor,
    })),
  { ssr: false }
)

function EditorFallback() {
  const t = useTranslations("common")
  return (
    <div className="h-screen flex items-center justify-center text-muted-foreground">
      {t("loadingEditor")}
    </div>
  )
}

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <Suspense fallback={<EditorFallback />}>
      <GrapesEditor pageId={id} />
    </Suspense>
  )
}
