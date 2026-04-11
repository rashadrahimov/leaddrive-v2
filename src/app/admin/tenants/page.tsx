import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TenantFilters } from "./tenant-filters"

export default async function TenantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; status?: string }>
}) {
  const params = await searchParams
  const planFilter = params.plan
  const statusFilter = params.status

  const where: any = {}
  if (planFilter && planFilter !== "all") {
    where.plan = planFilter
  }
  if (statusFilter === "active") {
    where.isActive = true
  } else if (statusFilter === "inactive") {
    where.isActive = false
  } else if (statusFilter === "pending_deletion") {
    where.deletionScheduledAt = { not: null }
  }

  const tenants = await prisma.organization.findMany({
    where,
    include: {
      _count: {
        select: { users: true, contacts: true, deals: true, companies: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const totalCount = await prisma.organization.count()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tenants.length === totalCount
              ? `${totalCount} tenant${totalCount !== 1 ? "s" : ""} total`
              : `${tenants.length} of ${totalCount} tenants`}
          </p>
        </div>
        <Link href="/admin/tenants/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </Link>
      </div>

      <TenantFilters currentPlan={planFilter} currentStatus={statusFilter} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Slug</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Plan</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Users</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Contacts</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Companies</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Deals</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    <Link href={`/admin/tenants/${t.id}`} className="hover:text-primary hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{t.slug}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs capitalize">{t.plan}</Badge>
                  </td>
                  <td className="py-3 px-4">{t._count.users}</td>
                  <td className="py-3 px-4">{t._count.contacts}</td>
                  <td className="py-3 px-4">{t._count.companies}</td>
                  <td className="py-3 px-4">{t._count.deals}</td>
                  <td className="py-3 px-4">
                    {t.deletionScheduledAt ? (
                      <Badge variant="destructive" className="text-xs">Pending Deletion</Badge>
                    ) : (
                      <Badge variant={t.isActive ? "default" : "destructive"} className="text-xs">
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No tenants match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
