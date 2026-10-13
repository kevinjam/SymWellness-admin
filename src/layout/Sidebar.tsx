import { ChevronsLeft, HeartPulse, LogOut, X } from 'lucide-react';
import { cn, Avatar } from '../ui/kit';
import { NAV, NAV_GROUPS } from './nav';
import type { AdminMe } from '../lib/types';

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="brand-gradient grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_-8px_var(--brand)]">
        <HeartPulse className="size-5" strokeWidth={2.2} />
      </span>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-ink">SymWellness</div>
          <div className="text-xs text-ink-3">Admin console</div>
        </div>
      )}
    </div>
  );
}

interface Props {
  current: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  badges: Record<string, number>;
  me: AdminMe | null;
  onLogout: () => void;
  /** Mobile drawer mode. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  badges,
  me,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const content = (isMobile: boolean) => {
    const slim = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col">
        <div className={cn('flex items-center justify-between px-4 pb-4 pt-5', slim && 'justify-center px-0')}>
          <Logo collapsed={slim} />
          {isMobile && (
            <button aria-label="Close menu" onClick={onCloseMobile} className="text-ink-3">
              <X className="size-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="mb-4">
              {!slim && (
                <div className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  {group}
                </div>
              )}
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === group).map((item) => {
                  const active = current === item.id;
                  const badge = badges[item.id];
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          onNavigate(item.id);
                          onCloseMobile();
                        }}
                        title={slim ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          slim && 'justify-center px-0',
                          active
                            ? 'bg-brand-soft text-brand-ink'
                            : 'text-ink-2 hover:bg-panel-2 hover:text-ink'
                        )}
                      >
                        {active && (
                          <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand" aria-hidden />
                        )}
                        <item.icon className={cn('size-[18px] shrink-0', active ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')} />
                        {!slim && <span className="flex-1 truncate text-left">{item.label}</span>}
                        {!slim && badge ? (
                          <span className="num rounded-full bg-bad px-1.5 py-px text-[11px] font-semibold text-white">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                        {slim && badge ? (
                          <span className="absolute right-2 top-1.5 size-2 rounded-full bg-bad" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className={cn('flex items-center gap-3 rounded-xl p-2', slim && 'justify-center')}>
            <Avatar name={me?.name || me?.email || 'Admin'} size={36} />
            {!slim && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{me?.name || 'Administrator'}</div>
                <div className="truncate text-xs text-ink-3">{me?.email}</div>
              </div>
            )}
            {!slim && (
              <button
                aria-label="Sign out"
                title="Sign out"
                onClick={onLogout}
                className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-panel-2 hover:text-bad"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-ink-3 transition hover:bg-panel-2 hover:text-ink',
                collapsed && 'justify-center px-0'
              )}
            >
              <ChevronsLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
              {!collapsed && 'Collapse'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-panel transition-[width] duration-300 lg:block',
          collapsed ? 'w-[76px]' : 'w-[264px]'
        )}
      >
        {content(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#060a1c]/50 backdrop-blur-[2px]" onClick={onCloseMobile} />
          <aside className="rise absolute inset-y-0 left-0 w-[280px] bg-panel shadow-pop">{content(true)}</aside>
        </div>
      )}
    </>
  );
}
