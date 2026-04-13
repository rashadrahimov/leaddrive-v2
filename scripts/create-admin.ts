// @ts-nocheck
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
  if (!ADMIN_PASSWORD) {
    console.error("❌ Set ADMIN_PASSWORD env var")
    process.exit(1)
  }

  // Find the organization
  const org = await prisma.organization.findFirst({ where: { slug: "leaddrive" } })
  if (!org) {
    console.log("❌ Organization not found!")
    return
  }
  console.log(`Organization: ${org.name} (${org.id})`)

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "rashadrahimsoy@gmail.com" } },
    update: { passwordHash, role: "admin", isActive: true },
    create: {
      organizationId: org.id,
      email: "rashadrahimsoy@gmail.com",
      name: "Rashad Rahimov",
      passwordHash,
      role: "admin",
    },
  })
  console.log(`✅ Admin: ${admin.email} (${admin.id})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
