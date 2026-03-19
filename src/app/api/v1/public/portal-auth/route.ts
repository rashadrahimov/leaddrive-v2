import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const contact = await prisma.contact.findFirst({
    where: { email },
    include: { company: true },
  })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  const token = Buffer.from(JSON.stringify({
    contactId: contact.id,
    organizationId: contact.organizationId,
    companyId: contact.companyId,
    fullName: contact.fullName,
    email: contact.email,
  })).toString("base64")

  const res = NextResponse.json({
    success: true,
    data: {
      contactId: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      companyName: contact.company?.name || "",
    },
  })
  res.cookies.set("portal-token", token, { httpOnly: true, path: "/", maxAge: 86400 * 7 })
  return res
}
