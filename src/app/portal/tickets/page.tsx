'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

const tickets = [
  { id: 1, subject: 'Integration issue', status: 'open' as const, priority: 'high', date: '2024-03-18' },
  { id: 2, subject: 'Feature request', status: 'pending' as const, priority: 'medium', date: '2024-03-15' },
  { id: 3, subject: 'Account setup help', status: 'resolved' as const, priority: 'low', date: '2024-03-10' },
];

const statusColors = { open: 'destructive' as const, pending: 'secondary' as const, resolved: 'default' as const };

export default function PortalTicketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Your Tickets</h1>
          <p className="text-muted-foreground mt-2">View and manage your support tickets</p>
        </div>
        <Button>New Ticket</Button>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <Badge variant={statusColors[ticket.status as keyof typeof statusColors]}>
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Ticket #{ticket.id} • {ticket.date}</p>
              </div>
              <Button variant="ghost" size="sm">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
