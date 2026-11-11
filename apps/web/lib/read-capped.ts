import 'server-only';

/** Læs body med et loft – stopper ved loftet i stedet for at læse alt ind først */
export async function readCapped(body: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array | 'too_large'> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); return 'too_large'; }
    parts.push(value);
  }
  const out = new Uint8Array(size); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
