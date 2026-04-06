"use client"

import { use } from "react"
import dynamic from "next/dynamic"

const GrapesEditor = dynamic(
  () =>
    import("@/components/grapes-editor").then((m) => ({
      default: m.default || m.GrapesEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading editor...
      </div>
    ),
  }
)

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return <GrapesEditor pageId={id} />
}
