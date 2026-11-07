/** Offentlig adresse for Vercel Blob udledt af tokenet (vercel_blob_rw_<store-id>_<hemmelighed>). Bruges af lageret og CSP'en. */
export function blobOriginFromToken(token: string | undefined): string | null {
  const m = token ? /^vercel_blob_rw_([A-Za-z0-9]+)_[A-Za-z0-9]+$/.exec(token) : null;
  return m ? `https://${m[1]!.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/**
 * Hvor annoncefotos hentes fra (til CSP img-src). Tom i udvikling: der serveres de fra siden selv.
 * Kun https – CSP'en afviser alt andet, og en ugyldig værdi her må aldrig kunne lægge hele siden ned.
 */
export function imageOrigin(env: Record<string, string | undefined> = process.env): string | null {
  if (env.BLOB_PUBLIC_BASE_URL) {
    try { const u = new URL(env.BLOB_PUBLIC_BASE_URL); return u.protocol === 'https:' ? u.origin : null; } catch { return null; }
  }
  return blobOriginFromToken(env.BLOB_READ_WRITE_TOKEN);
}
