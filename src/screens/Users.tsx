import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, CreditCard, KeyRound, MailCheck, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Users as UsersIcon } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtDate, fmtNumber, fmtRelative, titleCase } from '../lib/format';
import type { AdminUser, CreatedUser } from '../lib/types';
import { useDebounced, useResource } from '../lib/useResource';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Pagination, PageHeader, SearchInput, Select, Skeleton, TableSkeleton, Td, Textarea, Th } from '../ui/kit';
import { ConfirmDialog, Drawer, useToast } from '../ui/overlay';
import { PlanBadge, RoleBadge, SubStatusBadge } from '../ui/status';
import { BillingPanel } from './BillingPanel';
import { ComplimentaryAccess, SendMessage } from './UserOps';
import { DeleteUserDialog, ResetPasswordModal, TempPasswordDialog, UserFormModal } from './UserAdmin';
import { useAuth } from '../lib/auth';

export function Users({ userId, navigate }: { userId?: string; navigate: (path: string) => void }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 300);
  const { me } = useAuth();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  const list = useResource(
    (s) => admin.users({ search: q, role, status, page, limit: 15 }, s),
    [q, role, status, page]
  );

  return (
    <div className="rise">
      <PageHeader
        title="Users"
        description="Accounts, plans and access. Health records are never shown here."
        actions={
          me?.isSuperAdmin ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              Add user
            </Button>
          ) : undefined
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-[240px] flex-1">
            <SearchInput
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-40" aria-label="Role">
            <option value="">All roles</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="admin">Admins</option>
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40" aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>

        {list.loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users match" body="Try a different search or clear the filters." />
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${list.refreshing ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr>
                    <Th>User</Th>
                    <Th>Role</Th>
                    <Th>Plan</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th>Last active</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.users.map((u) => (
                    <tr
                      key={u.id}
                      tabIndex={0}
                      onClick={() => navigate(`users/${u.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`users/${u.id}`)}
                      className="cursor-pointer transition-colors hover:bg-panel-2/70 focus-visible:bg-panel-2"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{u.name}</div>
                            <div className="truncate text-[13px] text-ink-3">{u.email || 'No email'}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <RoleBadge role={u.role} />
                          {u.isSuperAdmin && <Badge tone="violet">Super</Badge>}
                        </div>
                      </Td>
                      <Td><PlanBadge plan={u.subscription.plan} /></Td>
                      <Td>
                        {u.isActive ? (
                          <Badge tone="ok" dot>Active</Badge>
                        ) : (
                          <Badge tone="bad" dot>Suspended</Badge>
                        )}
                      </Td>
                      <Td className="num text-ink-2">{fmtDate(u.createdAt)}</Td>
                      <Td className="text-ink-2">{fmtRelative(u.lastLogin)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data && (
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="users" onChange={setPage} />
            )}
          </>
        )}
      </Card>

      <UserDrawer
        id={userId}
        onClose={() => navigate('users')}
        onChanged={list.reload}
      />

      <UserFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(result) => {
          setCreating(false);
          list.reload();
          if (result?.temporaryPassword) setCreated(result);
        }}
      />
      <TempPasswordDialog
        open={Boolean(created)}
        who={created?.email ?? ''}
        password={created?.temporaryPassword ?? ''}
        onClose={() => setCreated(null)}
      />
    </div>
  );
}

function UserDrawer({ id, onClose, onChanged }: { id?: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const detail = useResource((s) => (id ? admin.user(id, s) : Promise.resolve(undefined)), [id]);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const { me } = useAuth();
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const u = detail.data;
  const canManage = Boolean(me?.isSuperAdmin);
  const isSelf = Boolean(u && me && u.id === me.id);
  // Other super admins are read-only here; you can still edit your own profile.
  const locked = Boolean(u?.isSuperAdmin && !isSelf);
  // Collapse billing when a different user is opened.
  useEffect(() => setShowBilling(false), [id]);

  const toggle = async (target: AdminUser) => {
    setBusy(true);
    try {
      await admin.setUserStatus(target.id, !target.isActive, reason);
      toast.success(target.isActive ? 'Account suspended' : 'Account reactivated', target.email);
      setConfirm(false);
      setReason('');
      detail.reload();
      onChanged();
    } catch (err) {
      toast.error('Could not update account', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={u?.name ?? 'User'}>
      {detail.loading || !id ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detail.error && !u ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : u ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} size={56} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-ink">{u.name}</div>
              <div className="truncate text-sm text-ink-3">{u.email || 'No email'}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RoleBadge role={u.role} />
                {u.isActive ? <Badge tone="ok" dot>Active</Badge> : <Badge tone="bad" dot>Suspended</Badge>}
                {u.emailVerified && <Badge tone="info"><MailCheck className="size-3" /> Verified</Badge>}
              </div>
            </div>
          </div>

          <Section title="Account">
            <Row label="Sign-in method" value={titleCase(u.provider)} />
            <Row label="Joined" value={fmtDate(u.createdAt, true)} />
            <Row label="Last active" value={u.lastLogin ? fmtDate(u.lastLogin, true) : 'Never'} />
            <Row label="Onboarding" value={u.onboardingCompleted ? 'Completed' : 'Not finished'} />
            <Row
              label="Terms"
              value={u.termsAccepted ? `Accepted${u.termsAcceptedVersion ? ` (v${u.termsAcceptedVersion})` : ''}` : 'Not accepted'}
            />
          </Section>

          <Section title="Subscription">
            <Row label="Plan" value={<PlanBadge plan={u.subscription.plan} />} />
            <Row label="Status" value={<SubStatusBadge status={u.subscription.status} />} />
            {u.subscription.hasPremium && (
              <Row
                label={u.subscription.willRenew ? 'Renews' : 'Ends'}
                value={fmtDate(u.subscription.expiresAt)}
              />
            )}
          </Section>

          {u.role !== 'admin' && (
            <ComplimentaryAccess
              user={u}
              canManage={canManage}
              onChanged={() => {
                detail.reload();
                onChanged();
              }}
            />
          )}

          {u.subscription.stripeCustomerId && (
            <section>
              {showBilling ? (
                <>
                  <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-3">Billing</h4>
                  <BillingPanel userId={u.id} />
                </>
              ) : (
                <Button className="w-full" icon={CreditCard} onClick={() => setShowBilling(true)}>
                  View billing details
                </Button>
              )}
            </section>
          )}

          <Section title="Activity" note="Counts only. Contents are never shown to admins.">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Medications', u.activity.medications],
                ['Symptoms', u.activity.symptoms],
                ['Thesis messages', u.activity.thesisMessages],
                ['Calorie scans', u.activity.calorieScans],
                ['Scans', u.activity.scans],
                ['Wellness notes', u.activity.reports],
              ].map(([label, n]) => (
                <div key={label as string} className="rounded-xl bg-panel-2 p-3 hairline">
                  <div className="num text-xl font-semibold text-ink">{fmtNumber(n as number)}</div>
                  <div className="text-xs text-ink-3">{label}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Support">
            <Row label="Messages sent" value={fmtNumber(u.support.messages)} />
            <Row label="Bug reports" value={fmtNumber(u.support.bugReports)} />
          </Section>

          {canManage && (
            <section>
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
                <ShieldCheck className="size-3.5" /> Manage account
              </h4>
              {locked ? (
                <p className="rounded-xl bg-panel-2 px-4 py-3 text-[13px] text-ink-3">
                  Super admin accounts can only be changed by their owner.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {u.role !== 'admin' && (
                    <div className="sm:col-span-2">
                      <SendMessage user={u} />
                    </div>
                  )}
                  <Button icon={Pencil} onClick={() => setEditing(true)}>
                    Edit details
                  </Button>
                  <Button icon={KeyRound} onClick={() => setResetting(true)} disabled={u.provider !== 'local'}
                    title={u.provider !== 'local' ? 'Signs in with ' + u.provider : undefined}>
                    Reset password
                  </Button>
                  {!isSelf && u.role !== 'admin' && (
                    <Button variant="danger" icon={Trash2} className="sm:col-span-2" onClick={() => setDeleting(true)}>
                      Delete user…
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}

          {u.role !== 'admin' && (
            <div className="rounded-2xl border border-line p-4">
              <div className="flex items-start gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${u.isActive ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>
                  {u.isActive ? <ShieldAlert className="size-4" /> : <CheckCircle2 className="size-4" />}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {u.isActive ? 'Suspend this account' : 'Reactivate this account'}
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {u.isActive
                      ? 'They will be signed out and unable to log in until reactivated.'
                      : 'They will be able to sign in again.'}
                  </p>
                  <Button
                    className="mt-3"
                    variant={u.isActive ? 'danger' : 'primary'}
                    size="sm"
                    icon={u.isActive ? Ban : CheckCircle2}
                    onClick={() => setConfirm(true)}
                  >
                    {u.isActive ? 'Suspend account' : 'Reactivate account'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {canManage && (
            <>
              <UserFormModal
                open={editing}
                user={u}
                isSelf={isSelf}
                onClose={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  detail.reload();
                  onChanged();
                }}
              />
              <ResetPasswordModal
                open={resetting}
                user={u}
                onClose={() => setResetting(false)}
                onDone={(pw) => {
                  setResetting(false);
                  if (pw) setTempPassword(pw);
                }}
              />
              <TempPasswordDialog
                open={Boolean(tempPassword)}
                who={u.name}
                password={tempPassword ?? ''}
                onClose={() => setTempPassword(null)}
              />
              <DeleteUserDialog
                open={deleting}
                user={u}
                onClose={() => setDeleting(false)}
                onDeleted={() => {
                  setDeleting(false);
                  onChanged();
                  onClose();
                }}
              />
            </>
          )}

          <ConfirmDialog
            open={confirm}
            danger={u.isActive}
            busy={busy}
            title={u.isActive ? 'Suspend account?' : 'Reactivate account?'}
            confirmLabel={u.isActive ? 'Suspend' : 'Reactivate'}
            onClose={() => setConfirm(false)}
            onConfirm={() => toggle(u)}
            body={
              <div className="space-y-3">
                <p>
                  {u.isActive
                    ? `${u.name} will lose access immediately.`
                    : `${u.name} will regain access.`}
                </p>
                <Field label="Reason (saved in the audit log)">
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Chargeback dispute, abuse report…" />
                </Field>
              </div>
            }
          />
        </div>
      ) : null}
    </Drawer>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-ink-3">{title}</h4>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </div>
      <div className="space-y-px overflow-hidden rounded-xl">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-panel-2 px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl">
      <span className="text-ink-3">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
