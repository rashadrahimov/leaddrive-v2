"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import type {
  BudgetPlan,
  BudgetLine,
  BudgetActual,
  BudgetAnalytics,
  CreateBudgetPlanInput,
  UpdateBudgetPlanInput,
  CreateBudgetLineInput,
  UpdateBudgetLineInput,
  CreateBudgetActualInput,
  UpdateBudgetActualInput,
} from "./types"

function useOrgId() {
  const { data: session } = useSession()
  return (session?.user as any)?.organizationId || ""
}

async function apiFetch<T>(url: string, orgId: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-organization-id": orgId,
      ...options?.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "API error")
  return json.data
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export function useBudgetPlans() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "plans", orgId],
    queryFn: () => apiFetch<BudgetPlan[]>("/api/budgeting/plans", orgId),
    enabled: !!orgId,
  })
}

export function useCreateBudgetPlan() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetPlanInput) =>
      apiFetch<BudgetPlan>("/api/budgeting/plans", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgeting", "plans", orgId] }),
  })
}

export function useUpdateBudgetPlan() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBudgetPlanInput & { id: string }) =>
      apiFetch<BudgetPlan>(`/api/budgeting/plans/${id}`, orgId, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "plans", orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", id, orgId] })
    },
  })
}

export function useDeleteBudgetPlan() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/budgeting/plans/${id}`, orgId, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgeting", "plans", orgId] }),
  })
}

// ─── Lines ────────────────────────────────────────────────────────────────────

export function useBudgetLines(planId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "lines", planId, orgId],
    queryFn: () => apiFetch<BudgetLine[]>(`/api/budgeting/lines?planId=${planId}`, orgId),
    enabled: !!orgId && !!planId,
  })
}

export function useCreateBudgetLine() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetLineInput) =>
      apiFetch<BudgetLine>("/api/budgeting/lines", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "lines", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

export function useUpdateBudgetLine() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planId, ...input }: UpdateBudgetLineInput) =>
      apiFetch<BudgetLine>(`/api/budgeting/lines/${id}`, orgId, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "lines", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

export function useDeleteBudgetLine() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      apiFetch<void>(`/api/budgeting/lines/${id}`, orgId, { method: "DELETE" }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "lines", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

// ─── Actuals ──────────────────────────────────────────────────────────────────

export function useBudgetActuals(planId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "actuals", planId, orgId],
    queryFn: () => apiFetch<BudgetActual[]>(`/api/budgeting/actuals?planId=${planId}`, orgId),
    enabled: !!orgId && !!planId,
  })
}

export function useCreateBudgetActual() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetActualInput) =>
      apiFetch<BudgetActual>("/api/budgeting/actuals", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "actuals", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

export function useUpdateBudgetActual() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planId, ...input }: UpdateBudgetActualInput & { id: string; planId: string }) =>
      apiFetch<BudgetActual>(`/api/budgeting/actuals/${id}`, orgId, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "actuals", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

export function useDeleteBudgetActual() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      apiFetch<void>(`/api/budgeting/actuals/${id}`, orgId, { method: "DELETE" }),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "actuals", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export interface BudgetSection {
  id: string
  planId: string
  name: string
  sectionType: string
  sortOrder: number
}

export function useBudgetSections(planId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "sections", planId, orgId],
    queryFn: () => apiFetch<BudgetSection[]>(`/api/budgeting/sections?planId=${planId}`, orgId),
    enabled: !!orgId && !!planId,
  })
}

export function useCreateBudgetSection() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { planId: string; name: string; sectionType?: string; sortOrder?: number }) =>
      apiFetch<BudgetSection>("/api/budgeting/sections", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { planId }) =>
      qc.invalidateQueries({ queryKey: ["budgeting", "sections", planId, orgId] }),
  })
}

export function useDeleteBudgetSection() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      apiFetch<void>(`/api/budgeting/sections/${id}`, orgId, { method: "DELETE" }),
    onSuccess: (_data, { planId }) =>
      qc.invalidateQueries({ queryKey: ["budgeting", "sections", planId, orgId] }),
  })
}

// ─── Forecast Entries ─────────────────────────────────────────────────────────

export interface BudgetForecastEntry {
  id: string
  planId: string
  month: number
  year: number
  category: string
  forecastAmount: number
}

export function useBudgetForecastEntries(planId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "forecast", planId, orgId],
    queryFn: () => apiFetch<BudgetForecastEntry[]>(`/api/budgeting/forecast?planId=${planId}`, orgId),
    enabled: !!orgId && !!planId,
  })
}

export function useUpsertBudgetForecast() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: Array<{ planId: string; month: number; year: number; category: string; forecastAmount: number }>) =>
      apiFetch<BudgetForecastEntry[]>("/api/budgeting/forecast", orgId, {
        method: "POST",
        body: JSON.stringify({ entries }),
      }),
    onSuccess: (_data, entries) => {
      const planId = entries[0]?.planId
      if (planId) qc.invalidateQueries({ queryKey: ["budgeting", "forecast", planId, orgId] })
    },
  })
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useBudgetAnalytics(planId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["budgeting", "analytics", planId, orgId],
    queryFn: () => apiFetch<BudgetAnalytics>(`/api/budgeting/analytics?planId=${planId}`, orgId),
    enabled: !!orgId && !!planId,
  })
}

// ─── AI Narrative ────────────────────────────────────────────────────────────

export function useAINarrative() {
  const orgId = useOrgId()
  return useMutation({
    mutationFn: ({ planId, threshold }: { planId: string; threshold?: number }) =>
      apiFetch<{ narrative: string }>("/api/budgeting/ai-narrative", orgId, {
        method: "POST",
        body: JSON.stringify({ planId, threshold }),
      }),
  })
}

// ─── Sync Actuals ────────────────────────────────────────────────────────────

export function useSyncActuals() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) =>
      apiFetch<{ synced: number }>("/api/budgeting/sync-actuals", orgId, {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    onSuccess: (_data, planId) => {
      qc.invalidateQueries({ queryKey: ["budgeting", "actuals", planId, orgId] })
      qc.invalidateQueries({ queryKey: ["budgeting", "analytics", planId, orgId] })
    },
  })
}

// ─── Snapshot Actuals (monthly freeze) ───────────────────────────────────────

export function useSnapshotActuals() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, month }: { planId?: string; month?: string }) =>
      apiFetch<{ month: string; created: number; skipped: number; plans: number }>("/api/budgeting/snapshot-actuals", orgId, {
        method: "POST",
        body: JSON.stringify({ planId, month }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgeting"] })
    },
  })
}
