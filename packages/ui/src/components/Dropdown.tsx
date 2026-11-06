import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../icons/Icon';
import { cx } from '../utils';

export interface DropdownOption { value: string; label: string }

export interface DropdownProps {
  /** Navnet på valget, fx "Størrelse". Står på knappen og er listens navn for skærmlæsere. */
  label: string;
  options: ReadonlyArray<string | DropdownOption>;
  /** Valgt værdi. Tom streng = intet valgt. */
  value: string;
  onChange: (value: string) => void;
  /** Gør den tomme værdi valgbar med denne tekst, fx "Alle" */
  emptyLabel?: string;
  /** Vis den valgte værdi på knappen ("Størrelse: M"). Default true. */
  showValue?: boolean;
  /** Fremhæv knappen, når noget er valgt (filtre). Sæt false for fx sortering, der altid har en værdi. */
  highlightSelected?: boolean;
  className?: string;
}

const PANEL_MAX = 320;

/**
 * Dropdown i temaets stil (erstatter browserens <select>, hvor udseendet betyder noget, fx filtre).
 * Følger WAI-ARIA-mønstret for en knap med listbox: piletaster, Home/End, Enter/mellemrum, Escape,
 * bogstav-søgning og klik udenfor. Fokus vender tilbage til knappen, når listen lukkes.
 */
export function Dropdown({ label, options, value, onChange, emptyLabel, showValue = true, highlightSelected = true, className }: DropdownProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const opts = useMemo<DropdownOption[]>(() => {
    const list = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    return emptyLabel !== undefined ? [{ value: '', label: emptyLabel }, ...list] : list;
  }, [options, emptyLabel]);
  const selectedIndex = opts.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? opts[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [alignEnd, setAlignEnd] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const openList = useCallback((at?: number) => {
    setActive(at ?? Math.max(0, selectedIndex));
    // Læg listen mod højre, hvis den ellers går ud over skærmkanten
    const r = wrapRef.current?.getBoundingClientRect();
    setAlignEnd(!!r && r.left + Math.min(PANEL_MAX, window.innerWidth - 32) > window.innerWidth - 16);
    setOpen(true);
  }, [selectedIndex]);

  const close = useCallback((focusButton: boolean) => {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  }, []);

  const choose = (i: number) => {
    const o = opts[i];
    if (o) onChange(o.value);
    close(true);
  };

  // Fokus ind i listen, når den åbner
  useLayoutEffect(() => { if (open) listRef.current?.focus(); }, [open]);

  // Hold det aktive valg synligt
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${uid}-o${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, uid]);

  // Klik/tryk udenfor lukker
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = opts.length - 1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => Math.min(last, a + 1)); return;
      case 'ArrowUp': e.preventDefault(); setActive((a) => Math.max(0, a - 1)); return;
      case 'Home': e.preventDefault(); setActive(0); return;
      case 'End': e.preventDefault(); setActive(last); return;
      case 'Enter': case ' ': e.preventDefault(); choose(active); return;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); return;
      case 'Tab': close(false); return;
    }
    // Bogstav-søgning: hop til næste valg, der starter med de tastede tegn
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLocaleLowerCase('da-DK'), at: now };
      const t = typed.current.text;
      const order = [...opts.keys()].map((k) => (active + (t.length === 1 ? 1 : 0) + k) % opts.length);
      const hit = order.find((i) => opts[i]!.label.toLocaleLowerCase('da-DK').startsWith(t));
      if (hit !== undefined) setActive(hit);
    }
  };

  const shown = showValue && selected && selected.value !== '' ? selected.label : undefined;

  return (
    <div ref={wrapRef} className={cx('rs-dd', className)}>
      <button
        ref={btnRef}
        type="button"
        className="rs-dd__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-active={shown && highlightSelected ? 'true' : undefined}
        onClick={() => (open ? close(true) : openList())}
        onKeyDown={onButtonKey}
      >
        <span className="rs-dd__label">{label}{shown && <>: <b>{shown}</b></>}</span>
        <Icon name="down" size={16} className="rs-dd__chev" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${uid}-o${active}`}
          className={cx('rs-dd__panel', alignEnd && 'rs-dd__panel--end')}
          onKeyDown={onListKey}
        >
          {opts.map((o, i) => (
            <li
              key={o.value || '__tom'}
              id={`${uid}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active ? 'true' : undefined}
              className="rs-dd__opt"
              onMouseMove={() => { if (i !== active) setActive(i); }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.value === value && <Icon name="check" size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
