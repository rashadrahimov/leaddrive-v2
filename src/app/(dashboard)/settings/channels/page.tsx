'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Send } from 'lucide-react';

const channels = [
  { name: 'Telegram', icon: Send, description: 'Connect your Telegram bot' },
  { name: 'WhatsApp', icon: MessageCircle, description: 'Integrate WhatsApp Business' },
  { name: 'SMS', icon: Phone, description: 'Set up SMS gateway' },
  { name: 'Email', icon: Mail, description: 'Configure email integration' },
];

export default function ChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communication Channels</h1>
        <p className="text-muted-foreground mt-2">
          Configure your communication channels for customer engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((ch) => {
          const Icon = ch.icon;
          return (
            <Card key={ch.name} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{ch.name}</h3>
                    <p className="text-sm text-muted-foreground">{ch.description}</p>
                  </div>
                </div>
              </div>
              <Button className="mt-4 w-full" variant="outline">
                Configure
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
