import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, companyName } = body

    // Validation
    if (!email || !password || !name || !companyName) {
      return NextResponse.json(
        { error: "Все поля обязательны: email, пароль, имя, название компании" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен быть минимум 8 символов" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: "Этот email уже зарегистрирован" },
        { status: 409 }
      )
    }

    // Create organization slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50)

    // Ensure unique slug
    let finalSlug = slug
    const existingOrg = await prisma.organization.findUnique({ where: { slug } })
    if (existingOrg) {
      finalSlug = `${slug}-${Date.now().toString(36)}`
    }

    // Create organization + admin user in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          slug: finalSlug,
          plan: "starter",
          maxUsers: 3,
          maxContacts: 500,
        },
      })

      const passwordHash = await bcrypt.hash(password, 12)

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          name,
          passwordHash,
          role: "admin",
        },
      })

      // Create default pipeline stages
      const stages = [
        { name: "LEAD", displayName: "Lead", color: "#6366f1", probability: 10, sortOrder: 1 },
        { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 2 },
        { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 3 },
        { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316", probability: 75, sortOrder: 4 },
        { name: "WON", displayName: "Won", color: "#22c55e", probability: 100, sortOrder: 5, isWon: true },
        { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 6, isLost: true },
      ]
      for (const s of stages) {
        await tx.pipelineStage.create({ data: { organizationId: organization.id, ...s } })
      }

      // Create default SLA policies
      const slas = [
        { name: "Critical", priority: "critical", firstResponseHours: 1, resolutionHours: 4 },
        { name: "High", priority: "high", firstResponseHours: 4, resolutionHours: 8 },
        { name: "Medium", priority: "medium", firstResponseHours: 8, resolutionHours: 24 },
        { name: "Low", priority: "low", firstResponseHours: 24, resolutionHours: 72 },
      ]
      for (const s of slas) {
        await tx.slaPolicy.create({ data: { organizationId: organization.id, ...s } })
      }

      // Create default currencies
      const currencies = [
        { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", exchangeRate: 1, isBase: true },
        { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 0.59 },
        { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.54 },
      ]
      for (const c of currencies) {
        await tx.currency.create({ data: { organizationId: organization.id, ...c } })
      }

      return { organization, user }
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: result.user.id,
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
        email: result.user.email,
      },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}
