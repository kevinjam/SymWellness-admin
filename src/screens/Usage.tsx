import { useState } from 'react';
import { Flame, MessageSquareText, Pill, ScanLine, Salad, Sparkles, Sprout, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { fmtNumber } from '../lib/format';
import { useResource } from '../lib/useResource';
import { Avatar, Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, Td, Th } from '../ui/kit';
import { BarChart } from '../ui/charts';
import { PlanBadge } from '../ui/status';
import type { Tone } from '../ui/kit';

const META: Record<string, { icon: LucideIcon; color: string; tone: Tone; blurb: string }> = {
  thesis: { icon: MessageSquareText, color: 'var(--brand)', tone: 'brand', blurb: 'Messages sent in Thesis' },
  calorieScan: { icon: Flame, color: 'var(--warn)', tone: 'warn', blurb: 'Meals analysed (free feature)' },
  scanner: { icon: ScanLine, color: 'var(--violet)', tone: 'violet', blurb: 'Supplement & label scans' },
  prescription: { icon: Pill, color: 'var(--info)', tone: 'info', blurb: 'Prescription scans' },
  wellnessNotes: { icon: FileText, color: 'var(--ok)', tone: 'ok', blurb: 'Wellness notes generated' },
  mealPlanner: { icon: Salad, color: 'var(--ok)', tone: 'ok', blurb: 'Meal plans generated' },
  mindfulness: { icon: Sprout, color: 'var(--violet)', tone: 'violet', blurb: 'Mindfulness searches' },
};

export function Usage() {
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useResource((s) => admin.usage(days, s), [days]);

  return (
    <div className="rise">
      <PageHeader
        title="Usage & AI"
        description="How people use each feature. Counts only, never content."
        actions={
          <Segmented
            options={[
              { label: '7 days', value: 7 },
              { label: '30 days', value: 30 },
              { label: '90 days', value: 90 },
            ]}
            value={days}
            onChange={setDays}
          />
        }
      />

      {error && !data ? (
        <Card><ErrorState error={error} onRetry={reload} /></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}><Skeleton className="h-40 w-full" /></Card>
                ))
              : data?.features.map((f) => {
                  const m = META[f.key] ?? META.thesis;
                  return (
                    <Card key={f.key}>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-ink-3">{f.label}</p>
                          <p className="num mt-1 text-[28px] font-semibold leading-none tracking-tight text-ink">
                            {fmtNumber(f.total)}
                          </p>
                          <p className="mt-1.5 text-xs text-ink-3">{m.blurb}</p>
                        </div>
                        <span className="grid size-10 place-items-center rounded-xl bg-panel-2" style={{ color: m.color }}>
                          <m.icon className="size-5" />
                        </span>
                      </div>
                      <BarChart data={f.series} color={m.color} height={96} />
                    </Card>
                  );
                })}
          </div>

          <Card padded={false} className="mt-4">
            <div className="p-5 pb-0">
              <CardHeader title="Most active in Thesis" subtitle={`Top accounts by messages in the last ${days} days`} />
            </div>
            {loading ? (
              <div className="p-5"><Skeleton className="h-40 w-full" /></div>
            ) : !data || data.topUsers.length === 0 ? (
              <EmptyState icon={Sparkles} title="No Thesis activity yet" body="Activity will appear here once people start chatting." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-y border-line bg-panel-2/60">
                    <tr>
                      <Th>#</Th>
                      <Th>User</Th>
                      <Th>Plan</Th>
                      <Th className="text-right">Messages</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.topUsers.map((u, i) => (
                      <tr key={u.userId} className="hover:bg-panel-2/70">
                        <Td className="num w-12 text-ink-3">{i + 1}</Td>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size={32} />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{u.name}</div>
                              <div className="truncate text-[13px] text-ink-3">{u.email}</div>
                            </div>
                          </div>
                        </Td>
                        <Td><PlanBadge plan={u.plan} /></Td>
                        <Td className="num text-right font-semibold">{fmtNumber(u.messages)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
