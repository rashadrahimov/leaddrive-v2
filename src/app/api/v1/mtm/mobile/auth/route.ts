import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret"

/**
 * POST /api/v1/mtm/mobile/auth
 * Mobile agent login — returns JWT token.
 * Body: { email, password }
 *
 * Auth priority:
 * 1. Check agent's own passwordHash (set via admin form)
 * 2. Fallback: check linked CRM User's passwordHash
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

    let authenticated = false
    let linkedUserId = agent.userId

    // Method 1: Check agent's own passwordHash (primary)
    if (agent.passwordHash) {
      const valid = await bcrypt.compare(password, agent.passwordHash)
      if (valid) {
        authenticated = true
      }
    }

    // Method 2: Fallback to linked CRM User
    if (!authenticated && agent.userId) {
      const user = await prisma.user.findUnique({
        where: { id: agent.userId },
        select: { id: true, passwordHash: true, isActive: true },
      })
      if (user?.isActive && user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (valid) {
          authenticated = true
          linkedUserId = user.id
        }
      }
    }

    // Method 3: Auto-find CRM User by same email (if no direct password)
    if (!authenticated && !agent.passwordHash) {
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim(), organizationId: agent.organizationId, isActive: true },
        select: { id: true, passwordHash: true },
      })
      if (user?.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (valid) {
          authenticated = true
          linkedUserId = user.id
          // Auto-link agent to user
          await prisma.mtmAgent.update({
            where: { id: agent.id },
            data: { userId: user.id },
          })
        }
      }
    }

    if (!authenticated) {
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
        userId: linkedUserId || "",
        orgId: agent.organizationId,
        email: agent.email,
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
