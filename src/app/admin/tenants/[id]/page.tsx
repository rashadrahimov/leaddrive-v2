import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Users, Contact, Briefcase, Building2 } from "lucide-react"
import Link from "next/link"
import { TenantActions } from "./tenant-actions"
import { TenantEditButton } from "./tenant-edit"

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const tenant = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { users: true, contacts: true, deals: true, companies: true, leads: true },
      },
    },
  })

  if (!tenant) notFound()

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "leaddrivecrm.org"
  const tenantUrl = `https://${tenant.slug}.${baseDomain}`

  const stats = [
    { label: "Users", value: tenant._count.users, icon: Users },
    { label: "Contacts", value: tenant._count.contacts, icon: Contact },
    { label: "Companies", value: tenant._count.companies, icon: Building2 },
    { label: "Deals", value: tenant._count.deals, icon: Briefcase },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/tenants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.isActive ? "default" : "destructive"}>
                {tenant.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TenantEditButton tenant={{
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            maxUsers: tenant.maxUsers,
            maxContacts: tenant.maxContacts,
            branding: tenant.branding,
            features: tenant.features,
          }} />
          <a href={tenantUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" />
              Open CRM
            </Button>
          </a>
        </div>
      </div>

      {/* Tenant actions (deletion, export, deactivation) */}
      <TenantActions
        tenantId={tenant.id}
        isActive={tenant.isActive}
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        deletionScheduledAt={tenant.deletionScheduledAt?.toISOString() || null}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl font-bold mt-0.5">{stat.value}</p>
                </div>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Plan</dt>
              <dd><Badge variant="outline" className="capitalize">{tenant.plan}</Badge></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max Users</dt>
              <dd>{tenant.maxUsers === -1 ? "Unlimited" : tenant.maxUsers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max Contacts</dt>
              <dd>{tenant.maxContacts === -1 ? "Unlimited" : tenant.maxContacts.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Server Type</dt>
              <dd className="capitalize">{tenant.serverType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">URL</dt>
              <dd className="font-mono text-xs">{tenantUrl}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(tenant.createdAt).toLocaleString()}</dd>
            </div>
            {tenant.provisionedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provisioned</dt>
                <dd>{new Date(tenant.provisionedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Users */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Users ({tenant.users.length})</h3>
          <div className="space-y-2">
            {tenant.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{user.role}</Badge>
                  {!user.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                </div>
              </div>
            ))}
            {tenant.users.length === 0 && (
              <p className="text-sm text-muted-foreground">No users</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
