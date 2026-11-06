/** Fjerner hemmeligheder og persondata fra logs. Log aldrig rå requests, headers eller betalingsdata. */
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|set-cookie|api[-_]?key|signature|card|cvc|cvv|iban|account[-_]?number|cpr|session|credential|private/i;
const PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}/g, '[stripe-key]'],
  [/\bwhsec_[A-Za-z0-9]{8,}/g, '[stripe-webhook-secret]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, 'Bearer [redacted]'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[jwt]'],
  [/\b\d{6}-?\d{4}\b/g, '[cpr?]'],
  [/\b(?:\d[ -]?){13,19}\b/g, '[card?]']
];

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export function redactString(s: string): string {
  return PATTERNS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactForLog(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[redacted]' : redactForLog(v, depth + 1)]));
  }
  return value;
}
