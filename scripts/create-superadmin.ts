/**
 * Create or upgrade a user to superadmin role.
 * Usage: npx tsx scripts/create-superadmin.ts <email>
 *
 * If user exists → upgrades role to superadmin.
 * If user doesn't exist → creates new user with superadmin role (prompts for details).
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error("Usage: npx tsx scripts/create-superadmin.ts <email>")
    console.error("Example: npx tsx scripts/create-superadmin.ts rashad@guven.tech")
    process.exit(1)
  }

  const existing = await prisma.user.findFirst({
    where: { email },
    include: { organization: true },
  })

  if (existing) {
    if (existing.role === "superadmin") {
      console.log(`✓ User ${email} is already a superadmin`)
      return
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "superadmin" },
    })

    console.log(`✓ Upgraded ${email} to superadmin (was: ${existing.role})`)
    console.log(`  Organization: ${existing.organization?.name || "none"}`)
    return
  }

  // Create new superadmin — need an org
  console.log(`User ${email} not found. Creating new superadmin...`)

  // Find or create a system org
  let org = await prisma.organization.findFirst({
    where: { slug: "system" },
  })

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "System Administration",
        slug: "system",
        plan: "enterprise",
        maxUsers: -1,
        maxContacts: -1,
      },
    })
    console.log(`  Created system organization`)
  }

  const password = "ChangeMe123!"
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      role: "superadmin",
      organizationId: org.id,
      passwordHash,
    },
  })

  console.log(`✓ Created superadmin user:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Organization: ${org.name}`)
  console.log(`  ⚠ Change the password after first login!`)
}

main()
  .catch((e) => {
    console.error("Error:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
