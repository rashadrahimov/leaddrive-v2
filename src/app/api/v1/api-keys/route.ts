import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/constants"
import crypto from "crypto"

// GET /api/v1/api-keys — list all keys for org
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "core", "read")
  if (isAuthError(auth)) return auth

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: auth.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      createdBy: true,
    },
  })

  return NextResponse.json({ success: true, data: keys })
}

// POST /api/v1/api-keys — generate new key
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "core", "write")
  if (isAuthError(auth)) return auth
  if (!isAdmin(auth.role)) {
    return NextResponse.json({ error: "Only admins can create API keys" }, { status: 403 })
  }

  const body = await req.json()
  const { name, scopes, expiresInDays } = body

  if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json({ error: "name and scopes[] required" }, { status: 400 })
  }

  // Generate random key: ld_<32 hex chars>
  const rawKey = `ld_${crypto.randomBytes(32).toString("hex")}`
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
  const keyPrefix = rawKey.slice(0, 10)

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: auth.orgId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt,
      createdBy: auth.userId,
    },
  })

  // Return the raw key ONLY on creation — it won't be shown again
  return NextResponse.json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    },
  })
}
