/** Søgeparametre som "?a=1&b=2" til lister, der filtreres i browseren (Browse, søgning). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Server-tilstand: læs adressens parametre, så første HTML er filtreret. Statisk eksport: rør dem ikke
 * (det ville gøre siden dynamisk) – listen læser selv adressen i browseren.
 */
export async function serverQuery(searchParams: SearchParams): Promise<string | undefined> {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== '1') return undefined;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') p.set(k, v);
    else if (Array.isArray(v) && v[0] !== undefined) p.set(k, v[0]);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}
