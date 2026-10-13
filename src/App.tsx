import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { admin } from './lib/endpoints';
import { useRoute } from './lib/router';
import { useResource } from './lib/useResource';
import { ToastProvider } from './ui/overlay';
import { Spinner } from './ui/kit';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { CommandPalette } from './layout/CommandPalette';
import { Login } from './screens/Login';
import { Overview } from './screens/Overview';
import { Users } from './screens/Users';
import { Subscriptions } from './screens/Subscriptions';
import { Usage } from './screens/Usage';
import { Support } from './screens/Support';
import { Compliance } from './screens/Compliance';
import { Catalogs } from './screens/Catalogs';
import { Care } from './screens/Care';
import { Content } from './screens/Content';
import { Controls } from './screens/Controls';
import { Notifications } from './screens/Notifications';
import { Settings } from './screens/Settings';

const THEME_KEY = 'sym_admin_theme';

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const root = document.documentElement;
    // Avoid a half-second colour fade across every element when flipping theme.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    const t = window.setTimeout(() => root.classList.remove('theme-switching'), 60);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    return () => window.clearTimeout(t);
  }, [dark]);
  return { dark, setDark };
}

function Shell() {
  const { me, logout } = useAuth();
  const { page, param, navigate } = useRoute();
  const { dark, setDark } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  // Sidebar badges come from the same overview the dashboard shows.
  const counts = useResource((s) => admin.overview(s), []);
  const badges = useMemo<Record<string, number>>(() => {
    const s = counts.data?.support;
    const out: Record<string, number> = {};
    if (s) {
      out.support = s.openMessages + s.openBugReports;
      out.compliance = s.pendingDeletionRequests;
    }
    return out;
  }, [counts.data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback((path: string) => navigate(path), [navigate]);

  let screen;
  switch (page) {
    case 'users':
      screen = <Users userId={param} navigate={go} />;
      break;
    case 'subscriptions':
      screen = <Subscriptions navigate={go} />;
      break;
    case 'usage':
      screen = <Usage />;
      break;
    case 'support':
      screen = <Support />;
      break;
    case 'compliance':
      screen = <Compliance />;
      break;
    case 'catalogs':
      screen = <Catalogs />;
      break;
    case 'care':
      screen = <Care />;
      break;
    case 'content':
      screen = <Content />;
      break;
    case 'controls':
      screen = <Controls />;
      break;
    case 'notifications':
      screen = <Notifications />;
      break;
    case 'settings':
      screen = <Settings dark={dark} onSetDark={setDark} />;
      break;
    default:
      screen = <Overview navigate={go} />;
  }

  return (
    <div className="min-h-full">
      <Sidebar
        current={page}
        onNavigate={go}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        badges={badges}
        me={me}
        onLogout={logout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>
        <Topbar
          page={page}
          dark={dark}
          onToggleDark={() => setDark(!dark)}
          onOpenPalette={() => setPalette(true)}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-8 sm:px-8">{screen}</main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} onNavigate={go} />
    </div>
  );
}

function Gate() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="grid min-h-full place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return status === 'authed' ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
