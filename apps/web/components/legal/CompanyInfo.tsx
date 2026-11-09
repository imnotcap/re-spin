import { LEGAL_ENTITY } from '../../lib/site';

const MISSING = 'offentliggøres før lancering';

/** Virksomhedsoplysninger (e-handelsloven § 7, DSA art. 11-12, GDPR art. 13) – bruges i vilkår og privatlivspolitik */
export function CompanyInfo() {
  const e = LEGAL_ENTITY;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
      <dt className="font-semibold">Virksomhed</dt><dd>{e.name ?? `Videro (${MISSING})`}</dd>
      <dt className="font-semibold">CVR-nr.</dt><dd>{e.cvr ?? MISSING}</dd>
      <dt className="font-semibold">Adresse</dt><dd>{e.address ?? MISSING}</dd>
      <dt className="font-semibold">E-mail</dt><dd>{e.email ? <a href={`mailto:${e.email}`}>{e.email}</a> : MISSING}</dd>
    </dl>
  );
}
