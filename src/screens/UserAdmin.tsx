import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, ShieldAlert } from 'lucide-react';
import { admin } from '../lib/endpoints';
import type { AdminRole, CreatedUser, UserDetail } from '../lib/types';
import { useResource } from '../lib/useResource';
import { Button, Field, Input, Select, Skeleton, ErrorState, cn } from '../ui/kit';
import { Modal, useToast } from '../ui/overlay';

/* -------------------------------------------------- One-time password reveal */

export function TempPasswordDialog({
  open,
  who,
  password,
  onClose,
}: {
  open: boolean;
  who: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Temporary password"
      footer={
        <Button variant="primary" onClick={onClose}>
          I've saved it
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-2">
          Share this with <span className="font-medium text-ink">{who}</span> through a secure channel. It is
          shown <strong>only once</strong> and cannot be retrieved later.
        </p>
        <div className="flex items-center gap-2 rounded-xl bg-panel-2 p-3 hairline">
          <code className="num min-w-0 flex-1 select-all break-all text-[15px] font-semibold text-ink">
            {password}
          </code>
          <Button
            size="sm"
            icon={copied ? Check : Copy}
            onClick={async () => {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------- Create / edit user */

interface FormProps {
  open: boolean;
  /** When set, the form edits this user; otherwise it creates one. */
  user?: UserDetail | null;
  /** The signed-in admin editing themselves cannot change role/email. */
  isSelf?: boolean;
  onClose: () => void;
  onSaved: (result?: CreatedUser) => void;
}

const ROLE_HINT: Record<AdminRole, string> = {
  patient: 'A regular app user.',
  doctor: 'A clinician account.',
  admin: 'Can sign in to this console. Cannot create, edit or delete users.',
};

export function UserFormModal({ open, user, isSelf, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const editing = Boolean(user);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', role: 'patient' as AdminRole, password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (user) {
      const [first = '', ...rest] = user.name.split(' ');
      setForm({
        firstName: first,
        lastName: rest.join(' '),
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        role: user.role,
        password: '',
      });
    } else {
      setForm({ firstName: '', lastName: '', email: '', phoneNumber: '', role: 'patient', password: '' });
    }
  }, [open, user]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (editing && user) {
        const body: Record<string, string> = {
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
        };
        if (!isSelf) {
          body.email = form.email;
          if (form.role !== user.role) body.role = form.role;
        }
        await admin.updateUser(user.id, body);
        toast.success('User updated');
        onSaved();
      } else {
        const created = await admin.createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phoneNumber: form.phoneNumber || undefined,
          role: form.role,
          password: form.password || undefined,
        });
        toast.success('User created', created.email);
        onSaved(created);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const valid = form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email);

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={editing ? 'Edit user' : 'Add user'}
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!valid} onClick={submit}>
            {editing ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input value={form.firstName} onChange={set('firstName')} autoFocus />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={set('lastName')} />
          </Field>
        </div>
        <Field label="Email" hint={isSelf ? 'You cannot change your own email here.' : undefined}>
          <Input type="email" value={form.email} onChange={set('email')} disabled={isSelf} />
        </Field>
        <Field label="Phone (optional)">
          <Input value={form.phoneNumber} onChange={set('phoneNumber')} />
        </Field>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : ROLE_HINT[form.role]}>
          <Select value={form.role} onChange={set('role')} disabled={isSelf}>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        {!editing && (
          <Field
            label="Password (optional)"
            hint={`Leave blank to generate a temporary password. Minimum ${form.role === 'admin' ? 12 : 8} characters.`}
          >
            <Input type="text" autoComplete="off" value={form.password} onChange={set('password')} />
          </Field>
        )}
        {editing && user && form.role !== user.role && !isSelf && (
          <p className="flex gap-2 rounded-xl bg-warn-soft p-3 text-[13px] font-medium text-warn">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Changing the role signs this user out of all devices.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- Reset password */

export function ResetPasswordModal({
  open,
  user,
  onClose,
  onDone,
}: {
  open: boolean;
  user: UserDetail;
  onClose: () => void;
  onDone: (temporaryPassword: string | null) => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
    }
  }, [open]);

  const min = user.role === 'admin' ? 12 : 8;
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await admin.resetPassword(user.id, password || undefined);
      toast.success('Password reset', 'They have been signed out everywhere.');
      onDone(r.temporaryPassword);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Reset password"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" icon={KeyRound} loading={busy} onClick={submit}>
            Reset password
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-2">
          Set a new password for <span className="font-medium text-ink">{user.name}</span>. They will be signed out
          of every device.
        </p>
        <Field label="New password (optional)" hint={`Leave blank to generate one. Minimum ${min} characters.`}>
          <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- Delete user */

export function DeleteUserDialog({
  open,
  user,
  onClose,
  onDeleted,
}: {
  open: boolean;
  user: UserDetail;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const preview = useResource((s) => (open ? admin.deletePreview(user.id, s) : Promise.resolve(undefined)), [open, user.id]);
  const [typed, setTyped] = useState('');
  const [cancelSub, setCancelSub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTyped('');
      setCancelSub(false);
      setError('');
    }
  }, [open]);

  const p = preview.data;
  const expected = (p?.email || user.id).trim().toLowerCase();
  const confirmed = typed.trim().toLowerCase() === expected;
  const needsCancel = Boolean(p?.activeSubscription);
  const canDelete = Boolean(p?.deletable) && confirmed && (!needsCancel || cancelSub);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await admin.deleteUser(user.id, typed.trim(), cancelSub);
      toast.success('User deleted', `${user.name} and their data were removed.`);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Delete user permanently"
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} disabled={!canDelete} onClick={submit}>
            Delete forever
          </Button>
        </>
      }
    >
      {preview.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : preview.error && !p ? (
        <ErrorState error={preview.error} onRetry={preview.reload} />
      ) : p ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-bad-soft p-3.5 text-bad">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" />
            <p className="text-[13px] font-medium">
              This permanently deletes <strong>{p.name}</strong> and everything below. It cannot be undone.
            </p>
          </div>

          {p.blockedReason ? (
            <p className="rounded-xl bg-panel-2 p-3.5 text-sm text-ink-2">{p.blockedReason}</p>
          ) : (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">
                  Will be deleted ({p.total} records)
                </h4>
                {p.items.length === 0 ? (
                  <p className="text-sm text-ink-3">The account only, with no other data.</p>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-xl hairline">
                    {p.items.map((i) => (
                      <li key={i.key} className="flex items-center justify-between bg-panel px-3.5 py-2 text-sm">
                        <span className="text-ink-2">{i.label}</span>
                        <span className="num font-semibold text-ink">{i.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {needsCancel && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-warn-soft p-3.5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--brand)]"
                    checked={cancelSub}
                    onChange={(e) => setCancelSub(e.target.checked)}
                  />
                  <span className="text-[13px] font-medium text-warn">
                    This user has an active subscription. Cancel it immediately in Stripe as part of the deletion.
                  </span>
                </label>
              )}

              <Field label={`Type ${p.email || 'the user id'} to confirm`}>
                <Input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={p.email || user.id}
                  autoComplete="off"
                  className={cn(confirmed && 'shadow-[0_0_0_2px_var(--ok)]')}
                />
              </Field>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
              {error}
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
