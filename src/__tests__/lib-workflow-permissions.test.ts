import { describe, it, expect } from "vitest"
import {
  checkPermission,
  resolveModuleFromPath,
  methodToAction,
  canRead,
  canWrite,
  canDelete,
  canExport,
  isAdmin,
  isSuperAdmin,
  requirePermission,
} from "@/lib/permissions"
import { hasModule, MODULE_REGISTRY, getOrgModules } from "@/lib/modules"
import type { Role, Action, Module } from "@/lib/permissions"
import type { ModuleId } from "@/lib/modules"

// ─── permissions.ts ─────────────────────────────────────────

describe("checkPermission", () => {
  it("admin has all actions on any module via wildcard", () => {
    expect(checkPermission("admin", "companies", "read")).toBe(true)
    expect(checkPermission("admin", "companies", "write")).toBe(true)
    expect(checkPermission("admin", "companies", "delete")).toBe(true)
    expect(checkPermission("admin", "companies", "export")).toBe(true)
    expect(checkPermission("admin", "companies", "admin")).toBe(true)
  })

  it("superadmin has all actions on any module via wildcard", () => {
    expect(checkPermission("superadmin", "deals", "delete")).toBe(true)
    expect(checkPermission("superadmin", "settings", "admin")).toBe(true)
  })

  it("viewer can only read (wildcard read)", () => {
    expect(checkPermission("viewer", "deals", "read")).toBe(true)
    expect(checkPermission("viewer", "deals", "write")).toBe(false)
    expect(checkPermission("viewer", "deals", "delete")).toBe(false)
    expect(checkPermission("viewer", "deals", "export")).toBe(false)
  })

  it("manager can read+write+delete companies but not admin", () => {
    expect(checkPermission("manager", "companies", "read")).toBe(true)
    expect(checkPermission("manager", "companies", "write")).toBe(true)
    expect(checkPermission("manager", "companies", "delete")).toBe(true)
    expect(checkPermission("manager", "companies", "admin")).toBe(false)
  })

  it("sales can write deals but cannot export companies", () => {
    expect(checkPermission("sales", "deals", "write")).toBe(true)
    expect(checkPermission("sales", "companies", "export")).toBe(false)
  })

  it("support can write tickets and delete them", () => {
    expect(checkPermission("support", "tickets", "write")).toBe(true)
    expect(checkPermission("support", "tickets", "delete")).toBe(true)
  })

  it("support cannot access leads at all", () => {
    expect(checkPermission("support", "leads", "read")).toBe(false)
    expect(checkPermission("support", "leads", "write")).toBe(false)
  })

  it("sales has no access to settings", () => {
    expect(checkPermission("sales", "settings", "read")).toBe(false)
    expect(checkPermission("sales", "settings", "write")).toBe(false)
  })

  it("returns false for unknown role", () => {
    expect(checkPermission("unknown" as Role, "companies", "read")).toBe(false)
  })
})

describe("requirePermission", () => {
  it("throws for denied permission", () => {
    expect(() => requirePermission("viewer", "deals", "write")).toThrow("Permission denied")
  })

  it("does not throw for allowed permission", () => {
    expect(() => requirePermission("admin", "deals", "write")).not.toThrow()
  })
})

describe("convenience helpers", () => {
  it("canRead / canWrite / canDelete / canExport", () => {
    expect(canRead("sales", "deals")).toBe(true)
    expect(canWrite("sales", "deals")).toBe(true)
    expect(canDelete("sales", "deals")).toBe(true)
    expect(canExport("sales", "deals")).toBe(false)
  })

  it("isAdmin / isSuperAdmin", () => {
    expect(isAdmin("admin")).toBe(true)
    expect(isAdmin("superadmin")).toBe(true)
    expect(isAdmin("manager")).toBe(false)
    expect(isSuperAdmin("superadmin")).toBe(true)
    expect(isSuperAdmin("admin")).toBe(false)
  })
})

// ─── resolveModuleFromPath ──────────────────────────────────

describe("resolveModuleFromPath", () => {
  it("exact match: /api/v1/companies -> companies", () => {
    expect(resolveModuleFromPath("/api/v1/companies")).toBe("companies")
  })

  it("exact match: /api/v1/deals -> deals", () => {
    expect(resolveModuleFromPath("/api/v1/deals")).toBe("deals")
  })

  it("prefix match: /api/v1/projects/123/tasks -> projects", () => {
    expect(resolveModuleFromPath("/api/v1/projects/123/tasks")).toBe("projects")
  })

  it("maps settings-related routes to settings module", () => {
    expect(resolveModuleFromPath("/api/v1/workflows")).toBe("settings")
    expect(resolveModuleFromPath("/api/v1/custom-fields")).toBe("settings")
    expect(resolveModuleFromPath("/api/v1/currencies")).toBe("settings")
    expect(resolveModuleFromPath("/api/v1/sla-policies")).toBe("settings")
  })

  it("maps AI routes to ai module", () => {
    expect(resolveModuleFromPath("/api/v1/ai")).toBe("ai")
    expect(resolveModuleFromPath("/api/v1/ai-configs")).toBe("ai")
    expect(resolveModuleFromPath("/api/v1/ai-sessions/abc")).toBe("ai")
  })

  it("returns null for unknown path", () => {
    expect(resolveModuleFromPath("/api/v1/unknown")).toBeNull()
    expect(resolveModuleFromPath("/random")).toBeNull()
  })
})

