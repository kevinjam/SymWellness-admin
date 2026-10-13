import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, Skeleton, cn, type Tone } from './kit';
import { Sparkline } from './charts';

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-panel-2 text-ink-2',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
  violet: 'bg-violet-soft text-violet',
};

const SPARK: Record<Tone, string> = {
  neutral: 'var(--ink-3)',
  brand: 'var(--brand)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  info: 'var(--info)',
  violet: 'var(--violet)',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  delta,
  spark,
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  /** Percentage change; positive is shown in green. */
  delta?: number | null;
  spark?: number[];
  loading?: boolean;
}) {
  return (
    <Card className="flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink-3">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <p className="num mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
          )}
        </div>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', ICON_TONE[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 text-[13px]">
          {delta != null && !loading && (
            <span
              className={cn(
                'num inline-flex items-center gap-0.5 font-semibold',
                delta >= 0 ? 'text-ok' : 'text-bad'
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className={cn('text-ink-3', delta != null && 'ml-1.5')}>{hint}</span>}
        </div>
        {spark && spark.length > 1 && (
          <div className="w-24 shrink-0">
            <Sparkline values={spark} color={SPARK[tone]} />
          </div>
        )}
      </div>
    </Card>
  );
}
