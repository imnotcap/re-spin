'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import { RespinProvider, ToastProvider } from '@respin/ui';
import { SiteLink } from '../components/SiteLink';

// Motion-funktioner indlæses asynkront (mindre start-bundle); `m`-komponenter venter på dem.
const loadFeatures = () => import('./motion-features').then((m) => m.default);

/** Kit-links går via next/link (SiteLink: forsiden forhåndshentes ikke) (basePath til GitHub Pages håndteres automatisk). Al animation respekterer "reducer bevægelse". */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <RespinProvider linkComponent={SiteLink}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={loadFeatures}>
          <ToastProvider>{children}</ToastProvider>
        </LazyMotion>
      </MotionConfig>
    </RespinProvider>
  );
}
