'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

const widgets = [
  { id: 1, name: 'Revenue Overview', icon: DollarSign },
  { id: 2, name: 'Deal Pipeline', icon: TrendingUp },
  { id: 3, name: 'Team Performance', icon: Users },
  { id: 4, name: 'Analytics', icon: BarChart3 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Builder</h1>
          <p className="text-muted-foreground mt-2">Customize your dashboard widgets</p>
        </div>
        <Button>Save Layout</Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Available Widgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <div
                key={widget.id}
                className="p-4 border rounded-lg flex items-center justify-between hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{widget.name}</span>
                </div>
                <Button variant="ghost" size="sm">
                  Add
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Current Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
            Drag widgets here
          </div>
          <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
            Drag widgets here
          </div>
        </div>
      </Card>
    </div>
  );
}
