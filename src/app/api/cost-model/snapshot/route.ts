import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute, writeCostModelLog, invalidateAiCache } from "@/lib/cost-model/db"

export async function POST(req: NextRequest) {
  try {
    const orgId = await getOrgId(req)
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const result = await loadAndCompute(orgId)

    const now = new Date()
    const snapshotMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const snapshot = await prisma.costModelSnapshot.upsert({
      where: {
        organizationId_snapshotMonth: {
          organizationId: orgId,
          snapshotMonth,
        },
      },
      update: {
        totalCost: result.summary?.totalCost ?? 0,
        totalRevenue: result.summary?.totalRevenue ?? 0,
        margin: result.summary?.margin ?? 0,
        marginPct: result.summary?.marginPct ?? 0,
        overheadTotal: result.summary?.overheadTotal ?? 0,
        employeeCost: result.summary?.employeeCost ?? 0,
        profitableClients: result.summary?.profitableClients ?? 0,
        lossClients: result.summary?.lossClients ?? 0,
        dataJson: JSON.stringify(result),
      },
      create: {
        organizationId: orgId,
        snapshotMonth,
        totalCost: result.summary?.totalCost ?? 0,
        totalRevenue: result.summary?.totalRevenue ?? 0,
        margin: result.summary?.margin ?? 0,
        marginPct: result.summary?.marginPct ?? 0,
        overheadTotal: result.summary?.overheadTotal ?? 0,
        employeeCost: result.summary?.employeeCost ?? 0,
        profitableClients: result.summary?.profitableClients ?? 0,
        lossClients: result.summary?.lossClients ?? 0,
        dataJson: JSON.stringify(result),
      },
    })

    await writeCostModelLog(orgId, "cost_model_snapshots", snapshot.id, "insert", null, { snapshotMonth })
    invalidateAiCache()

    return NextResponse.json({ success: true, data: snapshot }, { status: 201 })
  } catch (error) {
    console.error("Create snapshot error:", error)
    return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 })
  }
}
