import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { IconButton } from './Button';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  /** Fast bund (knapper) */
  footer?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bundark. Lukker på Escape og tryk på baggrunden, fanger fokus mens det er åbent
 * og animerer ind/ud. Placér det inde i <Screen> (positioneres i forhold til skærmen).
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, 230);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    return () => previous?.focus?.();
  }, [open, mounted]);

  if (!mounted) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const nodes = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!nodes.length) return;
    const first = nodes[0]!, last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <>
      <div className={closing ? 'rs-backdrop rs-closing' : 'rs-backdrop'} onClick={onClose} />
      <div ref={sheetRef} className={closing ? 'rs-sheet rs-closing' : 'rs-sheet'} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="rs-sheet__handle" />
        <div className="rs-sheet__head">
          <h2 id={titleId} className="rs-t-h2">{title}</h2>
          <IconButton icon="close" label="Luk" onClick={onClose} />
        </div>
        <div className="rs-sheet__body">{children}</div>
        {footer && <div className="rs-sheet__foot">{footer}</div>}
      </div>
    </>
  );
}

/* ---------------------------------- Toast ---------------------------------- */
export interface ToastOptions { icon?: IconName; duration?: number }
interface ToastState { id: number; message: string; icon: IconName; out: boolean }
interface ToastApi { toast: (message: string, options?: ToastOptions) => void }

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const counter = useRef(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    timers.current.forEach(clearTimeout);
    const id = ++counter.current;
    setState({ id, message, icon: options.icon ?? 'check', out: false });
    const duration = options.duration ?? 2200;
    timers.current = [
      setTimeout(() => setState((s) => (s && s.id === id ? { ...s, out: true } : s)), duration),
      setTimeout(() => setState((s) => (s && s.id === id ? null : s)), duration + 240)
    ];
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {state && (
        <div key={state.id} className={state.out ? 'rs-toast rs-out' : 'rs-toast'} role="status" aria-live="polite">
          <Icon name={state.icon} size={18} />
          {state.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** `const { toast } = useToast(); toast('Gemt i favoritter')` */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast skal bruges inde i <ToastProvider>');
  return ctx;
}
