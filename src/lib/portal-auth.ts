import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

export interface PortalUser {
  contactId: string
  organizationId: string
  companyId: string | null
  fullName: string
  email: string
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required")
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function createPortalToken(user: PortalUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET)
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("portal-token")?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return {
      contactId: payload.contactId as string,
      organizationId: payload.organizationId as string,
      companyId: (payload.companyId as string) || null,
      fullName: payload.fullName as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}
