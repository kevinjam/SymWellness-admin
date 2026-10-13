import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search, User } from 'lucide-react';
import { admin } from '../lib/endpoints';
import { useDebounced } from '../lib/useResource';
import type { AdminUser } from '../lib/types';
import { Avatar, cn } from '../ui/kit';
import { NAV } from './nav';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

type Entry =
  | { kind: 'page'; id: string; label: string; icon: (typeof NAV)[number]['icon'] }
  | { kind: 'user'; id: string; label: string; sub: string };

export function CommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(query.trim(), 250);

  useEffect(() => {
    if (open) {
      setQuery('');
      setUsers([]);
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open || debounced.length < 2) {
      setUsers([]);
      return;
    }
    const ctrl = new AbortController();
    admin
      .users({ search: debounced, limit: 5 }, ctrl.signal)
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
    return () => ctrl.abort();
  }, [debounced, open]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = NAV.filter(
      (n) => !q || n.label.toLowerCase().includes(q) || (n.keywords ?? '').includes(q)
    ).map<Entry>((n) => ({ kind: 'page', id: n.id, label: n.label, icon: n.icon }));
    const people = users.map<Entry>((u) => ({ kind: 'user', id: u.id, label: u.name, sub: u.email }));
    return [...people, ...pages];
  }, [query, users]);

  useEffect(() => setIndex(0), [entries.length]);

  if (!open) return null;

  const choose = (e: Entry | undefined) => {
    if (!e) return;
    onNavigate(e.kind === 'user' ? `users/${e.id}` : e.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-start justify-items-center px-4 pt-[14vh]">
      <div className="absolute inset-0 bg-[#060a1c]/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="rise relative w-full max-w-xl overflow-hidden rounded-2xl bg-panel shadow-pop hairline"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, entries.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                choose(entries[index]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Type a page, or a name / email to find a user…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:shadow-none focus:outline-none"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {entries.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-ink-3">No matches</li>
          )}
          {entries.map((e, i) => (
            <li key={`${e.kind}-${e.id}`}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(e)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm',
                  i === index ? 'bg-brand-soft text-brand-ink' : 'text-ink'
                )}
              >
                {e.kind === 'user' ? (
                  <Avatar name={e.label} size={28} />
                ) : (
                  <e.icon className="size-[18px] text-ink-3" />
                )}
                <span className="flex-1 truncate font-medium">{e.label}</span>
                {e.kind === 'user' ? (
                  <span className="flex items-center gap-1 truncate text-xs text-ink-3">
                    <User className="size-3" />
                    {e.sub}
                  </span>
                ) : (
                  <span className="text-xs text-ink-3">Page</span>
                )}
                {i === index && <CornerDownLeft className="size-3.5 text-ink-3" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
