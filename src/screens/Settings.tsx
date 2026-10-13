import { useState } from 'react';
import { CheckCircle2, LogOut, Moon, Server, Sun, XCircle } from 'lucide-react';
import { API_LABEL } from '../lib/config';
import { useAuth } from '../lib/auth';
import { admin } from '../lib/endpoints';
import { fmtDate } from '../lib/format';
import { Avatar, Badge, Button, Card, CardHeader, PageHeader, Segmented } from '../ui/kit';

export function Settings({ dark, onSetDark }: { dark: boolean; onSetDark: (dark: boolean) => void }) {
  const { me, logout } = useAuth();
  const [check, setCheck] = useState<{ ok: boolean; ms: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const test = async () => {
    setChecking(true);
    const t0 = performance.now();
    try {
      await admin.me();
      setCheck({ ok: true, ms: Math.round(performance.now() - t0) });
    } catch {
      setCheck({ ok: false, ms: Math.round(performance.now() - t0) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rise">
      <PageHeader title="Settings" description="Your account, appearance and API connection." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your account" />
          <div className="flex items-center gap-4">
            <Avatar name={me?.name || me?.email || 'Admin'} size={56} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-ink">{me?.name || 'Administrator'}</div>
              <div className="truncate text-sm text-ink-3">{me?.email}</div>
              <div className="mt-2 flex gap-2">
                <Badge tone="violet">{me?.isSuperAdmin ? 'Super admin' : 'Administrator'}</Badge>
              </div>
            </div>
          </div>
          <dl className="mt-5 space-y-px overflow-hidden rounded-xl text-sm">
            <div className="flex justify-between bg-panel-2 px-4 py-2.5">
              <dt className="text-ink-3">Last sign-in</dt>
              <dd className="font-medium">{fmtDate(me?.lastLogin ?? null, true)}</dd>
            </div>
          </dl>
          <Button className="mt-5" variant="danger" icon={LogOut} onClick={logout}>
            Sign out
          </Button>
        </Card>

        <Card>
          <CardHeader title="Appearance" subtitle="Saved on this device." />
          <Segmented
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            value={dark ? 'dark' : 'light'}
            onChange={(v) => onSetDark(v === 'dark')}
          />
          <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
            {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {dark ? 'Dark theme is on.' : 'Light theme is on.'}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="API connection"
            subtitle="Where this console reads and writes data."
            action={
              <Button icon={Server} loading={checking} onClick={test}>
                Test connection
              </Button>
            }
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone="neutral">{API_LABEL}</Badge>
            {check &&
              (check.ok ? (
                <span className="flex items-center gap-1.5 font-medium text-ok">
                  <CheckCircle2 className="size-4" /> Connected · {check.ms} ms
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-bad">
                  <XCircle className="size-4" /> Could not reach the API
                </span>
              ))}
          </div>
          <p className="mt-4 text-[13px] text-ink-3">
            Sessions last only while this tab is open. Every administrative change is written to the audit log
            under Compliance.
          </p>
        </Card>
      </div>
    </div>
  );
}
