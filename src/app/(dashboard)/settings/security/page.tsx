'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Shield, Copy, Check, Loader2 } from 'lucide-react';

export default function SecurityPage() {
  const { data: session } = useSession();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup dialog state
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [setupStep, setSetupStep] = useState<'qr' | 'backup'>('qr');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Disable dialog state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [session]);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/v1/auth/totp/status');
      const json = await res.json();
      if (json.success) {
        setTotpEnabled(json.data.totpEnabled);
        setBackupCodes(json.data.backupCodes || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function startSetup() {
    setSetupLoading(true);
    setSetupError('');
    try {
      const res = await fetch('/api/v1/auth/totp/setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setQrCode(json.data.qrCode);
      setSecret(json.data.secret);
      setSetupStep('qr');
      setVerifyCode('');
      setSetupOpen(true);
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  async function verifySetup() {
    setSetupLoading(true);
    setSetupError('');
    try {
      const res = await fetch('/api/v1/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewBackupCodes(json.data.backupCodes);
      setSetupStep('backup');
      setTotpEnabled(true);
      setBackupCodes(json.data.backupCodes);
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  async function disable2FA() {
    setDisableLoading(true);
    setDisableError('');
    try {
      const res = await fetch('/api/v1/auth/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTotpEnabled(false);
      setBackupCodes([]);
      setDisableOpen(false);
      setDisablePassword('');
    } catch (err: any) {
      setDisableError(err.message);
    } finally {
      setDisableLoading(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <div className="animate-pulse"><div className="h-48 bg-muted rounded-lg" /></div>
      </div>
    );
  }

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
            <Badge variant={totpEnabled ? 'default' : 'secondary'}>
              {totpEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          {totpEnabled ? (
            <Button variant="destructive" onClick={() => setDisableOpen(true)}>Disable 2FA</Button>
          ) : (
            <Button onClick={startSetup} disabled={setupLoading}>
              {setupLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Setting up...</> : 'Enable TOTP'}
            </Button>
          )}
          {setupError && !setupOpen && <p className="text-sm text-red-500">{setupError}</p>}
        </div>
      </Card>

      {totpEnabled && backupCodes.length > 0 && (
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
                  <button onClick={() => copyCode(code)} className="hover:text-primary">
                    {copiedCode === code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogHeader>
          <DialogTitle>{setupStep === 'qr' ? 'Set Up 2FA' : 'Save Backup Codes'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {setupStep === 'qr' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app, then enter the 6-digit code below.
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              )}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Manual entry key:</p>
                <code className="text-sm bg-muted px-3 py-1 rounded">{secret}</code>
              </div>
              {setupError && <p className="text-sm text-red-500">{setupError}</p>}
              <Input
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Save these backup codes. You can use them to sign in if you lose access to your authenticator app.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                {newBackupCodes.map((code) => (
                  <div key={code} className="flex justify-between items-center">
                    <span>{code}</span>
                    <button onClick={() => copyCode(code)} className="hover:text-primary">
                      {copiedCode === code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          {setupStep === 'qr' ? (
            <>
              <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
              <Button onClick={verifySetup} disabled={verifyCode.length !== 6 || setupLoading}>
                {setupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Enable
              </Button>
            </>
          ) : (
            <Button onClick={() => setSetupOpen(false)}>I've Saved My Codes</Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </p>
            {disableError && <p className="text-sm text-red-500">{disableError}</p>}
            <Input
              type="password"
              placeholder="Enter your password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDisableOpen(false); setDisablePassword(''); setDisableError(''); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={disable2FA} disabled={!disablePassword || disableLoading}>
            {disableLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Disable 2FA
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
