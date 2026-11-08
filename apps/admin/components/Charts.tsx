import Link from 'next/link';
import type { ReactNode } from 'react';

const fmt = (n: number) => n.toLocaleString('da-DK');

/** Nøgletal med evt. udvikling i forhold til forrige periode */
export function Kpi({ label, value, note, href, alert, change }: { label: string; value: string; note?: ReactNode; href?: string; alert?: boolean; change?: number | null }) {
  const body = (
    <>
      <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`mt-1 text-[28px] font-bold leading-tight tabular-nums ${alert ? 'text-coral-600' : ''}`}>{value}</p>
      {(note || change != null) && (
        <p className="mt-0.5 text-small text-muted">
          {change != null && <span className={`mr-1.5 font-semibold ${change >= 0 ? 'text-forest' : 'text-coral-600'}`}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)} %</span>}
          {note}
        </p>
      )}
    </>
  );
  return href
    ? <Link href={href} className="block rounded-lg border border-line bg-surface p-4 hover:border-slate">{body}</Link>
    : <div className="rounded-lg border border-line bg-surface p-4">{body}</div>;
}

/** Procentvis ændring – null, hvis der ikke var noget at sammenligne med */
export const pctChange = (now: number, before: number): number | null => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

/** Søjler pr. dag med en tabel bagved for skærmlæsere */
export function Bars({ series, label, height = 96, tone = 'forest' }: { series: Array<{ day: string; value: number }>; label: string; height?: number; tone?: 'forest' | 'coral' | 'slate' }) {
  const max = Math.max(1, ...series.map((d) => d.value));
  const total = series.reduce((s, d) => s + d.value, 0);
  const color = tone === 'coral' ? 'bg-coral-600/80 group-hover:bg-coral-600' : tone === 'slate' ? 'bg-slate/70 group-hover:bg-slate' : 'bg-forest/80 group-hover:bg-forest';
  return (
    <figure>
      <figcaption className="flex items-baseline justify-between text-small"><span className="font-semibold">{label}</span><span className="tabular-nums text-muted">{fmt(total)} i alt</span></figcaption>
      <div aria-hidden="true" className="mt-3 flex items-end gap-[3px]" style={{ height }}>
        {series.map((d) => (
          <div key={d.day} className="group relative flex-1" title={`${d.day}: ${fmt(d.value)}`}>
            <div className={`rounded-t-sm ${color}`} style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * height)}px` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex justify-between text-caption text-muted"><span>{series[0]?.day.slice(5)}</span><span>i dag</span></div>
      <table className="sr-only"><caption>{label} pr. dag</caption><tbody>{series.map((d) => <tr key={d.day}><th scope="row">{d.day}</th><td>{d.value}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** To kurver over tid (fx sidevisninger og besøgende) som SVG */
export function Lines({ series, a, b, label }: { series: Array<{ day: string; a: number; b: number }>; a: string; b: string; label: string }) {
  const W = 640, H = 180, P = 6;
  const max = Math.max(1, ...series.flatMap((d) => [d.a, d.b]));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, series.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (k: 'a' | 'b') => series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const area = `${path('a')} L${x(series.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-4 text-small">
        <span className="font-semibold">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2 w-4 rounded-sm bg-forest" />{a}</span>
        <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-0.5 w-4 bg-coral-600" />{b}</span>
        <span className="ml-auto text-caption text-muted">højst {fmt(max)} pr. dag</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-44 w-full" preserveAspectRatio="none" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="var(--rs-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        <path d={area} fill="var(--rs-forest)" opacity="0.12" />
        <path d={path('a')} fill="none" stroke="var(--rs-forest)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={path('b')} fill="none" stroke="var(--rs-coral)" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden="true" className="mt-1 flex justify-between text-caption text-muted"><span>{series[0]?.day.slice(5)}</span><span>i dag</span></div>
      <table className="sr-only"><caption>{label}</caption><thead><tr><th>Dag</th><th>{a}</th><th>{b}</th></tr></thead>
        <tbody>{series.map((d) => <tr key={d.day}><th scope="row">{d.day}</th><td>{d.a}</td><td>{d.b}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Rangliste med vandrette søjler */
export function RankList({ rows, empty = 'Ingen data endnu.', unit }: { rows: Array<{ key: string; label: ReactNode; value: number; href?: string; note?: ReactNode }>; empty?: string; unit?: string }) {
  if (!rows.length) return <p className="text-small text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2"><span className="truncate">{r.label}</span>{r.note && <span className="shrink-0 text-caption text-muted">{r.note}</span>}</span>
            <span className="relative z-10 shrink-0 font-semibold tabular-nums">{fmt(r.value)}{unit ? ` ${unit}` : ''}</span>
            <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-sm bg-forest/10" style={{ width: `${(r.value / max) * 100}%` }} />
          </>
        );
        return (
          <li key={r.key}>
            {r.href
              ? <Link href={r.href} className="relative flex items-center gap-3 rounded-sm px-2 py-1.5 text-small hover:bg-sunken">{inner}</Link>
              : <div className="relative flex items-center gap-3 rounded-sm px-2 py-1.5 text-small">{inner}</div>}
          </li>
        );
      })}
    </ol>
  );
}
