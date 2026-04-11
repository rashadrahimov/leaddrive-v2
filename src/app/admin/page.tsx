import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Contact, Briefcase } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const [orgCount, activeOrgCount, userCount, contactCount, dealCount, recentOrgs] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.contact.count(),
    prisma.deal.count(),
    prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, contacts: true } } },
    }),
  ])

  const stats = [
    { label: "Total Tenants", value: orgCount, sub: `${activeOrgCount} active`, icon: Building2 },
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Total Contacts", value: contactCount, icon: Contact },
    { label: "Total Deals", value: dealCount, icon: Briefcase },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">System-wide overview across all tenants</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
                </div>
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Tenants</h2>
          <Link href="/admin/tenants" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3 font-medium text-muted-foreground">Name</th>
                <th className="py-2 px-3 font-medium text-muted-foreground">Slug</th>
                <th className="py-2 px-3 font-medium text-muted-foreground">Plan</th>
                <th className="py-2 px-3 font-medium text-muted-foreground">Users</th>
                <th className="py-2 px-3 font-medium text-muted-foreground">Contacts</th>
                <th className="py-2 px-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrgs.map((org) => (
                <tr key={org.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium">
                    <Link href={`/admin/tenants/${org.id}`} className="hover:text-primary">
                      {org.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">{org.slug}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="text-xs capitalize">{org.plan}</Badge>
                  </td>
                  <td className="py-2.5 px-3">{org._count.users}</td>
                  <td className="py-2.5 px-3">{org._count.contacts}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={org.isActive ? "default" : "destructive"} className="text-xs">
                      {org.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
