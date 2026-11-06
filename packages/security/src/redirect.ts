/** Forhindrer åbne redirects (`/login?next=https://evil.example`). Kun relative stier på samme oprindelse accepteres. */
const CONTROL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']');
const BACKSLASH = '\\';

function hasUnsafeChars(value: string): boolean {
  return CONTROL.test(value) || value.includes(BACKSLASH) || value.startsWith('//');
}

export function safeRedirectPath(input: string | null | undefined, fallback = '/'): string {
  if (!input || typeof input !== 'string' || input.length > 2048) return fallback;
  if (!input.startsWith('/') || input.startsWith('//') || input.includes(BACKSLASH) || CONTROL.test(input)) return fallback;
  try {
    const base = 'https://base.invalid';
    const u = new URL(input, base);
    if (u.origin !== base) return fallback;
    // Kodede kontroltegn (%0d%0a, %00) og kodet backslash (%5c) har ingen legitim brug – afvises i dybden
    if (hasUnsafeChars(decodeURIComponent(u.pathname + u.search))) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
