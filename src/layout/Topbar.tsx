import { Menu, Moon, Search, Sun } from 'lucide-react';
import { API_LABEL } from '../lib/config';
import { IconButton, Badge } from '../ui/kit';
import { NAV } from './nav';

interface Props {
  page: string;
  dark: boolean;
  onToggleDark: () => void;
  onOpenPalette: () => void;
  onOpenMenu: () => void;
}

export function Topbar({ page, dark, onToggleDark, onOpenPalette, onOpenMenu }: Props) {
  const current = NAV.find((n) => n.id === page);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return (
    <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:px-8">
      <IconButton icon={Menu} label="Open menu" onClick={onOpenMenu} className="lg:hidden" />
      <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
        <span className="text-ink-3">Admin</span>
        <span className="text-ink-3">/</span>
        <span className="truncate font-medium text-ink">{current?.label ?? 'Overview'}</span>
      </div>

      <button
        onClick={onOpenPalette}
        className="group mx-auto flex h-10 w-full max-w-md items-center gap-3 rounded-xl bg-panel px-3.5 text-sm text-ink-3 shadow-sm hairline transition hover:text-ink-2"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search users, jump to a page…</span>
        <kbd className="num hidden rounded-md bg-panel-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-3 hairline sm:block">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Badge tone="ok" dot>
          {API_LABEL}
        </Badge>
      </div>
      <IconButton icon={dark ? Sun : Moon} label={dark ? 'Light mode' : 'Dark mode'} onClick={onToggleDark} />
    </div>
  );
}
