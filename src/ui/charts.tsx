import { useId, useMemo, useState } from 'react';
import { fmtNumber, fmtShortDay } from '../lib/format';
import { cn } from './kit';

interface Point {
  date: string;
  count: number;
}

/* -------------------------------------------------------------- Sparkline */

export function Sparkline({
  values,
  color = 'var(--brand)',
  height = 36,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const id = useId();
  if (values.length < 2) return <div style={{ height }} />;
  const w = 120;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    height - 3 - ((v - min) / span) * (height - 8),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------- Area chart */

export function AreaChart({
  data,
  color = 'var(--brand)',
  height = 240,
  label = 'Signups',
}: {
  data: Point[];
  color?: string;
  height?: number;
  label?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 26;

  const { path, area, pts, ticks, max } = useMemo(() => {
    const mx = Math.max(...data.map((d) => d.count), 1);
    const niceMax = Math.ceil(mx / 4) * 4 || 4;
    const innerW = W - padL - padR;
    const innerH = height - padT - padB;
    const points = data.map((d, i) => ({
      x: padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: padT + innerH - (d.count / niceMax) * innerH,
      ...d,
    }));
    // Smooth line (monotone-ish via midpoint control points).
    let p = '';
    points.forEach((pt, i) => {
      if (i === 0) p = `M${pt.x},${pt.y}`;
      else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        p += ` C${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
      }
    });
    const base = padT + innerH;
    const a = points.length
      ? `${p} L${points[points.length - 1].x},${base} L${points[0].x},${base} Z`
      : '';
    const t = [0, 0.5, 1].map((f) => ({
      y: padT + innerH - f * innerH,
      v: Math.round(f * niceMax),
    }));
    return { path: p, area: a, pts: points, ticks: t, max: niceMax };
  }, [data, height]);

  const active = hover != null ? pts[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label} over time`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const step = (W - padL - padR) / Math.max(pts.length - 1, 1);
          const i = Math.round((x - padL) / step);
          setHover(Math.min(pts.length - 1, Math.max(0, i)));
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t.y}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="var(--line)" strokeDasharray="3 5" />
            <text x={padL - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" className="num">
              {t.v}
            </text>
          </g>
        ))}
        {area && <path d={area} fill={`url(#${id})`} />}
        {path && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
        {pts.length > 1 &&
          [0, Math.floor(pts.length / 2), pts.length - 1].map((i) => (
            <text
              key={i}
              x={pts[i].x}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
              fontSize="11"
              fill="var(--ink-3)"
            >
              {fmtShortDay(pts[i].date)}
            </text>
          ))}
        {active && (
          <g>
            <line x1={active.x} x2={active.x} y1={padT} y2={height - padB} stroke="var(--line-strong)" />
            <circle cx={active.x} cy={active.y} r="5" fill="var(--panel)" stroke={color} strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-navy px-3 py-2 text-xs text-white shadow-pop"
          style={{
            left: `${(active.x / W) * 100}%`,
            top: Math.max(0, (active.y / height) * 100 - 22) + '%',
          }}
        >
          <div className="num text-sm font-semibold">{fmtNumber(active.count)}</div>
          <div className="text-white/70">{fmtShortDay(active.date)}</div>
        </div>
      )}
      <span className="sr-only">Maximum {max}</span>
    </div>
  );
}

/* -------------------------------------------------------------- Bar chart */

export function BarChart({
  data,
  color = 'var(--brand)',
  height = 140,
}: {
  data: Point[];
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={cn('w-full rounded-t-md transition-opacity', hover != null && hover !== i && 'opacity-45')}
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1.5)}%`,
                background: d.count > 0 ? color : 'var(--line)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>{data[0] ? fmtShortDay(data[0].date) : ''}</span>
        <span className="num h-4 text-ink-2">
          {hover != null ? `${fmtShortDay(data[hover].date)} · ${fmtNumber(data[hover].count)}` : ''}
        </span>
        <span>{data.length ? fmtShortDay(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Donut */

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  centerLabel,
  centerValue,
  size = 168,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 62;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="16" />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(len - 3, 0)} ${c - Math.max(len - 3, 0)}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-xl font-semibold tracking-tight text-ink">{centerValue}</div>
          <div className="text-xs text-ink-3">{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Horizontal bars */

export function HBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; color?: string; hint?: string }>;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="num shrink-0 text-ink-2">
              {fmtNumber(r.value)}
              {r.hint && <span className="ml-1.5 text-ink-3">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-panel-2 hairline">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? 'var(--brand)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
