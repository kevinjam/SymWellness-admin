import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { Button, Field, Input } from '../ui/kit';
import { Logo } from '../layout/Sidebar';

const POINTS = [
  { icon: Users, title: 'Every account in one place', body: 'Search users, review plans and manage access.' },
  { icon: Sparkles, title: 'Know what people use', body: 'Usage across Thesis, scans, planners and more.' },
  { icon: ShieldCheck, title: 'Privacy first', body: 'Counts and billing only. Health records stay private.' },
];

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? 'Incorrect email or password.'
            : err.message
          : 'Could not sign in. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <aside className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-[420px] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 size-[380px] rounded-full bg-[#6f89ff]/30 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">SymWellness Admin</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight">
            Run SymWellness with clarity.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Subscriptions, support and platform health, all in one calm workspace.
          </p>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 backdrop-blur">
                  <p.icon className="size-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-[13px] text-white/70">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/55">
          Authorized personnel only. Access is logged.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="rise w-full max-w-[380px]" noValidate>
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-1.5 text-sm text-ink-3">Sign in with your administrator account.</p>

          <div className="mt-8 space-y-5">
            <Field label="Email">
              <Input
                icon={Mail}
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  icon={Lock}
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!email || !password}
            className="mt-7 h-11 w-full"
          >
            Sign in
            {!busy && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </main>
    </div>
  );
}
