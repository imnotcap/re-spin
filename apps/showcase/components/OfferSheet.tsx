'use client';

import { useState } from 'react';
import { BottomSheet, Button, Chip, Field, Notice, useToast } from '@respin/ui';
import { formatKr } from '@respin/ui/utils';
import type { Item } from '../lib/data';

export function OfferButton({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.round(item.price * 0.9)));
  const { toast } = useToast();
  return (
    <>
      <Button variant="outline" size="lg" style={{ flex: 1 }} onClick={() => setOpen(true)}>Byd</Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Giv et bud"
        footer={<Button size="lg" full onClick={() => { setOpen(false); toast('Bud sendt til sælger'); }}>Send bud</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="rs-t-small rs-t-muted">Udbudspris {formatKr(item.price)}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 10, 20].map((p) => (
              <Chip key={p} size="sm" onClick={() => setAmount(String(Math.round(item.price * (1 - p / 100))))}>{p === 0 ? 'Udbudspris' : `−${p} %`}</Chip>
            ))}
          </div>
          <Field label="Dit bud" suffix="kr." inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} hint="Sælger svarer typisk inden for en time" />
          <Notice icon="info">Dit bud er først bindende, når sælger accepterer.</Notice>
        </div>
      </BottomSheet>
    </>
  );
}
