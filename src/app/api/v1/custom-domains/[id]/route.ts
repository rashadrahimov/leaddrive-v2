import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  if (!session?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const domain = await prisma.customDomain.findFirst({
      where: { id, organizationId: session.orgId },
    })

    if (!domain) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ domain })
  } catch (error) {
    console.error("Failed to get custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  if (!session?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const domain = await prisma.customDomain.findFirst({
      where: { id, organizationId: session.orgId },
    })

    if (!domain) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.customDomain.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
