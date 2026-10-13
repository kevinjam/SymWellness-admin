import { useState } from 'react';
import { Construction, Lock, Power } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { admin } from '../lib/endpoints';
import { fmtRelative } from '../lib/format';
import type { AppControls, FeatureSwitch } from '../lib/types';
import { useResource } from '../lib/useResource';
import { Badge, Button, Card, CardHeader, ErrorState, Field, PageHeader, Skeleton, Textarea, Toggle, cn } from '../ui/kit';
import { Modal, useToast } from '../ui/overlay';

const MAINT_DEFAULT = 'SymWellness is undergoing maintenance. Please try again in a few minutes.';

export function Controls() {
  const { me } = useAuth();
  const canEdit = Boolean(me?.isSuperAdmin);
  const { data, error, loading, reload } = useResource((s) => admin.controls(s), []);

  return (
    <div className="rise">
      <PageHeader
        title="App controls"
        description="Switch features off or put the app into maintenance without shipping a release."
        actions={
          data?.updatedAt ? <span className="text-[13px] text-ink-3">Last changed {fmtRelative(data.updatedAt)}</span> : null
        }
      />

      {!canEdit && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-panel-2 px-4 py-3 text-sm text-ink-2 hairline">
          <Lock className="size-4 shrink-0 text-ink-3" />
          Only super admins can change these switches. You can see their current state.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-6">
          <Maintenance controls={data} canEdit={canEdit} onSaved={reload} />
          <Features controls={data} canEdit={canEdit} onSaved={reload} />
        </div>
      ) : null}
    </div>
  );
}

function Maintenance({ controls, canEdit, onSaved }: { controls: AppControls; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const on = controls.maintenance.enabled;
  const [message, setMessage] = useState(controls.maintenance.message);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = async (enabled: boolean) => {
    setBusy(true);
    try {
      await admin.saveControls({ maintenance: { enabled, message } });
      toast.success(enabled ? 'Maintenance mode is on' : 'App is back online');
      setConfirm(false);
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn(on && 'ring-1 ring-warn/50')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', on ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}>
            {on ? <Construction className="size-5" /> : <Power className="size-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-ink">Maintenance mode</h3>
              {on ? <Badge tone="warn" dot>Active</Badge> : <Badge tone="ok" dot>App is live</Badge>}
            </div>
            <p className="mt-1 max-w-xl text-[13px] text-ink-3">
              While on, every app request returns a friendly “try again soon” message. Sign-in, payments and this
              console keep working so you can switch it off again.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant={on ? 'primary' : 'secondary'}
            loading={busy && on}
            onClick={() => (on ? apply(false) : setConfirm(true))}
          >
            {on ? 'Bring app back online' : 'Turn on maintenance'}
          </Button>
        )}
      </div>

      <div className="mt-5 max-w-xl">
        <Field label="Message shown to users" hint="Leave blank to use the default message.">
          <Textarea
            value={message}
            maxLength={240}
            rows={2}
            placeholder={MAINT_DEFAULT}
            disabled={!canEdit}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => {
              if (canEdit && on && message !== controls.maintenance.message) void apply(true);
            }}
          />
        </Field>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Turn on maintenance mode?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={() => apply(true)}>Turn on now</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Everyone using the app will immediately see the maintenance message and nothing will load until you turn
          it off. Use this for urgent fixes only.
        </p>
      </Modal>
    </Card>
  );
}

function Features({ controls, canEdit, onSaved }: { controls: AppControls; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [target, setTarget] = useState<FeatureSwitch | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (f: FeatureSwitch, enabled: boolean, note: string) => {
    setBusy(f.key);
    try {
      await admin.saveControls({ features: { [f.key]: { enabled, message: note } } });
      toast.success(enabled ? `${f.label} is back on` : `${f.label} switched off`);
      setTarget(null);
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const off = controls.features.filter((f) => !f.enabled).length;

  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <CardHeader
          title="Feature switches"
          subtitle="Turn a feature off for everyone, for example if it is misbehaving or costing too much."
          action={off > 0 ? <Badge tone="warn" dot>{off} off</Badge> : <Badge tone="ok" dot>All on</Badge>}
        />
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {controls.features.map((f) => (
          <li key={f.key} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{f.label}</span>
                <Badge tone={f.paid ? 'violet' : 'info'}>{f.paid ? 'Paid' : 'Free'}</Badge>
                {!f.enabled && <Badge tone="bad" dot>Off</Badge>}
              </div>
              <p className="mt-0.5 text-[13px] text-ink-3">{f.note}</p>
              {!f.enabled && f.message && <p className="mt-1 text-[13px] text-ink-2">Shown to users: “{f.message}”</p>}
            </div>
            <Toggle
              label={`${f.label} enabled`}
              checked={f.enabled}
              disabled={!canEdit || busy === f.key}
              onChange={(v) => {
                if (v) void save(f, true, '');
                else {
                  setMessage(f.message);
                  setTarget(f);
                }
              }}
            />
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Switch off ${target.label}?` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={Boolean(busy)}>Cancel</Button>
            <Button variant="danger" loading={Boolean(busy)} onClick={() => target && save(target, false, message)}>
              Switch off
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-2">
          Nobody will be able to use this feature, including paying subscribers, until you switch it back on.
        </p>
        <Field label="Message shown to users (optional)">
          <Textarea
            rows={2}
            maxLength={240}
            value={message}
            placeholder="This feature is temporarily unavailable. Please try again later."
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
      </Modal>
    </Card>
  );
}
