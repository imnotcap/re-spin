'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import { RespinProvider } from '@respin/ui';

// Motion-funktioner indlæses asynkront (mindre start-bundle); `m`-komponenter venter på dem.
const loadFeatures = () => import('./motion-features').then((m) => m.default);

/** Kit-links går via next/link (basePath til GitHub Pages håndteres automatisk). Al animation respekterer "reducer bevægelse". */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <RespinProvider linkComponent={Link}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={loadFeatures}>{children}</LazyMotion>
      </MotionConfig>
    </RespinProvider>
  );
}
