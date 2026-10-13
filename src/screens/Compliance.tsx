import { useState } from 'react';
import { CheckCircle2, Clock, History, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtDate, fmtRelative, titleCase } from '../lib/format';
import type { DeletionRequest } from '../lib/types';
import { useResource } from '../lib/useResource';
import { Badge, Button, Card, EmptyState, ErrorState, Field, PageHeader, Pagination, Segmented, TableSkeleton, Td, Textarea, Th } from '../ui/kit';
import { ConfirmDialog, useToast } from '../ui/overlay';
import { TicketStatusBadge } from '../ui/status';

const SLA_DAYS = 30;

type View = 'deletions' | 'audit';

export function Compliance() {
  const [view, setView] = useState<View>('deletions');
  return (
    <div className="rise">
      <PageHeader
        title="Compliance"
        description="Account-deletion requests and a record of every admin action."
        actions={
          <Segmented
            options={[
              { label: 'Deletion requests', value: 'deletions' as View },
              { label: 'Audit log', value: 'audit' as View },
            ]}
            value={view}
            onChange={setView}
          />
        }
      />
      {view === 'deletions' ? <Deletions /> : <AuditLog />}
    </div>
  );
}

function daysLeft(requestedAt: string) {
  const due = new Date(requestedAt).getTime() + SLA_DAYS * 86_400_000;
  return Math.ceil((due - Date.now()) / 86_400_000);
}

function Deletions() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const list = useResource((s) => admin.deletionRequests({ status, page, limit: 15 }, s), [status, page]);
  const [target, setTarget] = useState<{ req: DeletionRequest; next: 'processing' | 'completed' | 'cancelled' } | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await admin.updateDeletionRequest(target.req.id, target.next, notes.trim() || undefined);
      toast.success('Request updated', `${target.req.email || 'Request'} marked ${target.next}.`);
      setTarget(null);
      setNotes('');
      list.reload();
    } catch (err) {
      toast.error('Could not update request', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Processing', value: 'processing' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
          <p className="text-[13px] text-ink-3">Complete within {SLA_DAYS} days of the request.</p>
        </div>

        {list.loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.requests.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nothing waiting" body={`No ${status} deletion requests.`} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr>
                    <Th>Requester</Th>
                    <Th>Requested</Th>
                    <Th>Deadline</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.requests.map((r) => {
                    const left = daysLeft(r.requestedAt);
                    const open = r.status === 'pending' || r.status === 'processing';
                    return (
                      <tr key={r.id} className="hover:bg-panel-2/70">
                        <Td>
                          <div className="font-medium">{r.name || r.email || 'Unknown'}</div>
                          <div className="text-[13px] text-ink-3">{r.email}</div>
                        </Td>
                        <Td className="text-ink-2">
                          {fmtDate(r.requestedAt)}
                          <div className="text-xs text-ink-3">{titleCase(r.source)}</div>
                        </Td>
                        <Td>
                          {open ? (
                            <Badge tone={left < 0 ? 'bad' : left <= 7 ? 'warn' : 'neutral'}>
                              <Clock className="size-3" />
                              {left < 0 ? `${Math.abs(left)}d overdue` : `${left}d left`}
                            </Badge>
                          ) : (
                            <span className="text-ink-3">{r.completedAt ? fmtDate(r.completedAt) : '–'}</span>
                          )}
                        </Td>
                        <Td><TicketStatusBadge status={r.status} /></Td>
                        <Td className="text-right">
                          {open ? (
                            <div className="flex justify-end gap-2">
                              {r.status === 'pending' && (
                                <Button size="sm" onClick={() => setTarget({ req: r, next: 'processing' })}>
                                  Start
                                </Button>
                              )}
                              <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => setTarget({ req: r, next: 'completed' })}>
                                Complete
                              </Button>
                              <Button size="sm" variant="ghost" icon={XCircle} onClick={() => setTarget({ req: r, next: 'cancelled' })}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span className="text-ink-3">–</span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {list.data && (
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="requests" onChange={setPage} />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(target)}
        busy={busy}
        danger={target?.next === 'cancelled'}
        title={
          target?.next === 'completed'
            ? 'Mark deletion as completed?'
            : target?.next === 'processing'
              ? 'Start processing?'
              : 'Cancel this request?'
        }
        confirmLabel={target ? titleCase(target.next === 'processing' ? 'Start' : target.next) : 'Confirm'}
        onClose={() => setTarget(null)}
        onConfirm={apply}
        body={
          <div className="space-y-3">
            {target?.next === 'completed' && (
              <p className="flex gap-2 rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
                <Trash2 className="mt-0.5 size-4 shrink-0" />
                This records the request as done. Delete the user's data from the database and
                connected services first. The console does not erase data for you.
              </p>
            )}
            <Field label="Notes (saved with the request)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="What was done, and when." />
            </Field>
          </div>
        }
      />
    </>
  );
}

function AuditLog() {
  const [page, setPage] = useState(1);
  const list = useResource((s) => admin.auditLogs({ page, limit: 20 }, s), [page]);

  return (
    <Card padded={false}>
      {list.loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.data && list.data.logs.length === 0 ? (
        <EmptyState icon={History} title="No admin activity yet" body="Actions taken in this console are recorded here." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-line bg-panel-2/60">
                <tr>
                  <Th>When</Th>
                  <Th>Admin</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data?.logs.map((l) => (
                  <tr key={l.id} className="hover:bg-panel-2/70">
                    <Td className="num whitespace-nowrap text-ink-2">{fmtDate(l.createdAt, true)}</Td>
                    <Td>{l.adminEmail || 'Unknown'}</Td>
                    <Td><Badge tone="brand">{l.action}</Badge></Td>
                    <Td className="text-ink-2">
                      {titleCase(l.targetType || '–')}
                      {l.targetId && <span className="num ml-1.5 text-xs text-ink-3">{l.targetId.slice(-8)}</span>}
                      {l.meta && typeof l.meta.reason === 'string' && l.meta.reason && (
                        <div className="text-xs text-ink-3">“{l.meta.reason}”</div>
                      )}
                    </Td>
                    <Td className="num text-ink-3">{l.ipAddress || '–'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data && (
            <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="events" onChange={setPage} />
          )}
        </>
      )}
      <span className="sr-only">{fmtRelative(new Date().toISOString())}</span>
    </Card>
  );
}
