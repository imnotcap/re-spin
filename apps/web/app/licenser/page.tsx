import type { Metadata } from 'next';
import { Breadcrumbs } from '@respin/ui';

export const metadata: Metadata = { title: 'Licenser' };

const ITEMS = [
  { name: 'Fotos', license: 'Unsplash-licensen', note: 'Produkt-, kategori- og bannerfotos fra Unsplash (beskåret og komprimeret)', href: 'https://unsplash.com/license' },
  { name: 'React Bits', license: 'MIT + Commons Clause', note: 'Copyright © 2026 David Haz', href: 'https://github.com/DavidHDev/react-bits' },
  { name: 'Inter (skrifttype)', license: 'SIL Open Font License 1.1', note: 'Copyright © 2016 The Inter Project Authors', href: 'https://github.com/rsms/inter' },
  { name: 'Next.js', license: 'MIT', note: 'Copyright © Vercel, Inc.', href: 'https://github.com/vercel/next.js' },
  { name: 'React', license: 'MIT', note: 'Copyright © Meta Platforms, Inc. and affiliates', href: 'https://github.com/facebook/react' },
  { name: 'Motion', license: 'MIT', note: 'Copyright © Motion Division Limited', href: 'https://github.com/motiondivision/motion' }
] as const;

export default function LicensesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6">
      <Breadcrumbs items={[{ label: 'Forside', href: '/' }, { label: 'Licenser' }]} />
      <h1 className="mt-6 text-h1">Licenser</h1>
      <p className="mt-2 text-body text-muted">Siden bruger fotos, software og en skrifttype fra andre. Her er deres licenser.</p>
      <ul className="mt-6 divide-y divide-line rounded-lg bg-surface shadow-line">
        {ITEMS.map((i) => (
          <li key={i.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between">
            <span><a href={i.href} rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{i.name}</a><span className="block text-caption text-muted">{i.note}</span></span>
            <span className="text-small text-slate-700">{i.license}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
