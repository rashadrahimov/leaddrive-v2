'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Copy } from 'lucide-react';

export default function SecurityPage() {
  const backupCodes = ['A3K9-L2M1-Q5R8', 'B7N4-C6P9-X1Y2', 'Z8W5-V3U6-T4S7'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account security</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">TOTP Authenticator</p>
              <p className="text-sm text-muted-foreground">Use an authenticator app like Google Authenticator</p>
            </div>
            <Badge variant="secondary">Disabled</Badge>
          </div>
          <Button>Enable TOTP</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Backup Codes</h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Save these codes in a secure location. Each code can be used once.
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
            {backupCodes.map((code) => (
              <div key={code} className="flex justify-between items-center">
                <span>{code}</span>
                <Copy className="w-4 h-4 cursor-pointer hover:text-primary" />
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full">
            Regenerate Codes
          </Button>
        </div>
      </Card>
    </div>
  );
}
