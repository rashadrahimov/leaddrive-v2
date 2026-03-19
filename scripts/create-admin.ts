// @ts-nocheck
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Find the organization
  const org = await prisma.organization.findFirst({ where: { slug: "guven-technology" } })
  if (!org) {
    console.log("❌ Organization not found!")
    return
  }
  console.log(`Organization: ${org.name} (${org.id})`)

  // Create or update admin user
  const passwordHash = await bcrypt.hash("admin123", 12)

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "admin@leaddrive.com" } },
    update: { passwordHash, role: "admin", isActive: true },
    create: {
      organizationId: org.id,
      email: "admin@leaddrive.com",
      name: "Admin",
      passwordHash,
      role: "admin",
    },
  })
  console.log(`✅ Admin user: ${admin.email} (${admin.id})`)
  console.log("   Password: admin123")

  // Also reset password for rashadrahimsoy@gmail.com
  const rashad = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "rashadrahimsoy@gmail.com" } },
    update: { passwordHash: await bcrypt.hash("admin123", 12) },
    create: {
      organizationId: org.id,
      email: "rashadrahimsoy@gmail.com",
      name: "Rashad Rahimov",
      passwordHash,
      role: "admin",
    },
  })
  console.log(`✅ User: ${rashad.email} — password reset to admin123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
