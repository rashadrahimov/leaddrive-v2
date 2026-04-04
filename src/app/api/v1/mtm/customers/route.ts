import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || ""
  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }]
    if (category) where.category = category
    if (status) where.status = status

    const [customers, total] = await Promise.all([
      prisma.mtmCustomer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
      prisma.mtmCustomer.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { customers, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { customers: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const customer = await prisma.mtmCustomer.create({
      data: {
        organizationId: orgId,
        code: body.code || null,
        name: body.name,
        category: body.category || "B",
        address: body.address || null,
        city: body.city || null,
        district: body.district || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        phone: body.phone || null,
        contactPerson: body.contactPerson || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create customer" }, { status: 400 })
  }
}
