import { ArrowRight, BadgeDollarSign, CreditCard, LifeBuoy, RefreshCw, ShieldCheck, TrendingUp, UserPlus, Users, Activity, Hourglass } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtCurrency, fmtNumber, fmtRelative, titleCase } from '../lib/format';
import { useResource } from '../lib/useResource';
import { Button, Card, CardHeader, ErrorState, PageHeader, Skeleton, cn } from '../ui/kit';
import { AreaChart, Donut, HBars } from '../ui/charts';
import { StatCard } from '../ui/stat';

const PLAN_COLORS = ['var(--brand)', 'var(--info)', 'var(--violet)', 'var(--ok)', 'var(--warn)'];

export function Overview({ navigate }: { navigate: (path: string) => void }) {
  const { data, error, loading, refreshing, reload } = useResource((s) => admin.overview(s), []);

  if (error && !data) {
    return (
      <>
        <PageHeader title="Overview" />
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      </>
    );
  }

  const d = data;
  const spark = d?.signupsByDay.map((x) => x.count);
  const planSlices = (d?.subscriptions.plans ?? []).map((p, i) => ({
    label: p.plan,
    value: p.subscribers,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));
  const queue = d
    ? [
        { label: 'Open support messages', value: d.support.openMessages, to: 'support', icon: LifeBuoy },
        { label: 'Open bug reports', value: d.support.openBugReports, to: 'support', icon: Activity },
        { label: 'Pending deletion requests', value: d.support.pendingDeletionRequests, to: 'compliance', icon: ShieldCheck },
      ]
    : [];

  return (
    <div className="rise">
      <PageHeader
        title="Overview"
        description={d ? `Updated ${fmtRelative(d.generatedAt)}` : 'Loading the latest numbers…'}
        actions={
          <Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={fmtNumber(d?.users.total)} icon={Users} tone="brand" loading={loading}
          hint={d ? `${fmtNumber(d.users.onboardingCompleted)} onboarded` : undefined} />
        <StatCard label="New in 30 days" value={fmtNumber(d?.users.new30d)} icon={UserPlus} tone="violet" loading={loading}
          hint={d ? `${fmtNumber(d.users.new7d)} this week` : undefined} spark={spark} />
        <StatCard label="Active this week" value={fmtNumber(d?.users.active7d)} icon={Activity} tone="info" loading={loading}
          hint={d && d.users.total ? `${Math.round((d.users.active7d / d.users.total) * 100)}% of users` : undefined} />
        <StatCard label="Paying subscribers" value={fmtNumber(d?.subscriptions.paying)} icon={CreditCard} tone="ok" loading={loading}
          hint={d ? `${d.subscriptions.conversionPct}% of users` : undefined} />
        <StatCard label="Monthly recurring revenue" value={fmtCurrency(d?.subscriptions.mrr, true)} icon={BadgeDollarSign} tone="ok" loading={loading}
          hint={d ? `${fmtCurrency(d.subscriptions.arr, true)} annualized` : undefined} />
        <StatCard label="On free trial" value={fmtNumber(d?.subscriptions.trialing)} icon={Hourglass} tone="warn" loading={loading}
          hint="Not yet paying" />
        <StatCard label="Premium accounts" value={fmtNumber(d?.subscriptions.premium)} icon={TrendingUp} tone="brand" loading={loading}
          hint="Trial + paid" />
        <StatCard label="Needs attention" value={fmtNumber(d ? queue.reduce((s, q) => s + q.value, 0) : undefined)}
          icon={LifeBuoy} tone={d && queue.some((q) => q.value > 0) ? 'bad' : 'ok'} loading={loading}
          hint="Support, bugs, deletions" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="New sign-ups" subtitle="Daily new accounts over the last 30 days" />
          {loading ? <Skeleton className="h-60 w-full" /> : <AreaChart data={d?.signupsByDay ?? []} />}
        </Card>

        <Card>
          <CardHeader title="Paying plans" subtitle="Subscribers by plan" />
          {loading ? (
            <Skeleton className="mx-auto size-40 rounded-full" />
          ) : planSlices.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">No paying subscribers yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <Donut
                slices={planSlices}
                centerValue={fmtNumber(d?.subscriptions.paying)}
                centerLabel="paying"
              />
              <ul className="w-full space-y-2.5">
                {d?.subscriptions.plans.map((p, i) => (
                  <li key={p.plan} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span className="size-2.5 rounded-full" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                      {p.plan}
                    </span>
                    <span className="num text-ink-2">
                      {fmtNumber(p.subscribers)} · {fmtCurrency(p.mrr)}/mo
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Needs attention" subtitle="Work waiting on your team" />
          <ul className="space-y-1">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {queue.map((q) => (
              <li key={q.label}>
                <button
                  onClick={() => navigate(q.to)}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-panel-2"
                >
                  <span
                    className={cn(
                      'grid size-10 place-items-center rounded-xl',
                      q.value > 0 ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'
                    )}
                  >
                    <q.icon className="size-[18px]" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{q.label}</span>
                    <span className="num text-[13px] text-ink-3">{q.value === 0 ? 'All clear' : `${q.value} waiting`}</span>
                  </span>
                  <ArrowRight className="size-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Sign-in methods" subtitle="How people create accounts" />
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <HBars
              rows={Object.entries(d?.users.byProvider ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([k, v], i) => ({ label: titleCase(k), value: v, color: PLAN_COLORS[i % PLAN_COLORS.length] }))}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Account types" subtitle="Patients and clinicians" />
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <HBars
              rows={Object.entries(d?.users.byRole ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([k, v], i) => ({ label: titleCase(k), value: v, color: PLAN_COLORS[(i + 2) % PLAN_COLORS.length] }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
