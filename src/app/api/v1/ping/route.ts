import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cheap DB-path health check. Used by scripts/server-deploy.sh to decide
// whether a fresh standalone build actually booted with a working Prisma
// query engine — the page/CSS checks alone pass even on a build where the
// engine binary is missing. If Prisma can't initialise, this returns 500
// and the deploy rolls back.
//
// Public: no auth required, returns only counts.  Response is ~50 bytes.
export async function GET() {
  try {
    const t = Date.now()
    const orgCount = await prisma.organization.count()
    return NextResponse.json({
      ok: true,
      db: "ok",
      orgCount,
      latencyMs: Date.now() - t,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, db: "error", error: msg.slice(0, 200) }, { status: 500 })
  }
}
