import type { Db } from '@respin/db';
import type { CurrentSession, IssuedSession, LimitName, RequestContext } from './auth';
import type { PasswordHasher } from './password';

/** Fælles byggesten som createAuth deler med MFA- og passkey-modulerne. */
export interface Internals {
  db: Db;
  now: () => Date;
  appUrl: string;
  link: (path: string, token?: string) => string;
  limit: (name: LimitName, key: string) => Promise<boolean>;
  audit: (action: string, ctx: RequestContext, actorId: string | null, metadata?: Record<string, unknown>) => Promise<void>;
  send: (to: string, mail: { subject: string; text: string; html?: string }) => Promise<void>;
  createSession: (userId: string, ctx: RequestContext, elevated?: boolean, method?: string) => Promise<IssuedSession>;
  isElevated: (cur: CurrentSession) => boolean;
  hasher: PasswordHasher;
  mfaKey: Buffer | null;
  rpName: string;
}
