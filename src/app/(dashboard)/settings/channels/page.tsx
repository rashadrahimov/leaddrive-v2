'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Send } from 'lucide-react';

interface ChannelConfig {
  id: string;
  channelType: string;
  configName: string;
  isActive: boolean;
}

const CHANNEL_ICONS: Record<string, any> = {
  telegram: Send,
  whatsapp: MessageCircle,
  sms: Phone,
  email: Mail,
};

export default function ChannelsPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/v1/channels');
        if (response.ok) {
          const result = await response.json();
          setChannels(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Communication Channels</h1>
          <p className="text-muted-foreground mt-2">
            Configure your communication channels for customer engagement
          </p>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
          const Icon = CHANNEL_ICONS[ch.channelType.toLowerCase()] || Mail;
          return (
            <Card key={ch.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{ch.configName}</h3>
                    <p className="text-sm text-muted-foreground">{ch.channelType}</p>
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
