'use client';

import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Icon, Tabs } from '@respin/ui';
import { STEPS } from '../../lib/content';
import { SectionHeading } from '../SectionHeading';

type Role = 'seller' | 'buyer';

export function HowItWorks() {
  const [role, setRole] = useState<Role>('seller');
  return (
    <section aria-labelledby="saadan-title" id="saadan" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6">
      <SectionHeading id="saadan-title" eyebrow="Sådan virker det" title="Tre trin – uanset om du sælger eller køber" />
      <div className="mx-auto mt-8 max-w-sm">
        <Tabs<Role> variant="segmented" aria-label="Vælg rolle" value={role} onValueChange={setRole} items={[{ value: 'seller', label: 'Jeg vil sælge' }, { value: 'buyer', label: 'Jeg vil købe' }]} />
      </div>
      <div className="relative mt-10 min-h-[220px]" role="tabpanel" aria-label={role === 'seller' ? 'Sælger' : 'Køber'}>
        <AnimatePresence mode="wait" initial={false}>
          <m.ol
            key={role}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="grid gap-6 md:grid-cols-3"
          >
            {STEPS[role].map((s, i) => (
              <li key={s.title} className="rounded-lg border border-line bg-surface p-6 shadow-line">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-lime text-slate"><Icon name={s.icon} size={20} /></span>
                  <span className="text-small font-bold text-muted">Trin {i + 1}</span>
                </div>
                <h3 className="mt-4 text-h3">{s.title}</h3>
                <p className="mt-2 text-body text-slate-700">{s.text}</p>
              </li>
            ))}
          </m.ol>
        </AnimatePresence>
      </div>
    </section>
  );
}
