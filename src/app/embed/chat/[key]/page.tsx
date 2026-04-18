import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { isWidgetOnline } from "@/lib/widget-hours"
import { EmbedChatClient } from "./embed-chat-client"
import { resolveWidgetLang } from "./widget-i18n"

export const dynamic = "force-dynamic"

export default async function EmbedChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { key } = await params
  const sp = await searchParams
  const widget = await prisma.webChatWidget.findUnique({
    where: { publicKey: key },
    include: { organization: { select: { name: true } } },
  })

  if (!widget || !widget.enabled) notFound()

  const online = isWidgetOnline(widget.workingHours)
  const lang = resolveWidgetLang(sp?.lang)

  return (
    <EmbedChatClient
      publicKey={widget.publicKey}
      title={widget.title}
      greeting={widget.greeting}
      primaryColor={widget.primaryColor}
      organizationName={widget.organization.name}
      online={online}
      offlineMessage={widget.offlineMessage}
      lang={lang}
    />
  )
}
