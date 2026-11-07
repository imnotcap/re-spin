import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from './testing';

let exec: (sql: string) => Promise<unknown>, close: () => Promise<void>;
beforeAll(async () => {
  ({ exec, close } = await createTestDb());
  await exec(readFileSync(fileURLToPath(new URL('../sql/roles.sql', import.meta.url)), 'utf8'));
  await exec(`INSERT INTO users (id, email, email_normalized, display_name) VALUES ('11111111-1111-4111-8111-111111111111','a@x.dk','a@x.dk','A');
              INSERT INTO seller_profiles (user_id) VALUES ('11111111-1111-4111-8111-111111111111');
              INSERT INTO audit_log (actor_type, action) VALUES ('system','seed');`);
});
afterAll(async () => { await close(); });

/** Kør SQL som en given rolle; returnerer fejlbeskeden (eller null hvis det lykkedes) */
async function as(role: string, sql: string): Promise<string | null> {
  try { await exec(`SET ROLE ${role}; ${sql}`); return null; } catch (e) { return (e as Error).message; } finally { await exec('RESET ROLE'); }
}

describe('database-roller (mindste privilegium)', () => {
  it('web kan IKKE certificere en sælger (heller ikke ved SQL-injektion eller mass assignment)', async () => {
    expect(await as('respin_web', `UPDATE seller_profiles SET certified = true, certified_at = now()`)).toMatch(/permission denied/);
    expect(await as('respin_web', `UPDATE seller_profiles SET certified = true`)).toMatch(/permission denied/);
  });
  it('admin KAN certificere, men ikke ændre udbetalingskonto', async () => {
    expect(await as('respin_admin', `UPDATE seller_profiles SET certified = true, certified_at = now()`)).toBeNull();
    expect(await as('respin_admin', `UPDATE seller_profiles SET stripe_account_id = 'acct_evil'`)).toMatch(/permission denied/);
  });
  it('web kan ikke slette brugere eller annoncer, og ikke se medarbejdere', async () => {
    expect(await as('respin_web', `DELETE FROM users`)).toMatch(/permission denied/);
    expect(await as('respin_web', `DELETE FROM listings`)).toMatch(/permission denied/);
    expect(await as('respin_web', `SELECT * FROM staff_users`)).toMatch(/permission denied/);
  });
  it('ingen app-rolle kan ændre eller slette audit-log og ledger', async () => {
    for (const role of ['respin_web', 'respin_admin', 'respin_worker']) {
      expect(await as(role, `UPDATE audit_log SET action = 'x'`)).toMatch(/permission denied|append-only/);
      expect(await as(role, `DELETE FROM audit_log`)).toMatch(/permission denied|append-only/);
      expect(await as(role, `DELETE FROM ledger_entries`)).toMatch(/permission denied|append-only/);
    }
  });
  it('web kan skrive audit-log, men ikke læse den (en kompromitteret web-app kan ikke snage i den)', async () => {
    expect(await as('respin_web', `INSERT INTO audit_log (actor_type, action) VALUES ('user','test')`)).toBeNull();
    expect(await as('respin_web', `SELECT * FROM audit_log`)).toMatch(/permission denied/);
  });
  it('admin kan moderere annoncer, men ikke ændre priser', async () => {
    const uid = '11111111-1111-4111-8111-111111111111';
    await exec(`INSERT INTO listings (id, seller_id, title, category, condition, price_ore, shipping_size) VALUES ('22222222-2222-4222-8222-222222222222','${uid}','Testannonce','kvinder','good',10000,'small')`);
    expect(await as('respin_admin', `UPDATE listings SET moderation_status = 'rejected'`)).toBeNull();
    expect(await as('respin_admin', `UPDATE listings SET price_ore = 1`)).toMatch(/permission denied/);
  });
  it('admin kan ALDRIG læse adgangskode-hashes, engangstokens eller sessionstokens', async () => {
    expect(await as('respin_admin', `SELECT * FROM user_passwords`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT * FROM auth_tokens`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT token_hash FROM sessions`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT id, user_id, ip FROM sessions`)).toBeNull();
    expect(await as('respin_admin', `UPDATE sessions SET revoked_at = now()`)).toBeNull();
    expect(await as('respin_worker', `SELECT * FROM user_passwords`)).toMatch(/permission denied/);
  });
  it('admin kan se OM en bruger har MFA/passkeys (support), men aldrig hemmeligheder, koder eller nøgler', async () => {
    expect(await as('respin_admin', `SELECT secret_enc FROM mfa_totp`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT user_id, enabled_at FROM mfa_totp`)).toBeNull();
    expect(await as('respin_admin', `SELECT * FROM mfa_recovery_codes`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT public_key FROM webauthn_credentials`)).toMatch(/permission denied/);
    expect(await as('respin_admin', `SELECT name, last_used_at FROM webauthn_credentials`)).toBeNull();
    expect(await as('respin_admin', `UPDATE mfa_totp SET enabled_at = NULL`)).toMatch(/permission denied/);
    expect(await as('respin_worker', `SELECT * FROM mfa_pending`)).toMatch(/permission denied/);
  });
});
