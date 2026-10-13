import { useState } from 'react';
import { BadgeDollarSign, ChevronRight, CreditCard, Hourglass, Wallet } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtCurrency, fmtDate, fmtNumber } from '../lib/format';
import { useResource } from '../lib/useResource';
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Segmented, TableSkeleton, Td, Th } from '../ui/kit';
import { Drawer } from '../ui/overlay';
import type { SubscriptionRow } from '../lib/types';
import { BillingPanel } from './BillingPanel';
import { StatCard } from '../ui/stat';
import { PlanBadge, SubStatusBadge } from '../ui/status';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Premium', value: 'premium' },
  { label: 'Active', value: 'active' },
  { label: 'Trial', value: 'trial' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Expired', value: 'expired' },
];

export function Subscriptions({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState<SubscriptionRow | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const overview = useResource((s) => admin.overview(s), []);
  const list = useResource((s) => admin.subscriptions({ status, page, limit: 15 }, s), [status, page]);
  const o = overview.data?.subscriptions;

  return (
    <div className="rise">
      <PageHeader title="Subscriptions" description="Plans, trials and recurring revenue from Stripe." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={fmtCurrency(o?.mrr, true)} icon={BadgeDollarSign} tone="ok" loading={overview.loading}
          hint={o ? `${fmtCurrency(o.arr, true)} / year` : undefined} />
        <StatCard label="Paying subscribers" value={fmtNumber(o?.paying)} icon={CreditCard} tone="brand" loading={overview.loading} />
        <StatCard label="On free trial" value={fmtNumber(o?.trialing)} icon={Hourglass} tone="warn" loading={overview.loading}
          hint="Convert at day 14" />
        <StatCard label="Conversion" value={o ? `${o.conversionPct}%` : '–'} icon={Wallet} tone="violet" loading={overview.loading}
          hint="Paying ÷ all users" />
      </div>

      <Card padded={false} className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented
            options={FILTERS}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </div>

        {list.loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.subscriptions.length === 0 ? (
          <EmptyState icon={CreditCard} title="No subscriptions here" body="Nothing matches this filter yet." />
        ) : (
          <>
            <div className={`overflow-x-auto ${list.refreshing ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr>
                    <Th>Customer</Th>
                    <Th>Plan</Th>
                    <Th>Status</Th>
                    <Th>Price</Th>
                    <Th>Renews / ends</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.subscriptions.map((s) => (
                    <tr
                      key={s.id}
                      tabIndex={0}
                      onClick={() => setOpen(s)}
                      onKeyDown={(e) => e.key === 'Enter' && setOpen(s)}
                      className="cursor-pointer transition-colors hover:bg-panel-2/70 focus-visible:bg-panel-2"
                    >
                      <Td>
                        <div className="font-medium">{s.userName}</div>
                        <div className="text-[13px] text-ink-3">{s.userEmail}</div>
                      </Td>
                      <Td><PlanBadge plan={s.plan} /></Td>
                      <Td>
                        <SubStatusBadge status={s.status} />
                        {s.isOnTrial && <span className="ml-2 text-xs text-ink-3">trialing</span>}
                      </Td>
                      <Td className="num text-ink-2">
                        {s.price ? `${fmtCurrency(s.price)} / ${s.cycle === 'month' ? 'mo' : 'yr'}` : '–'}
                      </Td>
                      <Td className="num text-ink-2">
                        {s.hasPremium ? `${s.willRenew ? 'Renews' : 'Ends'} ${fmtDate(s.expiresAt)}` : fmtDate(s.expiresAt)}
                      </Td>
                      <Td className="text-ink-3">
                        <ChevronRight className="size-4" />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data && (
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="subscriptions" onChange={setPage} />
            )}
          </>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title="Billing"
      >
        {open && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Avatar name={open.userName} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{open.userName}</div>
                <div className="truncate text-[13px] text-ink-3">{open.userEmail}</div>
              </div>
              <Button size="sm" onClick={() => navigate(`users/${open.userId}`)}>
                View user
              </Button>
            </div>
            <BillingPanel key={open.userId} userId={open.userId} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
