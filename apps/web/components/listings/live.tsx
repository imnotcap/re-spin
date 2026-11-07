/**
 * Medlemmernes annoncer på forside, kategorier og søgning.
 * Denne fil er den STATISKE udgave (GitHub Pages): ingen database → intet at vise.
 * Server-bygget bruger i stedet live.server-impl.tsx via aliaset "@respin-live" i next.config.mjs.
 */
export interface LiveSectionProps { title: string; category?: string; limit?: number; id: string; className?: string }
export function LiveSection(_: LiveSectionProps): null { return null; }
export function LiveSearch(): null { return null; }
