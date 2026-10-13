import { AlertTriangle, Check, CircleSlash, Copy, CreditCard, ExternalLink, Receipt } from 'lucide-react';
import { useState } from 'react';
import { admin } from '../lib/endpoints';
import { fmtCurrency, fmtDate } from '../lib/format';
import { useResource } from '../lib/useResource';
import { Badge, Card, EmptyState, ErrorState, Skeleton, cn, type Tone } from '../ui/kit';
import { useToast } from '../ui/overlay';
import { SubStatusBadge } from '../ui/status';

const INVOICE_TONE: Record<string, Tone> = {
  paid: 'ok',
  open: 'warn',
  draft: 'neutral',
  void: 'neutral',
  uncollectible: 'bad',
};

const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  diners: 'Diners Club',
  unionpay: 'UnionPay',
};

function CopyChip({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error('Could not copy', 'Select the text and copy it manually.');
        }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-xl bg-panel-2 px-3.5 py-2.5 text-left transition hover:brightness-[0.98]"
      title="Copy"
    >
      <span className="min-w-0">
        <span className="block text-xs text-ink-3">{label}</span>
        <span className="num block truncate text-[13px] font-medium text-ink">{value}</span>
      </span>
      {done ? (
        <Check className="size-4 shrink-0 text-ok" />
      ) : (
        <Copy className="size-4 shrink-0 text-ink-3 group-hover:text-ink" />
      )}
    </button>
  );
}

/**
 * Billing for one user, rendered inside the console (no jump to Stripe).
 * Loads on mount, so mount it only when the panel is actually opened.
 */
export function BillingPanel({ userId }: { userId: string }) {
  const { data, error, loading, reload } = useResource((s) => admin.billing(userId, s), [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  if (!data.connected) {
    return (
      <EmptyState
        icon={CircleSlash}
        title="No billing history"
        body="This user has never started a checkout, so there is no Stripe customer yet."
      />
    );
  }

  const pm = data.paymentMethod;
  const expired =
    pm?.expMonth && pm.expYear ? new Date(pm.expYear, pm.expMonth, 1).getTime() < Date.now() : false;
  const invoices = data.invoices ?? [];
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amountPaid, 0);

  return (
    <div className="space-y-6">
      {/* Plan summary */}
      <div className="brand-gradient relative overflow-hidden rounded-2xl p-5 text-white">
        <div aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Current plan</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{data.planTitle}</p>
            <p className="num mt-0.5 text-sm text-white/80">{data.priceString ?? 'No recurring charge'}</p>
          </div>
          <div className="[&_*]:!text-white [&>span]:!bg-white/15">
            <SubStatusBadge status={data.status ?? 'free'} />
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-white/65">{data.willRenew ? 'Renews on' : 'Access ends'}</dt>
            <dd className="num font-medium">{fmtDate(data.expirationDate)}</dd>
          </div>
          <div>
            <dt className="text-white/65">Paid to date</dt>
            <dd className="num font-medium">{fmtCurrency(paidTotal)}</dd>
          </div>
        </dl>
      </div>

      {data.cancelAtPeriodEnd && (
        <p className="flex items-start gap-2.5 rounded-xl bg-warn-soft px-4 py-3 text-[13px] font-medium text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Cancels at the end of the current period. They will not be charged again.
        </p>
      )}
      {data.isOnTrial && (
        <p className="rounded-xl bg-info-soft px-4 py-3 text-[13px] font-medium text-info">
          On a free trial. The first charge happens when the trial ends.
        </p>
      )}

      {/* Payment method */}
      <section>
        <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-3">Payment method</h4>
        {pm ? (
          <Card className="flex items-center gap-4 !p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-panel-2 text-ink-2">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">
                {BRAND_LABEL[pm.brand] ?? pm.brand} <span className="num text-ink-2">•••• {pm.last4}</span>
              </div>
              <div className={cn('num text-[13px]', expired ? 'text-bad' : 'text-ink-3')}>
                {pm.expMonth && pm.expYear
                  ? `${expired ? 'Expired' : 'Expires'} ${String(pm.expMonth).padStart(2, '0')}/${String(pm.expYear).slice(-2)}`
                  : 'No expiry on file'}
              </div>
            </div>
            {expired && <Badge tone="bad">Expired</Badge>}
          </Card>
        ) : (
          <p className="rounded-xl bg-panel-2 px-4 py-3 text-[13px] text-ink-3">
            No card on file. Apple Pay and wallet payments appear here when they are saved to Stripe.
          </p>
        )}
      </section>

      {/* Invoices */}
      <section>
        <h4 className="mb-2.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-3">
          <span>Invoices</span>
          <span className="num normal-case tracking-normal">{invoices.length} recent</span>
        </h4>
        {invoices.length === 0 ? (
          <p className="rounded-xl bg-panel-2 px-4 py-3 text-[13px] text-ink-3">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl hairline">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 bg-panel px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-panel-2 text-ink-3">
                  <Receipt className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{inv.description}</div>
                  <div className="num truncate text-xs text-ink-3">
                    {inv.number} · {fmtDate(inv.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-semibold text-ink">{fmtCurrency(inv.total)}</div>
                  <Badge tone={INVOICE_TONE[inv.status] ?? 'neutral'} className="mt-0.5">
                    {inv.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reference IDs */}
      <section className="space-y-2">
        <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-3">Reference</h4>
        {data.customerId && <CopyChip label="Stripe customer" value={data.customerId} />}
        {data.subscriptionId && <CopyChip label="Stripe subscription" value={data.subscriptionId} />}
        {data.customerId && (
          <a
            href={`https://dashboard.stripe.com/customers/${data.customerId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-ink-3 hover:text-ink"
          >
            Refunds and disputes: open in Stripe <ExternalLink className="size-3" />
          </a>
        )}
      </section>
    </div>
  );
}
