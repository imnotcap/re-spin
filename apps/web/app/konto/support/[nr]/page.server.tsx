import { notFound } from 'next/navigation';
import { Badge, Button, Notice } from '@respin/ui';
import { CATEGORY_LABEL, STATUS_LABEL, getCaseForUser } from '@respin/support';
import { AuthPage, linkCls } from '../../../../components/AuthPage';
import { Thread } from '../../../../components/support/Thread';
import { ReplyBox } from '../../../../components/support/ReplyBox';
import { AutoRefresh } from '../../../../components/support/AutoRefresh';
import { requireSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/server';
import { resolveAction } from '../../../../lib/support-actions';
import { STATUS_TONE } from '../../../../lib/support-labels';
import Link from 'next/link';

export const metadata = { title: 'Henvendelse', robots: { index: false } };

export default async function CasePage({ params, searchParams }: { params: Promise<{ nr: string }>; searchParams: Promise<{ ny?: string; loest?: string }> }) {
  const { nr } = await params;
  const n = /^\d{1,9}$/.test(nr) ? Number(nr) : -1;
  const current = await requireSession(`/konto/support/${n > 0 ? `${n}/` : ''}`);
  const c = n > 0 ? await getCaseForUser(getDb(), current.user.id, n) : null;
  if (!c) notFound();
  const sp = await searchParams;
  const canReply = c.status !== 'closed';
  return (
    <AuthPage width="page" title={c.subject} crumbs={[{ label: 'Min konto', href: '/konto/' }, { label: 'Kundeservice', href: '/konto/support/' }, { label: `#${c.number}` }]}>
      <p className="-mt-3 flex flex-wrap items-center gap-2 text-small text-muted">
        <span>#{c.number} · {CATEGORY_LABEL[c.category]}</span>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
      </p>
      {sp.ny && <Notice icon="check" role="status"><b>Tak – vi har modtaget din henvendelse.</b> Du får svar her, og der kommer en prik på Min konto, når vi har svaret.</Notice>}
      {sp.loest && <Notice icon="check" role="status">Sagen er markeret som løst. Skriv igen, hvis du får brug for hjælp – så åbner vi den.</Notice>}

      <section aria-label="Samtale" className="rounded-lg border border-line bg-sunken p-4 sm:p-5">
        <Thread messages={c.messages} />
      </section>

      {canReply ? (
        <>
          <ReplyBox nr={c.number} />
          {(c.status === 'open' || c.status === 'pending_customer') && (
            <form action={resolveAction} className="flex items-center gap-3 border-t border-line pt-4">
              <input type="hidden" name="nr" value={c.number} />
              <span className="text-small text-muted">Er dit spørgsmål besvaret?</span>
              <Button type="submit" size="sm" variant="outline" icon="check">Markér som løst</Button>
            </form>
          )}
          <AutoRefresh />
        </>
      ) : (
        <Notice icon="info">Sagen er lukket. <Link href="/konto/support/ny/" className={linkCls}>Opret en ny henvendelse</Link>, hvis du stadig har brug for hjælp.</Notice>
      )}
    </AuthPage>
  );
}
