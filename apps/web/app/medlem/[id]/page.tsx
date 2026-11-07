import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SELLERS, getSeller } from '../../../lib/catalog';
import { profilePath } from '../../../lib/profile-url';
import { BASE_PATH } from '../../../lib/site';

/** Gammel adresse (/medlem/<id>/) → profilens nye adresse (/@/<profilnavn>). Virker også uden server. */
export const dynamicParams = false;
export const generateStaticParams = () => SELLERS.map((s) => ({ id: s.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getSeller((await params).id);
  return s ? { title: s.name, robots: { index: false }, alternates: { canonical: profilePath(s.name) } } : {};
}

export default async function OldMemberPage({ params }: Props) {
  const s = getSeller((await params).id);
  if (!s) notFound();
  const to = `${BASE_PATH}${profilePath(s.name)}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <p className="text-body">Profilen er flyttet til <a className="font-semibold text-forest underline" href={to}>{to}</a>.</p>
    </div>
  );
}
