import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatKr } from '@respin/ui/utils';

/** Varen, samtalen handler om: billede, titel og pris (linker til annoncen). `aside` står til højre, uden for linket. */
export function ListingHeader({ listing, forSale, note, aside }: {
  listing: { id: string; title: string; priceOre: number; image: string | null }; forSale: boolean; note?: string; aside?: ReactNode;
}) {
  return (
    <div className="-mt-2 flex items-center gap-3 rounded-lg border border-line p-3">
      <Link href={`/annonce/${listing.id}/`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
        {listing.image ? <img src={listing.image} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-md object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-md bg-stone-100" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold underline-offset-4 hover:underline">{listing.title}</span>
          <span className="block text-small text-muted">{[formatKr(listing.priceOre / 100), !forSale && 'ikke til salg længere', note].filter(Boolean).join(' · ')}</span>
        </span>
      </Link>
      {aside}
    </div>
  );
}
