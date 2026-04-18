import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildWidgetCorsHeaders } from "@/lib/widget-cors"

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await buildWidgetCorsHeaders(req, req.headers.get("origin")) })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  const headers = await buildWidgetCorsHeaders(req, origin)

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  const after = searchParams.get("after")
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers })

  const afterDate = after ? new Date(Number(after)) : new Date(0)
  const messages = await prisma.webChatMessage.findMany({
    where: {
      sessionId,
      createdAt: { gt: afterDate },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        messages: messages.map((m: any) => ({
          id: m.id,
          fromRole: m.fromRole,
          text: m.text,
          createdAt: m.createdAt.getTime(),
          attachmentUrl: m.attachmentUrl,
          attachmentName: m.attachmentName,
          attachmentType: m.attachmentType,
          attachmentSize: m.attachmentSize,
        })),
      },
    },
    { headers },
  )
}
