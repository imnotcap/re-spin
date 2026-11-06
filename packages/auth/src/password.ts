import { hash, verify } from '@node-rs/argon2';
import { sha1Hex } from './crypto';

/** OWASP-anbefaling for Argon2id: m=19 MiB, t=2, p=1. Hæves når hardwaren tillader det (gamle hashes opgraderes ved login). */
export const ARGON2_PARAMS = { algorithm: 2 /* Argon2id */, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  needsRehash(hash: string): boolean;
}

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, ARGON2_PARAMS),
  verify: async (h, password) => { try { return await verify(h, password); } catch { return false; } },
  needsRehash: (h) => {
    const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(h);
    return !m || Number(m[1]) < ARGON2_PARAMS.memoryCost || Number(m[2]) < ARGON2_PARAMS.timeCost;
  }
};

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
const COMMON = ['password', 'passw0rd', 'adgangskode', 'kodeord', 'qwerty', 'respin', 'vinted', 'letmein', 'welcome', 'velkommen', 'sommer', 'vinter', 'iloveyou', 'abc123', '123456'];

export type PasswordProblem = 'too_short' | 'too_long' | 'too_common' | 'contains_email' | 'repetitive';

/**
 * Længde frem for kompleksitetskrav (NIST SP 800-63B): min. 12, maks. 128 tegn, ingen tvungne specialtegn.
 * Afviser åbenlyst svage og e-mail-baserede adgangskoder. Lækket-tjek sker separat (pwnedPasswordCount).
 */
export function checkPasswordPolicy(password: string, context: { email?: string } = {}): PasswordProblem | null {
  const length = [...password].length;
  if (length < PASSWORD_MIN) return 'too_short';
  if (length > PASSWORD_MAX) return 'too_long';
  const lower = password.toLowerCase();
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|abcdefghij)/.test(lower)) return 'repetitive';
  const local = context.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'contains_email';
  const stripped = lower.replace(/[^a-zæøå]/g, '');
  if (COMMON.some((c) => stripped === c || lower.startsWith(c) && lower.slice(c.length).replace(/[0-9!.?_-]/g, '') === '')) return 'too_common';
  return null;
}

export type PwnedChecker = (password: string) => Promise<number | null>;

/**
 * Have I Been Pwned "range"-API med k-anonymitet: kun de første 5 tegn af SHA-1 sendes; adgangskoden forlader aldrig serveren.
 * Returnerer antal læk, eller null hvis tjenesten ikke svarer (fail-open: login/tilmelding må ikke afhænge af en tredjepart).
 */
export function createPwnedChecker(opts: { fetch?: typeof fetch; timeoutMs?: number } = {}): PwnedChecker {
  const f = opts.fetch ?? fetch;
  return async (password) => {
    const digest = sha1Hex(password);
    const prefix = digest.slice(0, 5), suffix = digest.slice(5);
    try {
      const res = await f(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(opts.timeoutMs ?? 2_000) });
      if (!res.ok) return null;
      for (const line of (await res.text()).split('\n')) {
        const [s, count] = line.trim().split(':');
        if (s === suffix) return Number(count) || 0;
      }
      return 0;
    } catch {
      return null;
    }
  };
}
