import { prisma } from "@/lib/prisma"
import { getPlanDefaults } from "@/lib/tenant-plans"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import fs from "fs"
import path from "path"

const RESERVED_SLUGS = new Set([
  "app", "admin", "api", "www", "mail", "ftp", "static", "cdn", "assets",
  "status", "portal", "login", "register", "dashboard", "billing", "support",
])

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

export interface TenantInput {
  companyName: string
  slug: string
  plan: string
  adminName: string
  adminEmail: string
  branding?: { primaryColor?: string; logo?: string }
  features?: string[]
  provisionedBy: string // superadmin userId
}

export interface ProvisionResult {
  organization: { id: string; name: string; slug: string; plan: string }
  user: { id: string; email: string; name: string }
  tempPassword: string
  url: string
}

export async function validateSlug(slug: string): Promise<{ valid: boolean; error?: string }> {
  if (!slug) return { valid: false, error: "Slug is required" }
  if (!SLUG_REGEX.test(slug)) {
    return { valid: false, error: "Slug must be 3-30 chars, lowercase alphanumeric and hyphens only, cannot start/end with hyphen" }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: `Slug "${slug}" is reserved` }
  }
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    return { valid: false, error: `Slug "${slug}" is already taken` }
  }
  return { valid: true }
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url") // ~12 chars
}

export async function provisionTenant(input: TenantInput): Promise<ProvisionResult> {
  // Validate slug
  const slugCheck = await validateSlug(input.slug)
  if (!slugCheck.valid) {
    throw new Error(slugCheck.error)
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findFirst({ where: { email: input.adminEmail } })
  if (existingUser) {
    throw new Error(`Email "${input.adminEmail}" is already registered`)
  }

  // Get plan defaults
  const planDefaults = getPlanDefaults(input.plan)
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // Create everything in a transaction (Prisma P2002 = unique constraint = slug or email taken)
  let result
  try {
  result = await prisma.$transaction(async (tx: any) => {
    // 1. Create Organization
    const organization = await tx.organization.create({
      data: {
        name: input.companyName,
        slug: input.slug,
        plan: input.plan,
        maxUsers: planDefaults.maxUsers,
        maxContacts: planDefaults.maxContacts,
        features: JSON.stringify(input.features || planDefaults.features),
        addons: input.features || planDefaults.addons,
        branding: JSON.stringify(input.branding || {}),
        isActive: true,
        serverType: "shared",
        provisionedAt: new Date(),
        provisionedBy: input.provisionedBy,
      },
    })

    // 2. Create admin User
    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        email: input.adminEmail,
        name: input.adminName,
        passwordHash,
        role: "admin",
      },
    })

    // 3. Create default pipeline stages
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

    // 4. Create default SLA policies
    const slas = [
      { name: "Critical", priority: "critical", firstResponseHours: 1, resolutionHours: 4 },
      { name: "High", priority: "high", firstResponseHours: 4, resolutionHours: 8 },
      { name: "Medium", priority: "medium", firstResponseHours: 8, resolutionHours: 24 },
      { name: "Low", priority: "low", firstResponseHours: 24, resolutionHours: 72 },
    ]
    for (const s of slas) {
      await tx.slaPolicy.create({ data: { organizationId: organization.id, ...s } })
    }

    // 5. Create default currencies
    const currencies = [
      { code: "AZN", name: "Azerbaijani Manat", symbol: "\u20BC", exchangeRate: 1, isBase: true },
      { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 0.59 },
      { code: "EUR", name: "Euro", symbol: "\u20AC", exchangeRate: 0.54 },
    ]
    for (const c of currencies) {
      await tx.currency.create({ data: { organizationId: organization.id, ...c } })
    }

    // 6. Create MTM agent if MTM module is enabled (enterprise plan)
    const features = input.features || planDefaults.features
    if (features.includes("mtm") || input.plan === "enterprise") {
      await tx.mtmAgent.create({
        data: {
          organizationId: organization.id,
          name: input.adminName,
          email: input.adminEmail,
          role: "MANAGER",
          userId: user.id,
          passwordHash, // same password as admin user
        },
      })
    }

    return { organization, user }
  })
  } catch (err: any) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "slug"
      throw new Error(`A tenant with this ${field} already exists`)
    }
    throw err
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "leaddrivecrm.org"
  const url = `https://${input.slug}.${baseDomain}`

  // Update registry.json (best-effort)
  updateRegistry(input.slug, result.organization.name, input.plan, baseDomain)

  return {
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
      plan: result.organization.plan,
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    tempPassword,
    url,
  }
}

