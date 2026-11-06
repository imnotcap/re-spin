'use client';

/** SpotlightCard indeholder sidens indhold (SEO) og renderes derfor på serveren, men i sin egen bid (code splitting). */
import dynamic from 'next/dynamic';

export const SpotlightCard = dynamic(() => import('./reactbits/SpotlightCard'), { ssr: true });
