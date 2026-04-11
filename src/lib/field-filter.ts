import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/constants"

// In-memory cache: orgId:roleId:entityType → { fieldName: access }
const permissionCache = new Map<string, { data: Record<string, string>; expiresAt: number }>()
const CACHE_TTL = 60_000 // 60 seconds

export async function getFieldPermissions(
  orgId: string,
  roleId: string,
  entityType: string
): Promise<Record<string, string>> {
  const cacheKey = `${orgId}:${roleId}:${entityType}`
  const cached = permissionCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  let permissions: any[] = []
  try {
    permissions = await prisma.fieldPermission.findMany({
      where: { organizationId: orgId, roleId, entityType },
    })
  } catch {
    // Table may not exist yet — return empty (no restrictions)
    permissionCache.set(cacheKey, { data: {}, expiresAt: Date.now() + CACHE_TTL })
    return {}
  }

  const map: Record<string, string> = {}
  for (const p of permissions) {
    map[p.fieldName] = p.access
  }

  permissionCache.set(cacheKey, { data: map, expiresAt: Date.now() + CACHE_TTL })
  return map
}

/**
 * Filter entity fields for GET responses.
 * Hidden fields are removed from the response.
 * Admin always sees everything.
 */
export function filterEntityFields<T extends Record<string, any>>(
  entity: T,
  permissions: Record<string, string>,
  role: string
): Partial<T> {
  if (isAdmin(role)) return entity

  const filtered: any = {}
  for (const [key, value] of Object.entries(entity)) {
    const access = permissions[key]
    // No explicit permission → visible by default
    if (!access || access === "visible" || access === "editable") {
      filtered[key] = value
    }
    // access === "hidden" → skip field
  }
  return filtered
}

/**
 * Filter writable fields for POST/PUT requests.
 * Only "editable" fields (or fields without explicit permission) pass through.
 * Admin always writes everything.
 */
export function filterWritableFields(
  data: Record<string, any>,
  permissions: Record<string, string>,
  role: string
): Record<string, any> {
  if (isAdmin(role)) return data

  const filtered: any = {}
  for (const [key, value] of Object.entries(data)) {
    const access = permissions[key]
    if (!access || access === "editable") {
      filtered[key] = value
    }
    // "visible" or "hidden" → reject write
  }
  return filtered
}
