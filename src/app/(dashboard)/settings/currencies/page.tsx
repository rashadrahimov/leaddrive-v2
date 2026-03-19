'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isActive: boolean;
}

export default function CurrenciesPage() {
  const { data: session } = useSession();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/v1/currencies');
        if (response.ok) {
          const result = await response.json();
          setCurrencies(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencies();
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Currencies</h1>
          <p className="text-muted-foreground mt-2">Manage currencies and exchange rates</p>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Currencies</h1>
        <p className="text-muted-foreground mt-2">Manage currencies and exchange rates</p>
      </div>

      <div className="space-y-3">
        {currencies.map((curr) => (
          <Card key={curr.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {curr.code}
                    {curr.isBase && (
                      <Badge variant="default" className="text-xs">
                        Base
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{curr.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Rate: {curr.exchangeRate}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
