import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, Loader2, RefreshCw, Search, type LucideIcon } from 'lucide-react';
import { initials } from '../lib/format';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: LucideIcon;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-6px_var(--brand)] hover:bg-brand-hover',
  secondary: 'bg-panel text-ink hairline hover:bg-panel-2',
  soft: 'bg-brand-soft text-brand-ink hover:brightness-[0.97]',
  ghost: 'text-ink-2 hover:bg-panel-2 hover:text-ink',
  danger: 'bg-bad-soft text-bad hover:brightness-[0.97]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
});

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid size-9 place-items-center rounded-xl text-ink-2 transition hover:bg-panel-2 hover:text-ink active:scale-95',
        className
      )}
      {...rest}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn('rounded-2xl bg-panel shadow-card hairline', padded && 'p-5', className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'bad' | 'info' | 'violet';

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-panel-2 text-ink-2 hairline', dot: 'bg-ink-3' },
  brand: { chip: 'bg-brand-soft text-brand-ink', dot: 'bg-brand' },
  ok: { chip: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  warn: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  bad: { chip: 'bg-bad-soft text-bad', dot: 'bg-bad' },
  info: { chip: 'bg-info-soft text-info', dot: 'bg-info' },
  violet: { chip: 'bg-violet-soft text-violet', dot: 'bg-violet' },
};

export function Badge({
  tone = 'neutral',
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        t.chip,
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}

export const toneColor = (tone: Tone) => `var(--${tone === 'neutral' ? 'ink-3' : tone})`;

/* ---------------------------------------------------------------- Avatar */

const AVATAR_GRADIENTS = [
  'from-[#5b7bff] to-[#3a56e0]',
  'from-[#a78bfa] to-[#6d4de6]',
  'from-[#34d3a0] to-[#12945f]',
  'from-[#fbbf24] to-[#d97706]',
  'from-[#fb7185] to-[#d32f4a]',
  'from-[#38bdf8] to-[#0b86c9]',
];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white',
        AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------ Loading / states */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-ink-3', className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: { message: string; status?: number };
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-bad-soft text-bad">
        <AlertTriangle className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink">
        {error.status === 403 ? 'Access denied' : 'Something went wrong'}
      </p>
      <p className="mt-1 max-w-md text-[13px] text-ink-3">{error.message}</p>
      {onRetry && (
        <Button className="mt-5" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Forms */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-xl bg-panel-2 p-1 hairline" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            o.value === value ? 'bg-panel text-ink shadow-sm hairline' : 'text-ink-3 hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const FIELD_BASE =
  'rounded-xl bg-panel text-ink placeholder:text-ink-3 hairline transition focus:shadow-[var(--ring)] focus:outline-none disabled:opacity-60';

/** Full width unless the caller sets its own `w-*` class. */
const widthClass = (className?: string) => (/(^|\s)w-/.test(className ?? '') ? '' : 'w-full');

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }
>(function Input({ icon: Icon, className, ...rest }, ref) {
  return (
    <div className={cn('relative', /(^|\s)w-/.test(className ?? '') ? 'inline-block' : 'w-full')}>
      {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />}
      <input
        ref={ref}
        className={cn(FIELD_BASE, 'h-10 px-3.5 text-sm', widthClass(className), Icon && 'pl-10', className)}
        {...rest}
      />
    </div>
  );
});

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input icon={Search} type="search" {...props} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD_BASE, 'h-10 cursor-pointer px-3 text-sm', widthClass(className), className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, 'min-h-24 resize-y px-3.5 py-2.5 text-sm', widthClass(className), className)}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-line-strong'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  );
}

/* ---------------------------------------------------------------- Layout */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
  noun = 'results',
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
      <span className="num">
        {total.toLocaleString()} {noun}
      </span>
      <div className="flex items-center gap-2">
        <span className="num">
          Page {page} of {pages}
        </span>
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-3',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 align-middle text-sm text-ink', className)}>{children}</td>;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-5 py-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-48' : 'w-24')} />
          ))}
        </div>
      ))}
    </div>
  );
}