// ─── methodToAction ─────────────────────────────────────────

describe("methodToAction", () => {
  it("GET -> read", () => {
    expect(methodToAction("GET")).toBe("read")
  })

  it("POST -> write", () => {
    expect(methodToAction("POST")).toBe("write")
  })

  it("PUT -> write", () => {
    expect(methodToAction("PUT")).toBe("write")
  })

  it("PATCH -> write", () => {
    expect(methodToAction("PATCH")).toBe("write")
  })

  it("DELETE -> delete", () => {
    expect(methodToAction("DELETE")).toBe("delete")
  })

  it("handles lowercase input", () => {
    expect(methodToAction("get")).toBe("read")
    expect(methodToAction("post")).toBe("write")
  })

  it("unknown method defaults to read", () => {
    expect(methodToAction("OPTIONS")).toBe("read")
  })
})

// ─── modules.ts — hasModule ─────────────────────────────────

describe("hasModule", () => {
  it("core is always on regardless of plan", () => {
    expect(hasModule({ plan: "starter" }, "core")).toBe(true)
    expect(hasModule({ plan: "tier-5" }, "core")).toBe(true)
  })

  // New tier-based plans
  it("tier-5 includes base plan modules", () => {
    expect(hasModule({ plan: "tier-5" }, "deals")).toBe(true)
    expect(hasModule({ plan: "tier-5" }, "leads")).toBe(true)
    expect(hasModule({ plan: "tier-5" }, "tasks")).toBe(true)
    expect(hasModule({ plan: "tier-5" }, "contracts")).toBe(true)
    expect(hasModule({ plan: "tier-5" }, "reports")).toBe(true)
  })

  it("tier-5 without addons does NOT include ai", () => {
    expect(hasModule({ plan: "tier-5" }, "ai")).toBe(false)
  })

  it("tier-10 with ai addon unlocks ai module", () => {
    expect(hasModule({ plan: "tier-10", addons: ["ai"] }, "ai")).toBe(true)
  })

  it("tier-25 with finance addon unlocks invoices, budgeting, profitability", () => {
    const org = { plan: "tier-25" as string, addons: ["finance"] }
    expect(hasModule(org, "invoices")).toBe(true)
    expect(hasModule(org, "budgeting")).toBe(true)
    expect(hasModule(org, "profitability")).toBe(true)
  })

  it("org.modules override enables arbitrary module", () => {
    expect(hasModule({ plan: "tier-5", modules: { mtm: true } }, "mtm")).toBe(true)
  })

  // Legacy plans
  it("starter plan includes core, deals, leads, tasks only", () => {
    expect(hasModule({ plan: "starter" }, "deals")).toBe(true)
    expect(hasModule({ plan: "starter" }, "tickets")).toBe(false)
    expect(hasModule({ plan: "starter" }, "campaigns")).toBe(false)
  })

  it("business plan includes tickets and knowledge-base", () => {
    expect(hasModule({ plan: "business" }, "tickets")).toBe(true)
    expect(hasModule({ plan: "business" }, "knowledge-base")).toBe(true)
  })

  it("enterprise tier includes base modules but requires addons for extras", () => {
    // "enterprise" exists in both USER_TIERS and LEGACY_PLANS, but isNewTier takes precedence
    expect(hasModule({ plan: "enterprise" }, "deals")).toBe(true)
    expect(hasModule({ plan: "enterprise" }, "tasks")).toBe(true)
    // ai requires addon even on enterprise tier
    expect(hasModule({ plan: "enterprise" }, "ai")).toBe(false)
    expect(hasModule({ plan: "enterprise", addons: ["ai"] }, "ai")).toBe(true)
  })

  it("legacy plan with addon override", () => {
    expect(hasModule({ plan: "starter", addons: ["ai"] }, "ai")).toBe(true)
  })
})

describe("getOrgModules", () => {
  it("returns all modules for enterprise with all addons", () => {
    const mods = getOrgModules({ plan: "enterprise", addons: ["ai", "finance", "channels", "mtm"] })
    expect(mods).toContain("core")
    expect(mods).toContain("ai")
    expect(mods).toContain("invoices")
    expect(mods).toContain("mtm")
    expect(mods).toContain("omnichannel")
  })

  it("returns base + addon modules for tier plan", () => {
    const mods = getOrgModules({ plan: "tier-5", addons: ["ai", "finance"] })
    expect(mods).toContain("ai")
    expect(mods).toContain("invoices")
    expect(mods).not.toContain("mtm")
  })
})

describe("MODULE_REGISTRY structure", () => {
  it("every module has a name and requires array", () => {
    for (const [id, def] of Object.entries(MODULE_REGISTRY)) {
      expect(def.name).toBeTruthy()
      expect(Array.isArray(def.requires)).toBe(true)
    }
  })

  it("core is marked as alwaysOn", () => {
    expect(MODULE_REGISTRY.core.alwaysOn).toBe(true)
  })
})
