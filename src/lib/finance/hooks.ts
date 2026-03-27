"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import type {
  FinanceDashboardData,
  ReceivablesData,
  PayablesStats,
  Bill,
  BillPayment,
  CreateBillInput,
  UpdateBillInput,
  Fund,
  FundTransaction,
  FundRule,
  CreateFundInput,
  CreateFundTransactionInput,
  CreateFundRuleInput,
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
  return json.data ?? json
}

// ─── Finance Dashboard ─────────────────────────────────────────────────────

export function useFinanceDashboard(year: number) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "dashboard", year, orgId],
    queryFn: () => apiFetch<FinanceDashboardData>(`/api/finance/dashboard?year=${year}`, orgId),
    enabled: !!orgId,
  })
}

// ─── Receivables (A/R) ─────────────────────────────────────────────────────

export function useReceivables() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "receivables", orgId],
    queryFn: () => apiFetch<ReceivablesData>("/api/finance/receivables", orgId),
    enabled: !!orgId,
  })
}

// ─── Payables (A/P) ────────────────────────────────────────────────────────

export function usePayables() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "payables", orgId],
    queryFn: () => apiFetch<Bill[]>("/api/finance/payables", orgId),
    enabled: !!orgId,
  })
}

export function usePayablesStats() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "payables-stats", orgId],
    queryFn: () => apiFetch<PayablesStats>("/api/finance/payables/stats", orgId),
    enabled: !!orgId,
  })
}

export function useCreateBill() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBillInput) =>
      apiFetch<Bill>("/api/finance/payables", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "payables", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "payables-stats", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useUpdateBill() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBillInput & { id: string }) =>
      apiFetch<Bill>(`/api/finance/payables/${id}`, orgId, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "payables", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "payables-stats", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useDeleteBill() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/finance/payables/${id}`, orgId, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "payables", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "payables-stats", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useBillPayments(billId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "bill-payments", billId, orgId],
    queryFn: () => apiFetch<BillPayment[]>(`/api/finance/payables/${billId}/payments`, orgId),
    enabled: !!orgId && !!billId,
  })
}

export function useCreateBillPayment() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ billId, ...input }: { billId: string; amount: number; paymentMethod?: string; paymentDate?: string; reference?: string; notes?: string }) =>
      apiFetch<BillPayment>(`/api/finance/payables/${billId}/payments`, orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance", "bill-payments", vars.billId, orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "payables", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "payables-stats", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

// ─── Funds ──────────────────────────────────────────────────────────────────

export function useFunds() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "funds", orgId],
    queryFn: () => apiFetch<Fund[]>("/api/finance/funds", orgId),
    enabled: !!orgId,
  })
}

export function useCreateFund() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFundInput) =>
      apiFetch<Fund>("/api/finance/funds", orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "funds", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useUpdateFund() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateFundInput> & { id: string }) =>
      apiFetch<Fund>(`/api/finance/funds/${id}`, orgId, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "funds", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useDeleteFund() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/finance/funds/${id}`, orgId, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "funds", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useFundTransactions(fundId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "fund-transactions", fundId, orgId],
    queryFn: () => apiFetch<FundTransaction[]>(`/api/finance/funds/${fundId}/transactions`, orgId),
    enabled: !!orgId && !!fundId,
  })
}

export function useCreateFundTransaction() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFundTransactionInput) =>
      apiFetch<FundTransaction>(`/api/finance/funds/${input.fundId}/transactions`, orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance", "fund-transactions", vars.fundId, orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "funds", orgId] })
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] })
    },
  })
}

export function useFundRules(fundId: string) {
  const orgId = useOrgId()
  return useQuery({
    queryKey: ["finance", "fund-rules", fundId, orgId],
    queryFn: () => apiFetch<FundRule[]>(`/api/finance/funds/${fundId}/rules`, orgId),
    enabled: !!orgId && !!fundId,
  })
}

export function useCreateFundRule() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFundRuleInput) =>
      apiFetch<FundRule>(`/api/finance/funds/${input.fundId}/rules`, orgId, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance", "fund-rules", vars.fundId, orgId] })
    },
  })
}

export function useUpdateFundRule() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fundId, ...input }: Partial<CreateFundRuleInput> & { id: string; fundId: string }) =>
      apiFetch<FundRule>(`/api/finance/funds/${fundId}/rules`, orgId, {
        method: "PUT",
        body: JSON.stringify({ id, ...input }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance", "fund-rules", vars.fundId, orgId] })
    },
  })
}

export function useDeleteFundRule() {
  const orgId = useOrgId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fundId }: { id: string; fundId: string }) =>
      apiFetch<void>(`/api/finance/funds/${fundId}/rules`, orgId, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance", "fund-rules", vars.fundId, orgId] })
    },
  })
}
