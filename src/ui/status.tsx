import { Badge, type Tone } from './kit';
import { titleCase } from '../lib/format';

const SUB_STATUS: Record<string, { tone: Tone; label: string }> = {
  active: { tone: 'ok', label: 'Active' },
  trial: { tone: 'info', label: 'Trial' },
  cancelled: { tone: 'warn', label: 'Cancelled' },
  expired: { tone: 'bad', label: 'Expired' },
  free: { tone: 'neutral', label: 'Free' },
};

export function SubStatusBadge({ status }: { status: string }) {
  const s = SUB_STATUS[status] ?? { tone: 'neutral' as Tone, label: titleCase(status) };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const tone: Tone =
    plan === 'Yearly' ? 'brand' : plan === 'Monthly' ? 'info' : plan === 'Diet & exercise' ? 'violet' : 'neutral';
  return <Badge tone={tone}>{plan}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const tone: Tone = role === 'admin' ? 'violet' : role === 'doctor' ? 'info' : 'neutral';
  return <Badge tone={tone}>{titleCase(role)}</Badge>;
}

const PRIORITY: Record<string, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warn',
  urgent: 'bad',
  critical: 'bad',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={PRIORITY[priority] ?? 'neutral'}>{titleCase(priority)}</Badge>;
}

const TICKET: Record<string, Tone> = {
  open: 'bad',
  in_progress: 'warn',
  resolved: 'ok',
  closed: 'neutral',
  duplicate: 'neutral',
  pending: 'warn',
  processing: 'info',
  completed: 'ok',
  cancelled: 'neutral',
};

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TICKET[status] ?? 'neutral'} dot>
      {titleCase(status)}
    </Badge>
  );
}
