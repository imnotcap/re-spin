'use client';

import { useState } from 'react';
import { ProductCard, ProductGrid, useToast } from '@respin/ui';
import { items } from '../lib/data';

/** Favoritter som lokal state + toast – viser kontrolleret ProductCard. */
export function HomeFeed() {
  const [favs, setFavs] = useState<Set<string | number>>(new Set([2]));
  const { toast } = useToast();
  return (
    <ProductGrid>
      {items.map((it) => (
        <ProductCard
          key={it.id}
          product={it}
          href={`/demo/item/${it.id}`}
          badge={it.condition === 'God men brugt' ? undefined : it.condition}
          favorite={favs.has(it.id)}
          onFavoriteChange={(on) => {
            setFavs((prev) => { const next = new Set(prev); if (on) next.add(it.id); else next.delete(it.id); return next; });
            toast(on ? 'Gemt i favoritter' : 'Fjernet fra favoritter', { icon: on ? 'heart' : 'close' });
          }}
        />
      ))}
    </ProductGrid>
  );
}