export async function deactivateTenant(orgId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: { isActive: false },
  })
}

export async function activateTenant(orgId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: { isActive: true, deletionScheduledAt: null },
  })
}

const DELETION_GRACE_DAYS = 30

/**
 * Schedule tenant for deletion after grace period.
 * Sets isActive = false immediately (users can't log in).
 */
export async function scheduleTenantDeletion(orgId: string): Promise<Date> {
  const deletionDate = new Date()
  deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_DAYS)

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      isActive: false,
      deletionScheduledAt: deletionDate,
    },
  })

  return deletionDate
}

/**
 * Cancel a scheduled deletion and reactivate the tenant.
 */
export async function cancelTenantDeletion(orgId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      isActive: true,
      deletionScheduledAt: null,
    },
  })
}

/**
 * Permanently delete a tenant and ALL its data.
 * PostgreSQL cascading FKs handle all related records automatically.
 */
export async function hardDeleteTenant(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) throw new Error("Organization not found")

  // Cascade delete: PostgreSQL FKs with onDelete: Cascade handle all 93+ related models
  await prisma.organization.delete({ where: { id: orgId } })

  // Remove from registry
  removeFromRegistry(org.slug)

  console.log(`[TENANT] Hard deleted org "${org.name}" (${org.slug}), id: ${orgId}`)
}

/**
 * Find and delete all tenants past their scheduled deletion date.
 * Called by cron job.
 */
export async function purgeScheduledTenants(): Promise<{ purged: string[]; errors: string[] }> {
  const overdue = await prisma.organization.findMany({
    where: {
      deletionScheduledAt: { lte: new Date() },
    },
    select: { id: true, name: true, slug: true },
  })

  const purged: string[] = []
  const errors: string[] = []

  for (const org of overdue) {
    try {
      await hardDeleteTenant(org.id)
      purged.push(`${org.name} (${org.slug})`)
    } catch (err: any) {
      console.error(`[TENANT] Purge failed for ${org.slug}:`, err)
      errors.push(`${org.slug}: ${err.message}`)
    }
  }

  return { purged, errors }
}

// --- Registry.json management ---

const REGISTRY_PATH = path.join(process.cwd(), "clients", "registry.json")

function updateRegistry(slug: string, name: string, plan: string, baseDomain: string): void {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"))
    registry.clients[slug] = {
      name,
      server: "46.224.171.53", // shared server
      sshUser: "root",
      sshKey: "~/.ssh/id_ed25519",
      domain: `${slug}.${baseDomain}`,
      appDir: "/opt/leaddrive-v2",
      port: 3001,
      pm2Name: "leaddrive-v2",
      plan,
      status: "active",
      type: "shared",
      provisionedAt: new Date().toISOString(),
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n")
    console.log(`[TENANT] Registry updated for "${slug}"`)
  } catch (err) {
    console.error("[TENANT] Registry update failed:", err)
  }
}

function removeFromRegistry(slug: string): void {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"))
    if (registry.clients[slug]) {
      delete registry.clients[slug]
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n")
      console.log(`[TENANT] Registry removed "${slug}"`)
    }
  } catch (err) {
    console.error("[TENANT] Registry removal failed:", err)
  }
}
