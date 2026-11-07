/**
 * Medlemmernes annoncer på forside, kategorier og søgning.
 * Denne fil er den STATISKE udgave (GitHub Pages): ingen database → intet at vise.
 * Server-bygget bruger i stedet live.server-impl.tsx via aliaset "@respin-live" i next.config.mjs.
 */
export interface LiveSectionProps { title: import('react').ReactNode; category?: string; limit?: number; id: string; className?: string }
export function LiveSection(_: LiveSectionProps): null { return null; }
export function LiveSearch(): null { return null; }

/** Medlemsprofil fra databasen (kun server-bygget) – statisk: ingen medlemmer */
export async function MemberProfile(_: { name: string }): Promise<import('react').ReactNode | null> { return null; }
export async function memberMetadata(_: string): Promise<import('next').Metadata> { return {}; }
