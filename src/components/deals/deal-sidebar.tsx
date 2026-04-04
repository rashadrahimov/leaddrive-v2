"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AccordionItem } from "@/components/ui/accordion"
import { MotionCard } from "@/components/ui/motion"
import {
  Phone, Mail, MessageSquare, Building2, User, Calendar, DollarSign,
  Clock, Target, FileText, Receipt, Users, Swords, Package, Plus, X,
  Pencil, Loader2, Check, Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface Deal {
  id: string
  name: string
  stage: string
  valueAmount: number
  currency: string
  probability: number
  confidenceLevel: number
  assignedTo: string | null
  notes: string | null
  expectedClose: string | null
  stageChangedAt: string | null
  createdAt: string
  updatedAt: string
  lostReason: string | null
  tags: string[]
  contactId: string | null
  customerNeed: string | null
  salesChannel: string | null
  company: { id: string; name: string } | null
  campaign: { id: string; name: string } | null
  contact: { id: string; fullName: string; position: string | null; email: string | null; phone: string | null; avatar: string | null } | null
  teamMembers: Array<{
    id: string; userId: string; role: string
    user: { id: string; name: string | null; email: string; avatar: string | null; role: string | null }
  }>
  contactRoles: Array<{
    id: string; contactId: string; role: string; influence: string; loyalty: string; isPrimary: boolean
    contact: { id: string; fullName: string; position: string | null; email: string | null; phone: string | null }
  }>
}

interface DealSidebarProps {
  deal: Deal
  orgId?: string
  offersCount: number
  invoicesCount: number
  onEdit: () => void
  fetchDeal: () => void
}

export function DealSidebar({ deal, orgId, offersCount, invoicesCount, onEdit, fetchDeal }: DealSidebarProps) {
  const t = useTranslations("deals")
  const tc = useTranslations("common")

  return (
    <MotionCard className="space-y-0">
      {/* ── Contact Hero ── */}
      {deal.contact && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-base font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              {deal.contact.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{deal.contact.fullName}</p>
              {deal.contact.position && (
                <p className="text-xs text-muted-foreground truncate">{deal.contact.position}</p>
              )}
            </div>
          </div>
          {/* Communication actions */}
          <div className="flex items-center gap-2 mt-3">
            {deal.contact.phone && (
              <a href={`tel:${deal.contact.phone}`} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium transition-colors">
                <Phone className="h-3.5 w-3.5" /> {tc("call")}
              </a>
            )}
            {deal.contact.email && (
              <a href={`mailto:${deal.contact.email}`} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
            {deal.contact.phone && (
              <a href={`https://wa.me/${deal.contact.phone.replace(/[^0-9]/g, "")}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-colors">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Deal Value + Stage (hero) ── */}
      <div className="p-4 border-b border-border">
        <div className="text-2xl font-bold tracking-tight">
          {deal.valueAmount.toLocaleString()} {deal.currency}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{t("winProbability")}: {deal.probability}%</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{t("confidenceLevel")}: {deal.confidenceLevel ?? 50}%</span>
        </div>
      </div>

      {/* ── Key Info ── */}
      <div className="p-4 border-b border-border space-y-2.5">
        {[
          { icon: Building2, label: t("company"), value: deal.company?.name },
          { icon: User, label: t("assignedTo"), value: deal.assignedTo },
          { icon: Calendar, label: t("expectedClose"), value: deal.expectedClose ? new Date(deal.expectedClose).toLocaleDateString("az-AZ") : null },
          { icon: Clock, label: tc("created"), value: new Date(deal.createdAt).toLocaleDateString("az-AZ") },
          { icon: Target, label: t("campaign"), value: deal.campaign?.name },
          { icon: Target, label: t("customerNeed"), value: deal.customerNeed },
          { icon: Target, label: t("salesChannel"), value: deal.salesChannel },
        ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
            <span className="text-xs font-medium truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      {deal.notes && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("notes")}</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{deal.notes}</p>
          {deal.lostReason && (
            <div className="flex items-start gap-1.5 mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{tc("lostReason")}:</span>
              <span className="text-xs text-red-600 dark:text-red-400">{deal.lostReason}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Collapsible Sections ── */}
      <div className="px-3 py-1">
        {/* Offers */}
        <AccordionItem
          title={t("offers")}
          icon={<FileText className="h-3.5 w-3.5" />}
          count={offersCount}
          defaultOpen={offersCount > 0}
        >
          <div className="space-y-1.5">
            {offersCount > 0 && <p className="text-xs text-muted-foreground">{offersCount} {t("offers").toLowerCase()}</p>}
            <a href={`/offers?dealId=${deal.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <FileText className="h-3 w-3" /> {tc("viewAll")}
            </a>
          </div>
        </AccordionItem>

        {/* Invoices */}
        <AccordionItem
          title={tc("invoicesTitle")}
          icon={<Receipt className="h-3.5 w-3.5" />}
          count={invoicesCount}
          defaultOpen={invoicesCount > 0}
        >
          <div className="space-y-1.5">
            {invoicesCount > 0 && <p className="text-xs text-muted-foreground">{invoicesCount}</p>}
            <a href={`/invoices?dealId=${deal.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Receipt className="h-3 w-3" /> {tc("viewAll")}
            </a>
          </div>
        </AccordionItem>

        {/* Team */}
        <AccordionItem
          title={t("team")}
          icon={<Users className="h-3.5 w-3.5" />}
          count={deal.teamMembers?.length || 0}
          defaultOpen={(deal.teamMembers?.length || 0) > 0}
        >
          <div className="space-y-1.5">
            {deal.teamMembers?.length > 0 ? (
              deal.teamMembers.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1 group">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {(m.user.name || m.user.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-xs truncate flex-1">{m.user.name || m.user.email}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{m.role}</Badge>
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async () => {
                      await fetch(`/api/v1/deals/${deal.id}/team`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
                        body: JSON.stringify({ userId: m.userId }),
                      })
                      fetchDeal()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{tc("noTeamMembers")}</p>
            )}
            <Button variant="outline" size="sm" className="w-full gap-1 h-7 text-[10px]" onClick={() => onEdit()}>
              <Plus className="h-3 w-3" /> {tc("addMember")}
            </Button>
          </div>
        </AccordionItem>

        {/* Contact Roles */}
        <AccordionItem
          title={t("contactRoles")}
          icon={<Users className="h-3.5 w-3.5" />}
          count={deal.contactRoles?.length || 0}
          defaultOpen={(deal.contactRoles?.length || 0) > 0}
        >
          <div className="space-y-1.5">
            {deal.contactRoles?.length > 0 ? (
              deal.contactRoles.map(cr => (
                <div key={cr.id} className="flex items-center gap-2 py-1 group">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {(cr.contact.fullName || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{cr.contact.fullName}</span>
                    {cr.contact.position && <span className="text-[10px] text-muted-foreground truncate block">{cr.contact.position}</span>}
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{cr.role}</Badge>
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async () => {
                      await fetch(`/api/v1/deals/${deal.id}/contact-roles`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
                        body: JSON.stringify({ contactId: cr.contactId }),
                      })
                      fetchDeal()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{tc("noContactRoles")}</p>
            )}
            <Button variant="outline" size="sm" className="w-full gap-1 h-7 text-[10px]" onClick={() => onEdit()}>
              <Plus className="h-3 w-3" /> {tc("addContactRole")}
            </Button>
          </div>
        </AccordionItem>

        {/* Competitors */}
        <AccordionItem
          title={t("competitors")}
          icon={<Swords className="h-3.5 w-3.5" />}
          count={0}
        >
          <p className="text-xs text-muted-foreground">{tc("noCompetitors")}</p>
        </AccordionItem>
      </div>
    </MotionCard>
  )
}
