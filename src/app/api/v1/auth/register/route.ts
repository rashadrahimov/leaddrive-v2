import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DEFAULT_PIPELINE_STAGES, INITIAL_CURRENCIES } from "@/lib/constants"
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
      for (const s of DEFAULT_PIPELINE_STAGES) {
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
      for (const c of INITIAL_CURRENCIES) {
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
