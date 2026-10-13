const nf = new Intl.NumberFormat('en-US');
const cf = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtNumber = (n: number | null | undefined) => (n == null ? '–' : nf.format(n));
export const fmtCompact = (n: number | null | undefined) => (n == null ? '–' : cf.format(n));

export function fmtCurrency(n: number | null | undefined, compact = false) {
  if (n == null) return '–';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function fmtDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export function fmtShortDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function fmtRelative(value: string | Date | null | undefined) {
  if (!value) return 'Never';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '–';
  const s = Math.round(ms / 1000);
  if (s < 45) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(value);
}

export function initials(name: string | null | undefined) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function titleCase(s: string) {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
