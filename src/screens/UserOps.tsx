import { useState } from 'react';
import { BellRing, Gift, Send } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtDate } from '../lib/format';
import type { UserDetail } from '../lib/types';
import { Badge, Button, Field, Input, Textarea } from '../ui/kit';
import { Modal, useToast } from '../ui/overlay';

const DAY = 864e5;
const DURATIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No end date', days: 0 },
];

/** Free premium for a person, kept apart from their Stripe subscription. */
export function ComplimentaryAccess({
  user,
  canManage,
  onChanged,
}: {
  user: UserDetail;
  canManage: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const c = user.complimentary;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const run = async (enabled: boolean) => {
    setBusy(true);
    try {
      await admin.setComplimentary(user.id, {
        enabled,
        reason: enabled ? reason.trim() : undefined,
        expiresAt: enabled && days > 0 ? new Date(Date.now() + days * DAY).toISOString() : null,
      });
      toast.success(enabled ? 'Free access granted' : 'Free access removed', user.email);
      setOpen(false);
      setReason('');
      onChanged();
    } catch (err) {
      toast.error('Could not update access', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-3">Free access</h4>
      <div className="rounded-xl bg-panel-2 p-4 hairline">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
            <Gift className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            {c.active ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Complimentary premium</span>
                  <Badge tone="ok" dot>Active</Badge>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {c.expiresAt ? `Until ${fmtDate(c.expiresAt)}` : 'No end date'}
                  {c.reason ? ` · ${c.reason}` : ''}
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-ink">No free access</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Give this person premium without a payment: partners, press, support gestures or review accounts.
                </p>
              </>
            )}
            {canManage && (
              <Button
                className="mt-3"
                size="sm"
                variant={c.active ? 'danger' : 'secondary'}
                loading={busy && c.active}
                onClick={() => (c.active ? run(false) : setOpen(true))}
              >
                {c.active ? 'Remove free access' : 'Grant free access'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Grant free premium access"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={reason.trim().length < 3} onClick={() => run(true)}>
              Grant access
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            {user.name} will be able to use every paid feature. Their billing is not touched, and you can remove
            this at any time.
          </p>
          <Field label="Reason (saved in the audit log)">
            <Input value={reason} maxLength={200} placeholder="e.g. Partner clinic pilot"
              onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field label="For how long">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDays(d.days)}
                  className={`h-9 rounded-xl px-3.5 text-sm font-medium transition ${
                    days === d.days ? 'bg-brand text-white' : 'bg-panel text-ink-2 hairline hover:bg-panel-2'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </section>
  );
}

/** One-off push message to a single user. */
export function SendMessage({ user }: { user: UserDetail }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await admin.notifyUser(user.id, { title: title.trim(), body: body.trim() });
      toast.success('Notification sent', user.email);
      setOpen(false);
      setTitle('');
      setBody('');
    } catch (err) {
      toast.error('Could not send', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button icon={BellRing} className="w-full" onClick={() => setOpen(true)} disabled={!user.pushReachable}
        title={user.pushReachable ? undefined : 'This user has no device registered for notifications'}>
        {user.pushReachable ? 'Send a notification' : 'No device registered for notifications'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${user.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon={Send} loading={busy}
              disabled={title.trim().length < 2 || body.trim().length < 2} onClick={send}>
              Send
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <Input value={title} maxLength={65} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Message">
            <Textarea value={body} maxLength={240} rows={3} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
