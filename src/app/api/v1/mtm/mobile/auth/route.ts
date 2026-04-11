import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret"

/**
 * POST /api/v1/mtm/mobile/auth
 * Mobile agent login — returns JWT token.
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // Find MtmAgent by email
    const agent = await prisma.mtmAgent.findFirst({
      where: { email: email.toLowerCase().trim(), status: "ACTIVE" },
      include: { organization: { select: { id: true, name: true } } },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 401 })
    }

    // Agent must be linked to a CRM User for password verification
    if (!agent.userId) {
      // Try to find a CRM User with the same email
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim(), organizationId: agent.organizationId, isActive: true },
      })

      if (user) {
        // Auto-link agent to user
        await prisma.mtmAgent.update({
          where: { id: agent.id },
          data: { userId: user.id },
        })
        agent.userId = user.id
      } else {
        return NextResponse.json({ error: "No credentials configured for this agent" }, { status: 401 })
      }
    }

    // Get the linked CRM User and verify password
    const user = await prisma.user.findUnique({
      where: { id: agent.userId! },
      select: { id: true, passwordHash: true, isActive: true, name: true, email: true },
    })

    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ error: "Account inactive or no password set" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Mark agent as online
    await prisma.mtmAgent.update({
      where: { id: agent.id },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    // Issue JWT token (7 days)
    const token = jwt.sign(
      {
        agentId: agent.id,
        userId: user.id,
        orgId: agent.organizationId,
        email: user.email,
        name: agent.name,
        role: agent.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    return NextResponse.json({
      success: true,
      data: {
        token,
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          role: agent.role,
          avatar: agent.avatar,
          organizationId: agent.organizationId,
          organizationName: agent.organization.name,
        },
      },
    })
  } catch (e: any) {
    console.error("[Mobile Auth] Error:", e)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
