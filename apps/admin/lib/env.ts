import 'server-only';
import { z } from 'zod';
import { csv, loadEnv } from '@respin/security';

const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ADMIN_ALLOWED_HOSTS: csv,
  ADMIN_IP_ALLOWLIST: csv,
  ADMIN_IP_ALLOWLIST_DISABLED: bool,
  ADMIN_IP_HEADER: z.enum(['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']).default('cf-connecting-ip'),
  ADMIN_TRUSTED_PROXIES: z.coerce.number().int().min(1).max(5).default(1),
  ACCESS_TEAM_DOMAIN: z.string().optional(),
  ACCESS_AUD: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  // KUN udvikling – afvises i produktion
  ADMIN_DEV_EMAIL: z.string().email().optional(),
  ADMIN_DEV_ROLE: z.enum(['support', 'moderator', 'finance', 'admin']).default('support')
}).superRefine((e, ctx) => {
  if (e.NODE_ENV !== 'production') return;
  const need = (ok: boolean, path: string, message: string) => { if (!ok) ctx.addIssue({ code: 'custom', path: [path], message }); };
  need(!!e.ACCESS_TEAM_DOMAIN && !!e.ACCESS_AUD, 'ACCESS_TEAM_DOMAIN', 'ACCESS_TEAM_DOMAIN og ACCESS_AUD er påkrævet i produktion');
  need(!!e.DATABASE_URL, 'DATABASE_URL', 'påkrævet i produktion');
  need(!e.ADMIN_DEV_EMAIL, 'ADMIN_DEV_EMAIL', 'må ikke være sat i produktion');
});

export type AdminEnv = z.infer<typeof schema>;
let cached: AdminEnv | undefined;
export const adminEnv = (): AdminEnv => (cached ??= loadEnv(schema));
