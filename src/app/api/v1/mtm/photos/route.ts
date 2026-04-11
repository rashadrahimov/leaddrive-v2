import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const agentId = formData.get("agentId") as string
    const visitId = (formData.get("visitId") as string) || null
    const category = (formData.get("category") as string) || null
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null

    if (!file || !agentId) {
      return NextResponse.json({ error: "file and agentId are required" }, { status: 400 })
    }

    // Save file to public/uploads/mtm-photos/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "mtm-photos")
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name?.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${agentId.slice(-6)}.${ext}`
    const filePath = path.join(uploadDir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const url = `/uploads/mtm-photos/${fileName}`

    const photo = await prisma.mtmPhoto.create({
      data: {
        organizationId: orgId,
        agentId,
        visitId,
        url,
        category,
        latitude,
        longitude,
      },
    })

    return NextResponse.json({ success: true, data: photo }, { status: 201 })
  } catch (e: any) {
    console.error("[MTM Photos POST]", e)
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const visitId = searchParams.get("visitId") || ""
  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (visitId) where.visitId = visitId
    if (status) where.status = status

    const [photos, total] = await Promise.all([
      prisma.mtmPhoto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          visit: { select: { id: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.mtmPhoto.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { photos, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { photos: [], total: 0, page, limit } })
  }
}
