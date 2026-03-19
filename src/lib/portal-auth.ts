import { cookies } from "next/headers"

export interface PortalUser {
  contactId: string
  organizationId: string
  companyId: string | null
  fullName: string
  email: string
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("portal-token")?.value
  if (!token) return null
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
  } catch {
    return null
  }
}
