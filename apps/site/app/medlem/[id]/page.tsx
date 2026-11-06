import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar, Breadcrumbs, CertifiedBadge, Icon, ProductGrid, Rating } from '@respin/ui';
import { ItemCard } from '../../../components/ItemCard';
import { SELLERS, getSeller, itemsBySeller, newest, toCard } from '../../../lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = () => SELLERS.map((s) => ({ id: s.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getSeller((await params).id);
  return s ? { title: `${s.name} – medlem`, description: `${s.name} fra ${s.city} sælger brugt tøj og ting på re:spin.` } : {};
}

export default async function MemberPage({ params }: Props) {
  const s = getSeller((await params).id);
  if (!s) notFound();
  const ids = new Set(itemsBySeller(s.id).map((i) => i.id));
  const items = newest().filter((i) => ids.has(i.id));
  const facts = [
    { icon: 'pin', text: s.city },
    { icon: 'clock', text: `Svarer typisk ${s.responds}` },
    { icon: 'package', text: `${s.sold} solgte varer` },
    { icon: 'user', text: `Medlem siden ${s.memberSince}` }
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: s.name }]} />
      <header className="mt-5 flex flex-col gap-5 rounded-xl bg-surface p-5 shadow-line sm:flex-row sm:items-center sm:p-7">
        <Avatar name={s.name} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-h1">{s.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Rating value={s.rating} count={`${s.reviews} anmeldelser`} />
            {s.certified && <CertifiedBadge />}
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 text-small text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f) => <li key={f.text} className="flex items-center gap-2"><Icon name={f.icon} size={16} className="text-muted" />{f.text}</li>)}
          </ul>
          {s.certified && <p className="mt-4 text-small text-muted">Certificeret sælger: identiteten er bekræftet, og der er mange gode handler bag sig.</p>}
        </div>
      </header>

      <section aria-labelledby="til-salg" className="mt-10">
        <h2 id="til-salg" className="mb-5 text-h2">Til salg <span className="font-normal text-muted">({items.length})</span></h2>
        <ProductGrid layout="responsive">{items.map((i) => <ItemCard key={i.id} item={toCard(i)} />)}</ProductGrid>
      </section>
    </div>
  );
}
