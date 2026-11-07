import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/paths';
import { cx } from '../utils';

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> { icon?: IconName; warn?: boolean }

/** Info-boks (neutral) eller advarsel. */
export function Notice({ icon = 'shield', warn, className, children, ...rest }: NoticeProps) {
  return (
    <div className={cx('rs-notice', warn && 'rs-notice--warn', className)} {...rest}>
      <Icon name={icon} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function Progress({ value, className, ...rest }: { value: number; className?: string; 'aria-label'?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cx('rs-progress', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} {...rest}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

/** Trin-indikator: `step` af `total` */
export function Stepper({ step, total, className }: { step: number; total: number; className?: string }) {
  return (
    <div className={cx('rs-stepper', className)} role="img" aria-label={`Trin ${step} af ${total}`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < step ? 'rs-on' : undefined} />)}
    </div>
  );
}

export interface TimelineStep { title: string; description?: string; state?: 'done' | 'now' | 'todo' }

export function Timeline({ steps, className }: { steps: ReadonlyArray<TimelineStep>; className?: string }) {
  return (
    <ol className={cx('rs-timeline', className)}>
      {steps.map((s) => (
        <li key={s.title} className={s.state === 'done' ? 'rs-done' : s.state === 'now' ? 'rs-now' : undefined} aria-current={s.state === 'now' ? 'step' : undefined}>
          <i><Icon name="check" size={14} /></i>
          <b>{s.title}</b>
          {s.description && <span>{s.description}</span>}
        </li>
      ))}
    </ol>
  );
}

export interface PriceSummaryProps {
  rows: ReadonlyArray<readonly [label: string, value: ReactNode]>;
  total?: readonly [label: string, value: ReactNode];
  className?: string;
}

export function PriceSummary({ rows, total, className }: PriceSummaryProps) {
  return (
    <div className={cx('rs-sum', className)}>
      {rows.map(([label, value]) => (
        <div key={label}><span className="rs-t-muted">{label}</span><span>{value}</span></div>
      ))}
      {total && <div className="rs-total"><span>{total[0]}</span><span>{total[1]}</span></div>}
    </div>
  );
}

export interface EmptyStateProps { icon?: IconName; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; /** Overskriftsniveau – brug 1, når tom-tilstanden er hele sidens indhold (fx 404) */ headingLevel?: 1 | 2 | 3 }

export function EmptyState({ icon = 'heart', title, description, action, className, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <div className={cx('rs-empty', className)}>
      <div className="rs-empty__icon"><Icon name={icon} size={40} /></div>
      <Heading className="rs-t-h2">{title}</Heading>
      {description && <p className="rs-t-muted">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx('rs-skeleton', className)} style={style} aria-hidden="true" />;
}
