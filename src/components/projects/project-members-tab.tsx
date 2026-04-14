"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, X } from "lucide-react"
import { getCurrencySymbol } from "@/lib/constants"
import { type ProjectMember, formatDate } from "./project-types"

interface ProjectMembersTabProps {
  projectId: string
  members: ProjectMember[]
  users: { id: string; name: string }[]
  currency: string
  headers: Record<string, string>
  onRefresh: () => void
  getUserName: (id?: string) => string
}

export function ProjectMembersTab({ projectId, members, users, currency, headers, onRefresh, getUserName }: ProjectMembersTabProps) {
  const t = useTranslations("projects")
  const sym = getCurrencySymbol(currency)

  const [showForm, setShowForm] = useState(false)
  const [memberUserId, setMemberUserId] = useState("")
  const [memberRole, setMemberRole] = useState("member")

  const roleLabels: Record<string, string> = {
    manager: t("roleManager"), member: t("roleMember"), viewer: t("roleViewer"),
  }

  async function handleAddMember() {
    if (!memberUserId) return
    await fetch(`/api/v1/projects/${projectId}/members`, {
      method: "POST", headers, body: JSON.stringify({ userId: memberUserId, role: memberRole }),
    })
    setShowForm(false); setMemberUserId(""); setMemberRole("member"); onRefresh()
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/v1/projects/${projectId}/members?memberId=${memberId}`, { method: "DELETE", headers })
    onRefresh()
  }

  async function updateMemberRole(memberId: string, role: string) {
    await fetch(`/api/v1/projects/${projectId}/members`, {
      method: "PUT", headers, body: JSON.stringify({ memberId, role }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addMember")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("addMember")}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={memberUserId} onChange={e => setMemberUserId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Select user —</option>
              {users.filter(u => !members.some(m => m.userId === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select value={memberRole} onChange={e => setMemberRole(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleAddMember} disabled={!memberUserId}>{t("create")}</Button>
          </div>
        </div>
      )}

      {members.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-primary/[0.03]">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("estimatedHours")}</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Joined</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-border/20 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {getUserName(m.userId).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{getUserName(m.userId)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={m.role} onChange={e => updateMemberRole(m.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-input bg-background font-medium cursor-pointer">
                      {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.hoursLogged}h logged{m.hourlyRate ? ` · ${sym}${m.hourlyRate}/h` : ""}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(m.joinedAt)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => removeMember(m.id)} className="p-1 rounded hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No members yet</p>
        </div>
      )}
    </div>
  )
}
