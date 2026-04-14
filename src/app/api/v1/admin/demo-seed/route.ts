import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

/**
 * POST /api/v1/admin/demo-seed
 * Runs the demo seed script for the current organization.
 * Admin-only. Fills CRM with realistic demo data for presentations.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "write")
  if (isAuthError(auth)) return auth

  const orgId = auth.orgId
  const session = (auth as any).session
  const role = session?.user?.role
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 400 })

  try {
    // Get org slug for the seed script
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true, name: true },
    })
    if (!org?.slug) {
      return NextResponse.json({ error: "Organization slug not found" }, { status: 400 })
    }

    // Run the seed script as a background process
    const scriptPath = `${process.cwd()}/scripts/seed-tenant-demo.mjs`
    const command = `node ${scriptPath} --slug=${org.slug}`

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 120000, // 2 minute timeout
      env: { ...process.env, NODE_ENV: "production" },
    })

    // Count created sections from output
    const lines = stdout.split("\n").filter((l: string) => l.trim())
    const summary = lines.slice(-5).join("\n")

    return NextResponse.json({
      success: true,
      data: {
        organization: org.name,
        slug: org.slug,
        summary,
        linesOutput: lines.length,
      },
    })
  } catch (err: any) {
    console.error("Demo seed error:", err)
    return NextResponse.json({
      error: "Seed failed",
      details: err.stderr?.slice(0, 500) || err.message,
    }, { status: 500 })
  }
}
