import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button, IconButton, cn } from './kit';

/* ----------------------------------------------------------------- Modal */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEscape(open, onClose);
  useScrollLock(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#060a1c]/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('rise relative w-full rounded-2xl bg-panel shadow-pop hairline', width)}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-bad-soft text-bad">
            <AlertTriangle className="size-4" />
          </span>
        )}
        <div className="text-sm text-ink-2">{body}</div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Drawer */

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEscape(open, onClose);
  useScrollLock(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#060a1c]/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col bg-panel shadow-pop hairline',
          width
        )}
        style={{ animation: 'rise 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>,
    document.body
  );
}

/* ----------------------------------------------------------------- Toast */

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_ICON = {
  success: <CheckCircle2 className="size-5 text-ok" />,
  error: <XCircle className="size-5 text-bad" />,
  info: <Info className="size-5 text-info" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, tone, title, message }].slice(-4));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, m) => push('success', t, m),
      error: (t, m) => push('error', t, m),
      info: (t, m) => push('info', t, m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className="rise pointer-events-auto flex items-start gap-3 rounded-2xl bg-panel p-4 shadow-pop hairline"
            >
              <span className="mt-px">{TOAST_ICON[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] text-ink-3">{t.message}</p>}
              </div>
              <button
                aria-label="Dismiss"
                className="text-ink-3 hover:text-ink"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
