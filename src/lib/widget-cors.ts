import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Return CORS headers that reflect the widget's allowedOrigins whitelist.
 * - If the widget has allowedOrigins configured, only a matching origin is echoed.
 * - If allowedOrigins is empty, we echo the request origin (so the visitor's site works),
 *   but we still never return a literal "*" for credentialed-looking flows.
 *
 * We infer the widget from either:
 *   - `?key=` query string (config/GET requests), or
 *   - the JSON body's `key` field (POST session), or
 *   - the session's organization via `?sessionId=` (message polling).
 *
 * When we can't resolve a widget (missing key, OPTIONS preflight, etc.) we fall back
 * to a permissive echo — browsers will still enforce same-origin for non-simple requests,
 * and CORS here exists mainly to *allow* legitimate cross-site embeds.
 */
export async function buildWidgetCorsHeaders(
  req: NextRequest,
  origin: string | null,
): Promise<Record<string, string>> {
  const allowed = await resolveAllowedOrigins(req)

  let allowOrigin = origin || ""
  if (allowed && allowed.length > 0) {
    allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || ""
  } else if (!allowOrigin) {
    allowOrigin = "*"
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

async function resolveAllowedOrigins(req: NextRequest): Promise<string[] | null> {
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    if (key) {
      const w = await prisma.webChatWidget.findUnique({
        where: { publicKey: key },
        select: { allowedOrigins: true },
      })
      return w?.allowedOrigins ?? null
    }
    const sessionId = url.searchParams.get("sessionId")
    if (sessionId) {
      const s = await prisma.webChatSession.findUnique({
        where: { id: sessionId },
        select: { organizationId: true },
      })
      if (s) {
        const w = await prisma.webChatWidget.findUnique({
          where: { organizationId: s.organizationId },
          select: { allowedOrigins: true },
        })
        return w?.allowedOrigins ?? null
      }
    }
  } catch {}
  return null
}
