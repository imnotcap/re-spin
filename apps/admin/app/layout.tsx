import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: { default: 're:spin admin', template: '%s · re:spin admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await headers(); // dynamisk rendering → ny CSP-nonce pr. request
  return (
    <html lang="da">
      <body className="bg-sunken">{children}</body>
    </html>
  );
}
