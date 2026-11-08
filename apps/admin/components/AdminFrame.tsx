import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@respin/ui';
import { can, type Permission } from '@respin/security';
import { queueCounts } from '@respin/support';
import { db, type Staff } from '../lib/auth';
import { pendingApprovalCount } from '../lib/orders';
import { dashboardStats } from '../lib/people';

export type Section = 'overview' | 'support' | 'orders' | 'approvals' | 'users' | 'moderation' | 'audit' | 'fees';

const NAV: Array<{ id: Section; href: string; label: string; icon: IconName; perm?: Permission }> = [
  { id: 'overview', href: '/', label: 'Oversigt', icon: 'grid' },
  { id: 'support', href: '/support', label: 'Kundeservice', icon: 'chat', perm: 'support.handle' },
  { id: 'orders', href: '/orders', label: 'Ordrer', icon: 'package', perm: 'order.view' },
  { id: 'approvals', href: '/approvals', label: 'Godkendelser', icon: 'shield', perm: 'order.refund' },
  { id: 'users', href: '/users', label: 'Brugere', icon: 'user', perm: 'user.view' },
  { id: 'moderation', href: '/moderation', label: 'Moderation', icon: 'flag', perm: 'report.handle' },
  { id: 'audit', href: '/audit', label: 'Audit-log', icon: 'eye', perm: 'audit.view' },
  { id: 'fees', href: '/settings/fees', label: 'Gebyrer', icon: 'wallet', perm: 'fees.edit' }
];

export const ROLE_LABEL: Record<string, string> = { support: 'Kundeservice', moderator: 'Moderator', finance: 'Økonomi', admin: 'Administrator' };

/** Tal på menupunkterne: det, der venter på nogen */
async function badges(staff: Staff): Promise<Partial<Record<Section, number>>> {
  const d = db();
  if (!d) return {};
  const [q, approvals, st] = await Promise.all([
    can(staff.role, 'support.handle') ? queueCounts(d, staff.id) : null,
    can(staff.role, 'order.refund') ? pendingApprovalCount(d) : 0,
    can(staff.role, 'report.handle') ? dashboardStats(d) : null
  ]);
  return { support: q ? q.unassigned + q.mine : 0, approvals, moderation: st ? st.listings.pending + st.reports : 0 };
}

/** Ramme om alle admin-sider. Viser kun de menupunkter, medarbejderens rolle har adgang til. */
export async function AdminFrame({ staff, title, section, actions, crumbs, children }: {
  staff: Staff; title: string; section: Section; actions?: ReactNode; crumbs?: Array<{ label: string; href?: string }>; children: ReactNode;
}) {
  const nav = NAV.filter((n) => !n.perm || can(staff.role, n.perm));
  const count = await badges(staff);
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-sunken text-ink lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Link href="/" className="flex items-baseline gap-1.5 text-[19px] font-bold tracking-tight text-forest">Videro<span className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">admin</span></Link>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {nav.map((n) => {
              const active = n.id === section;
              const b = count[n.id] ?? 0;
              return (
                <li key={n.id}>
                  <Link href={n.href} aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-small font-semibold ${active ? 'bg-forest text-white' : 'text-slate-700 hover:bg-sunken hover:text-ink'}`}>
                    <Icon name={n.icon} size={18} />
                    <span className="flex-1">{n.label}</span>
                    {b > 0 && <span className={`min-w-6 rounded-pill px-1.5 text-center text-caption font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-coral-600 text-white'}`}>{b}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="hidden border-t border-line px-5 py-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-small font-semibold">{staff.name ?? staff.email}</p>
          <p className="truncate text-caption text-muted">{ROLE_LABEL[staff.role] ?? staff.role}{staff.name ? ` · ${staff.email}` : ''}</p>
        </div>
      </aside>
      <main id="indhold" className="min-w-0 px-4 py-6 sm:px-8">
        {crumbs && (
          <nav aria-label="Brødkrummer" className="mb-2 text-small text-muted">
            {crumbs.map((c, i) => (
              <span key={i}>{i > 0 && <span aria-hidden="true" className="mx-1.5">/</span>}{c.href ? <Link href={c.href} className="hover:text-ink hover:underline">{c.label}</Link> : <span className="text-ink">{c.label}</span>}</span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
          {actions}
        </div>
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}

/** Hvid flade med kant – grundelementet på admin-siderne */
export function Panel({ title, actions, children, className = '', pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="text-body font-bold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export const kr = (ore: number) => `${(ore / 100).toLocaleString('da-DK', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr.`;
export const when = (d: Date | null | undefined) => (d ? d.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' }) : '–');
/** "for 5 min. siden", "for 3 t. siden", "for 2 dage siden" */
export function ago(d: Date | null | undefined, now = Date.now()): string {
  if (!d) return '–';
  const m = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  if (m < 1) return 'lige nu';
  if (m < 60) return `for ${m} min. siden`;
  const h = Math.round(m / 60);
  if (h < 24) return `for ${h} t. siden`;
  const days = Math.round(h / 24);
  return `for ${days} ${days === 1 ? 'dag' : 'dage'} siden`;
}
