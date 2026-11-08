import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { cx } from '../utils';

interface FieldChrome {
  label?: string;
  hint?: string;
  /** Fejltekst – viser feltet i fejltilstand */
  error?: string;
  /** Viser "(valgfri)" efter label */
  optional?: boolean;
}

function Label({ htmlFor, text, optional }: { htmlFor: string; text?: string; optional?: boolean }) {
  if (!text) return null;
  return (
    <label className="rs-field__label" htmlFor={htmlFor}>
      {text}
      {optional && <> <span className="rs-t-muted" style={{ fontWeight: 400 }}>(valgfri)</span></>}
    </label>
  );
}

export interface FieldProps extends FieldChrome, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon?: IconName;
  /** Tekst til højre i feltet, fx "kr." */
  suffix?: string;
  className?: string;
}

/** Tekstfelt med label, hjælpetekst, fejl, ikon og suffix. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, optional, icon, suffix, className, id, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = hint || error ? `${inputId}-hint` : undefined;
  const input = <input ref={ref} id={inputId} className="rs-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />;
  return (
    <div className={cx('rs-field', error && 'rs-field--error', icon && 'rs-field--icon', className)}>
      <Label htmlFor={inputId} text={label} optional={optional} />
      <div className="rs-field__control">
        {icon && <Icon name={icon} size={20} />}
        {suffix ? <div className="rs-input-affix">{input}<span>{suffix}</span></div> : input}
      </div>
      {(hint || error) && <span id={describedBy} className="rs-field__hint">{error ?? hint}</span>}
    </div>
  );
});

export interface SelectOption { value: string; label: string }
export interface SelectProps extends FieldChrome, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> {
  options?: Array<string | SelectOption>;
  /** Valgmuligheder i grupper (<optgroup>), fx underkategorier efter sektion – vises efter `options` */
  groups?: Array<{ label: string; options: Array<string | SelectOption> }>;
  /** Tekst i den deaktiverede første linje, når intet er valgt */
  placeholder?: string;
  /** Gør den tomme værdi valgbar med denne tekst, fx "Alle" i et filter (erstatter `placeholder`) */
  emptyOption?: string;
  className?: string;
}

const renderOption = (o: string | SelectOption) => {
  const opt = typeof o === 'string' ? { value: o, label: o } : o;
  return <option key={opt.value} value={opt.value}>{opt.label}</option>;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, optional, options = [], groups = [], placeholder = 'Vælg…', emptyOption, className, id, defaultValue, value, ...rest }, ref) {
  const auto = useId();
  const selectId = id ?? auto;
  const controlled = value !== undefined;
  return (
    <div className={cx('rs-field', error && 'rs-field--error', className)}>
      <Label htmlFor={selectId} text={label} optional={optional} />
      <select ref={ref} id={selectId} className="rs-select" aria-invalid={error ? true : undefined} {...(controlled ? { value } : { defaultValue: defaultValue ?? '' })} {...rest}>
        {emptyOption !== undefined ? <option value="">{emptyOption}</option> : <option value="" disabled>{placeholder}</option>}
        {options.map(renderOption)}
        {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map(renderOption)}</optgroup>)}
      </select>
      {(hint || error) && <span className="rs-field__hint">{error ?? hint}</span>}
    </div>
  );
});

export interface TextareaProps extends FieldChrome, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> { className?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, optional, className, id, ...rest }, ref) {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <div className={cx('rs-field', error && 'rs-field--error', className)}>
      <Label htmlFor={areaId} text={label} optional={optional} />
      <textarea ref={ref} id={areaId} className="rs-textarea" aria-invalid={error ? true : undefined} {...rest} />
      {(hint || error) && <span className="rs-field__hint">{error ?? hint}</span>}
    </div>
  );
});

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'className'> {
  /** Påkrævet: hvad slår kontakten til/fra? */
  label: string;
}

/** Til/fra-kontakt (role="switch"). */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle({ label, ...rest }, ref) {
  return (
    <span className="rs-toggle">
      <input ref={ref} type="checkbox" role="switch" aria-label={label} {...rest} />
      <i />
    </span>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'children'> { children: ReactNode }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ children, ...rest }, ref) {
  return (
    <label className="rs-check">
      <input ref={ref} type="checkbox" {...rest} />
      <span>{children}</span>
    </label>
  );
});

export interface OptionCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'title'> {
  title: string;
  description?: string;
  icon?: IconName;
  /** Højrejusteret tekst, fx pris */
  right?: ReactNode;
}

/** Valgkort (radio) – fx fragt- og betalingsmetode. Giv samme `name` til gruppen. */
export const OptionCard = forwardRef<HTMLInputElement, OptionCardProps>(function OptionCard({ title, description, icon, right, ...rest }, ref) {
  return (
    <label className="rs-optcard">
      <input ref={ref} type="radio" {...rest} />
      {icon && <span className="rs-lrow__icon"><Icon name={icon} size={22} /></span>}
      <span className="rs-grow">
        <span className="rs-t-bold" style={{ display: 'block' }}>{title}</span>
        {description && <span className="rs-t-small rs-t-muted">{description}</span>}
      </span>
      {right && <span className="rs-t-bold">{right}</span>}
    </label>
  );
});

export interface TabItem<T extends string = string> { value: T; label: ReactNode }
export interface TabsProps<T extends string = string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** segmented = pille-kontakt (Køb/Salg) · underline = faner (Annoncer/Anmeldelser) */
  variant?: 'segmented' | 'underline';
  className?: string;
  'aria-label'?: string;
}

/** Kontrolleret faner/segmenteret kontrol. */
export function Tabs<T extends string = string>({ items, value, onValueChange, variant = 'underline', className, ...rest }: TabsProps<T>) {
  return (
    <div role="tablist" className={cx(variant === 'segmented' ? 'rs-seg' : 'rs-tabs', className)} {...rest}>
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === value} onClick={() => onValueChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
