/** Links i chatbeskeder (kan bruges i browseren). */

/** http(s)-adresser og www.-adresser i en besked. Afsluttende tegnsætning (punktum, komma, parentes …) hører ikke med. */
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAIL = /[.,;:!?)\]}'"»]+$/;

export type Part = { text: string } | { text: string; href: string };

/** Del en besked op i tekst og links (ren funktion – testes separat). Kun http(s) bliver til links. */
export function splitLinks(body: string): Part[] {
  const out: Part[] = [];
  let last = 0;
  for (const m of body.matchAll(URL_RE)) {
    const raw = m[0].replace(TRAIL, '');
    const start = m.index ?? 0;
    if (start > last) out.push({ text: body.slice(last, start) });
    const href = raw.startsWith('www.') ? `https://${raw}` : raw;
    try {
      const u = new URL(href);
      if (u.protocol === 'http:' || u.protocol === 'https:') out.push({ text: raw, href: u.toString() });
      else out.push({ text: raw });
    } catch { out.push({ text: raw }); }
    last = start + raw.length;
  }
  if (last < body.length) out.push({ text: body.slice(last) });
  return out;
}

/** Er linket på Videro selv? (Så vises ingen advarsel.) */
export const isInternal = (href: string, host: string) => {
  try { const h = new URL(href).hostname.replace(/^www\./, ''); return h === host.replace(/^www\./, '').replace(/:\d+$/, ''); } catch { return false; }
};
