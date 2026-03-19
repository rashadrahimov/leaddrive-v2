'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Database } from 'lucide-react';

const orgs = [
  { id: 1, name: 'Acme Corp', plan: 'Enterprise', users: 24, usage: '78%' },
  { id: 2, name: 'TechStart Inc', plan: 'Pro', users: 8, usage: '45%' },
  { id: 3, name: 'Global Solutions', plan: 'Starter', users: 2, usage: '12%' },
];

const stats = [
  { label: 'Total Organizations', value: '247', icon: Users },
  { label: 'Active Users', value: '1,843', icon: Users },
  { label: 'Database Usage', value: '2.4 TB', icon: Database },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">System overview and organization management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Organizations
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Plan</th>
                  <th className="text-left py-3 px-4 font-medium">Users</th>
                  <th className="text-left py-3 px-4 font-medium">Storage Usage</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} className="border-b hover:bg-accent transition-colors">
                    <td className="py-3 px-4 font-medium">{org.name}</td>
                    <td className="py-3 px-4">
                      <Badge>{org.plan}</Badge>
                    </td>
                    <td className="py-3 px-4">{org.users}</td>
                    <td className="py-3 px-4">{org.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
