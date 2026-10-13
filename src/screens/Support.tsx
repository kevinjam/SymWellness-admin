import { useState } from 'react';
import { Bug, Inbox, MessageCircle, Send } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtDate, fmtRelative, titleCase } from '../lib/format';
import type { BugReport, SupportMessage } from '../lib/types';
import { useResource } from '../lib/useResource';
import { Avatar, Button, Card, EmptyState, ErrorState, Field, PageHeader, Pagination, Segmented, Select, TableSkeleton, Td, Textarea, Th } from '../ui/kit';
import { Drawer, useToast } from '../ui/overlay';
import { PriorityBadge, TicketStatusBadge } from '../ui/status';

type Kind = 'messages' | 'bugs';
type Item = (SupportMessage | BugReport) & { __kind: Kind };

function personOf(item: SupportMessage | BugReport) {
  if ('userId' in item && item.userId && typeof item.userId === 'object') {
    const u = item.userId;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return { name: name || item.userFullName || item.userEmail || 'Unknown', email: u.email || item.userEmail || '' };
  }
  return { name: item.userFullName || item.userEmail || 'Unknown', email: item.userEmail || '' };
}

export function Support() {
  const [kind, setKind] = useState<Kind>('messages');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Item | null>(null);

  const messages = useResource(
    (s) => (kind === 'messages' ? admin.supportMessages({ status, page, limit: 15 }, s) : Promise.resolve(undefined)),
    [kind, status, page]
  );
  const bugs = useResource(
    (s) => (kind === 'bugs' ? admin.bugReports({ status, page, limit: 15 }, s) : Promise.resolve(undefined)),
    [kind, status, page]
  );
  const active = kind === 'messages' ? messages : bugs;
  const rows: Item[] =
    kind === 'messages'
      ? (messages.data?.messages ?? []).map((m) => ({ ...m, __kind: 'messages' as const }))
      : (bugs.data?.reports ?? []).map((b) => ({ ...b, __kind: 'bugs' as const }));
  const total = kind === 'messages' ? messages.data?.total : bugs.data?.total;
  const pages = (kind === 'messages' ? messages.data?.pages : bugs.data?.pages) ?? 1;

  const reloadAll = () => active.reload();

  return (
    <div className="rise">
      <PageHeader title="Support inbox" description="Messages and bug reports from the app." />

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented
            options={[
              { label: 'Messages', value: 'messages' as Kind },
              { label: 'Bug reports', value: 'bugs' as Kind },
            ]}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setStatus('');
              setPage(1);
            }}
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44" aria-label="Status">
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {active.loading ? (
          <TableSkeleton rows={7} cols={5} />
        ) : active.error && !active.data ? (
          <ErrorState error={active.error} onRetry={active.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={kind === 'messages' ? Inbox : Bug}
            title="Inbox zero"
            body={kind === 'messages' ? 'No support messages match this filter.' : 'No bug reports match this filter.'}
          />
        ) : (
          <>
            <div className={`overflow-x-auto ${active.refreshing ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr>
                    <Th>From</Th>
                    <Th>Subject</Th>
                    <Th>Category</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>Received</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => {
                    const who = personOf(r);
                    const subject = 'subject' in r ? r.subject : (r as BugReport).title || 'Bug report';
                    return (
                      <tr
                        key={r._id}
                        tabIndex={0}
                        onClick={() => setOpen(r)}
                        onKeyDown={(e) => e.key === 'Enter' && setOpen(r)}
                        className="cursor-pointer transition-colors hover:bg-panel-2/70"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={who.name} size={32} />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{who.name}</div>
                              <div className="truncate text-[13px] text-ink-3">{who.email}</div>
                            </div>
                          </div>
                        </Td>
                        <Td className="max-w-[280px]"><span className="line-clamp-1">{subject}</span></Td>
                        <Td className="text-ink-2">{titleCase(r.category)}</Td>
                        <Td><PriorityBadge priority={r.priority} /></Td>
                        <Td><TicketStatusBadge status={r.status} /></Td>
                        <Td className="text-ink-2">{fmtRelative(r.createdAt)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total ?? 0} noun={kind === 'messages' ? 'messages' : 'reports'} onChange={setPage} />
          </>
        )}
      </Card>

      <TicketDrawer
        item={open}
        onClose={() => setOpen(null)}
        onSaved={() => {
          setOpen(null);
          reloadAll();
        }}
      />
    </div>
  );
}

function TicketDrawer({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  // Reset the form when a different ticket is opened.
  if (item && item._id !== lastId) {
    setLastId(item._id);
    setStatus(item.status);
    setResponse(item.adminResponse ?? '');
  }
  if (!item && lastId) setLastId(null);

  const save = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const body = { status, ...(response.trim() ? { adminResponse: response.trim() } : {}) };
      if (item.__kind === 'messages') await admin.updateSupportMessage(item._id, body);
      else await admin.updateBugReport(item._id, body);
      toast.success('Ticket updated');
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const who = item ? personOf(item) : null;
  const subject = item ? ('subject' in item ? item.subject : (item as BugReport).title || 'Bug report') : '';
  const body = item ? ('message' in item ? item.message : (item as BugReport).description) : '';
  const bug = item && item.__kind === 'bugs' ? (item as BugReport) : null;

  return (
    <Drawer open={Boolean(item)} onClose={onClose} title={subject || 'Ticket'}>
      {item && who && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Avatar name={who.name} size={44} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{who.name}</div>
              <div className="truncate text-[13px] text-ink-3">{who.email}</div>
            </div>
            <div className="ml-auto text-right text-xs text-ink-3">{fmtDate(item.createdAt, true)}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TicketStatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </div>

          <div className="rounded-2xl bg-panel-2 p-4 hairline">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-3">
              <MessageCircle className="size-3.5" /> Message
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{body || 'No message body.'}</p>
          </div>

          {bug && (bug.stepsToReproduce || bug.expectedBehavior || bug.actualBehavior) && (
            <div className="space-y-3 text-sm">
              {[
                ['Steps to reproduce', bug.stepsToReproduce],
                ['Expected', bug.expectedBehavior],
                ['Actual', bug.actualBehavior],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string}>
                    <div className="text-xs font-medium uppercase tracking-wide text-ink-3">{k}</div>
                    <p className="mt-1 whitespace-pre-wrap text-ink-2">{v}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="space-y-4 border-t border-line pt-5">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Reply to the user" hint="Shown to the user in the app once saved.">
              <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write a response…" />
            </Field>
            <Button variant="primary" icon={Send} loading={busy} onClick={save} className="w-full">
              Save changes
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
