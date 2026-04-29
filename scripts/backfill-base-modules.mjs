// One-shot backfill: ensure every new-tier tenant's `Organization.features`
// contains the BASE_PLAN_MODULES set, so the new authoritative-modules
// branch in `hasModule()` (src/lib/modules.ts) doesn't hide pages from
// tenants who never intended to disable them.
//
// Why: before the semantic change, `hasModule()` short-circuited
// `BASE_PLAN_MODULES.includes(moduleId)` to `true` on any new-tier plan.
// That made admin toggles for Deals/Leads/Tasks/Contracts/etc. decorative —
// the toggle saved to `Organization.features`, but the gate ignored it.
// After the change, the features array is authoritative. Without this
// backfill, every tenant whose features list is sparse (most of them, since
// the bypass meant nobody had a reason to populate it) would lose every
// base module from their sidebar overnight.
//
// What this script does: union(current features, BASE_PLAN_MODULES,
// plan-tier defaults). Add-only — never removes anything — so an admin's
// pre-existing OFF intent for plan-default features (e.g. complaints_register
// removed from a specific tenant) is preserved if they were toggled off after
// the v1 backfill ran. Idempotent.
//
// Usage (typically via server-deploy.sh Step 3d, sentinel-gated):
//   node scripts/backfill-base-modules.mjs              # dry-run
//   node scripts/backfill-base-modules.mjs --execute    # actually writes

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Mirror of src/lib/modules.ts BASE_PLAN_MODULES + USER_TIERS keys.
// Update both files together if either changes.
const BASE_PLAN_MODULES = [
  "core", "deals", "leads", "tasks", "contracts",
  "campaigns", "events", "reports", "workflows",
  "knowledge-base", "tickets", "custom-fields", "currencies",
  "projects",
]

const NEW_TIER_PLANS = new Set(["tier-5", "tier-10", "tier-25", "tier-50", "enterprise"])

// Mirror of src/lib/tenant-plans.ts plan-default features. Only the
// `features` arrays here — `addons` are managed separately on the
// `Organization.addons` column.
//
// NOTE: these overlap with what scripts/backfill-plan-features.mjs (Step 3c
// in server-deploy.sh) writes. Set-merge below makes the overlap harmless —
// any tenant that already passed Step 3c will see them in `current` and the
// missing-set will be empty for those entries.
const PLAN_DEFAULT_FEATURES = {
  starter: [],
  professional: ["whatsapp", "ai", "complaints_register"],
  enterprise: ["whatsapp", "ai", "voip", "portal", "events", "complaints_register"],
}

function parseFeatures(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw || "[]") } catch { return [] }
  }
  return []
}

async function main() {
  const execute = process.argv.includes("--execute")
  const mode = execute ? "EXECUTE" : "DRY-RUN"
  console.log(`[backfill-base-modules] mode=${mode}`)

  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true, name: true, plan: true, features: true },
    orderBy: { slug: "asc" },
  })

  console.log(`[backfill-base-modules] scanning ${orgs.length} organization(s)`)

  let touched = 0
  let alreadyOk = 0
  let skipped = 0

  for (const org of orgs) {
    // Only operate on new-tier plans — legacy plans use LEGACY_PLANS.modules
    // mapping in `hasModule()` and aren't affected by the semantic change.
    if (!NEW_TIER_PLANS.has(org.plan)) {
      console.log(`  [SKIP] ${org.slug}: legacy plan="${org.plan}"`)
      skipped++
      continue
    }

    const current = parseFeatures(org.features)
    const planDefaults = PLAN_DEFAULT_FEATURES[org.plan] || []
    const target = [...new Set([...current, ...BASE_PLAN_MODULES, ...planDefaults])]
    const missing = target.filter((f) => !current.includes(f))

    if (missing.length === 0) {
      alreadyOk++
      continue
    }

    console.log(
      `  [PATCH] ${org.slug} (plan=${org.plan}): +[${missing.join(", ")}]  ` +
      `before=${current.length} after=${target.length}`,
    )

    if (execute) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { features: target },
      })
    }
    touched++
  }

  console.log(
    `[backfill-base-modules] done. touched=${touched} alreadyOk=${alreadyOk} skipped(legacy)=${skipped}`,
  )
  if (!execute && touched > 0) {
    console.log(`[backfill-base-modules] re-run with --execute to write ${touched} update(s)`)
  }
}

main()
  .catch((err) => {
    console.error("[backfill-base-modules] FAILED:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
