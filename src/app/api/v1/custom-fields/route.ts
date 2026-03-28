import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createCustomFieldSchema = z.object({
  entityType: z.string().min(1),
  fieldName: z.string().min(1).max(200),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.string().min(1),
  options: z.array(z.string()).optional().default([]),
  isRequired: z.boolean().optional().default(false),
  defaultValue: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType") || ""

  try {
    const where = {
      organizationId: orgId,
      ...(entityType ? { entityType } : {}),
    }

    const fields = await prisma.customField.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: fields })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createCustomFieldSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const field = await prisma.customField.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: field }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
