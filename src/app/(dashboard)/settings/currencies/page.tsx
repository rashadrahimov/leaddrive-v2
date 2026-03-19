'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

const currencies = [
  { code: 'AZN', name: 'Azerbaijani Manat', rate: 1.7, base: true },
  { code: 'USD', name: 'US Dollar', rate: 1.0, base: false },
  { code: 'EUR', name: 'Euro', rate: 0.92, base: false },
];

export default function CurrenciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Currencies</h1>
        <p className="text-muted-foreground mt-2">Manage currencies and exchange rates</p>
      </div>

      <div className="space-y-3">
        {currencies.map((curr) => (
          <Card key={curr.code} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {curr.code}
                    {curr.base && (
                      <Badge variant="default" className="text-xs">
                        Base
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{curr.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Rate: {curr.rate}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
