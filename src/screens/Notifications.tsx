import { useEffect, useState } from 'react';
import { BellRing, Lock, Send, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { admin } from '../lib/endpoints';
import { fmtNumber, fmtRelative } from '../lib/format';
import type { Campaign } from '../lib/types';
import { useResource } from '../lib/useResource';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select,
  TableSkeleton, Td, Textarea, Th, cn, type Tone,
} from '../ui/kit';
import { ConfirmDialog, useToast } from '../ui/overlay';

const TITLE_MAX = 65;
const BODY_MAX = 240;

const STATUS: Record<Campaign['status'], { tone: Tone; label: string }> = {
  sending: { tone: 'info', label: 'Sending' },
  sent: { tone: 'ok', label: 'Delivered' },
  partial: { tone: 'warn', label: 'Partly delivered' },
  failed: { tone: 'bad', label: 'Failed' },
};

export function Notifications() {
  const { me } = useAuth();
  const canSend = Boolean(me?.isSuperAdmin);
  const [page, setPage] = useState(1);
  const list = useResource((s) => admin.campaigns({ page, limit: 10 }, s), [page]);

  // Keep the history fresh while a broadcast is going out.
  const sending = list.data?.campaigns.some((c) => c.status === 'sending');
  useEffect(() => {
    if (!sending) return;
    const t = window.setInterval(list.reload, 4000);
    return () => window.clearInterval(t);
  }, [sending, list.reload]);

  return (
    <div className="rise">
      <PageHeader title="Notifications" description="Send a push message to a group of users." />

      {list.data && !list.data.configured && (
        <div className="mb-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Push delivery is not configured on the server (Firebase credentials are missing), so messages cannot be sent.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Composer
          canSend={canSend}
          segments={list.data?.segments ?? []}
          configured={list.data?.configured ?? true}
          onSent={list.reload}
        />
        <Preview />
      </div>

      <Card padded={false} className="mt-6">
        <div className="p-5 pb-3">
          <CardHeader title="History" subtitle="Every broadcast and direct message sent from the console." />
        </div>
        {list.loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.campaigns.length === 0 ? (
          <EmptyState icon={BellRing} title="Nothing sent yet" body="Messages you send will be listed here with delivery results." />
        ) : (
          <>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr><Th>Message</Th><Th>Audience</Th><Th>Delivered</Th><Th>Status</Th><Th>Sent</Th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-panel-2/70">
                      <Td className="max-w-[360px]">
                        <div className="line-clamp-1 font-medium">{c.title}</div>
                        <div className="line-clamp-1 text-[13px] text-ink-3">{c.body}</div>
                      </Td>
                      <Td className="text-ink-2">
                        {c.kind === 'broadcast'
                          ? list.data?.segments.find((s) => s.key === c.segment)?.label ?? c.segment
                          : c.kind === 'test' ? 'Test to yourself' : 'One user'}
                      </Td>
                      <Td className="num">
                        {fmtNumber(c.sent)}<span className="text-ink-3"> / {fmtNumber(c.audienceCount)}</span>
                      </Td>
                      <Td>
                        <Badge tone={STATUS[c.status].tone} dot>{STATUS[c.status].label}</Badge>
                        {c.error && <div className="mt-1 max-w-[200px] truncate text-xs text-ink-3" title={c.error}>{c.error}</div>}
                      </Td>
                      <Td className="text-ink-2">
                        <div>{fmtRelative(c.createdAt)}</div>
                        <div className="text-xs text-ink-3">{c.createdByEmail}</div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data && (
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="messages" onChange={setPage} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

/** Shared with the composer so the preview mirrors what is typed. */
const draft = { title: '', body: '' };
const listeners = new Set<() => void>();
function setDraft(next: Partial<typeof draft>) {
  Object.assign(draft, next);
  listeners.forEach((l) => l());
}
function useDraft() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return draft;
}

function Composer({
  canSend, segments, configured, onSent,
}: { canSend: boolean; segments: Array<{ key: string; label: string; hint: string }>; configured: boolean; onSent: () => void }) {
  const toast = useToast();
  const d = useDraft();
  const [segment, setSegment] = useState('all');
  const [count, setCount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const { me } = useAuth();

  useEffect(() => {
    const ctrl = new AbortController();
    setCount(null);
    admin.audience(segment, ctrl.signal).then((r) => setCount(r.count)).catch(() => undefined);
    return () => ctrl.abort();
  }, [segment]);

  const valid = d.title.trim().length >= 2 && d.body.trim().length >= 2;
  const hint = segments.find((s) => s.key === segment)?.hint;

  const send = async () => {
    setBusy(true);
    try {
      const r = await admin.broadcast({ segment, title: d.title.trim(), body: d.body.trim() });
      toast.success('Sending', `Delivering to ${fmtNumber(r.audienceCount)} devices`);
      setConfirm(false);
      setDraft({ title: '', body: '' });
      onSent();
    } catch (err) {
      toast.error('Could not send', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!me) return;
    setTesting(true);
    try {
      await admin.notifyUser(me.id, { title: d.title.trim(), body: d.body.trim() });
      toast.success('Test sent', 'Check the device you are signed in to the app on');
      onSent();
    } catch (err) {
      toast.error('Could not send test', (err as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Compose" subtitle="Keep it short and useful. Users can turn notifications off, so avoid noise." />
      {!canSend && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-panel-2 px-3.5 py-2.5 text-[13px] text-ink-2 hairline">
          <Lock className="size-4 shrink-0 text-ink-3" /> Only super admins can send notifications.
        </div>
      )}
      <div className="space-y-4">
        <Field label="Audience" hint={hint}>
          <Select value={segment} onChange={(e) => setSegment(e.target.value)} disabled={!canSend}>
            {(segments.length ? segments : [{ key: 'all', label: 'Everyone', hint: '' }]).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <UsersIcon className="size-4" />
          {count === null ? 'Counting devices…' : <span><b className="num text-ink">{fmtNumber(count)}</b> devices will receive this</span>}
        </div>
        <Field label="Title">
          <Input value={d.title} maxLength={TITLE_MAX} disabled={!canSend} placeholder="New: smarter meal plans"
            onChange={(e) => setDraft({ title: e.target.value })} />
          <Counter value={d.title.length} max={TITLE_MAX} />
        </Field>
        <Field label="Message">
          <Textarea value={d.body} maxLength={BODY_MAX} rows={3} disabled={!canSend}
            placeholder="Tell people what is new and why it helps."
            onChange={(e) => setDraft({ body: e.target.value })} />
          <Counter value={d.body.length} max={BODY_MAX} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button icon={Send} variant="secondary" loading={testing} disabled={!canSend || !valid || !configured}
            onClick={sendTest}>
            Send test to me
          </Button>
          <Button variant="primary" disabled={!canSend || !valid || !configured || !count}
            onClick={() => setConfirm(true)}>
            Send to {count === null ? '…' : fmtNumber(count)} devices
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        busy={busy}
        title="Send this notification?"
        confirmLabel="Send now"
        onConfirm={send}
        onClose={() => setConfirm(false)}
        body={
          <>
            It will go to <b>{fmtNumber(count ?? 0)}</b> devices straight away and cannot be recalled. Sending a
            test to yourself first is a good idea.
          </>
        }
      />
    </Card>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn('mt-1 block text-right text-xs', value > max * 0.9 ? 'text-warn' : 'text-ink-3')}>
      {value}/{max}
    </span>
  );
}

function Preview() {
  const d = useDraft();
  return (
    <Card className="h-fit">
      <CardHeader title="Preview" subtitle="How it looks on a phone lock screen." />
      <div className="rounded-2xl bg-gradient-to-b from-[#1b2547] to-[#0d1330] p-5">
        <div className="mx-auto max-w-[300px] rounded-2xl bg-white/85 p-3.5 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[#555]">
            <span className="grid size-5 place-items-center rounded-md bg-brand text-[10px] font-bold text-white">S</span>
            SymWellness <span className="ml-auto normal-case text-[#777]">now</span>
          </div>
          <div className="mt-2 text-[14px] font-semibold leading-snug text-[#111]">
            {d.title || 'Your title appears here'}
          </div>
          <div className="mt-0.5 text-[13px] leading-snug text-[#333]">
            {d.body || 'Your message appears here.'}
          </div>
        </div>
      </div>
    </Card>
  );
}
