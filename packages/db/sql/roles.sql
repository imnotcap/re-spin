-- Mindste-privilegium-roller. Kør som migrator/ejer EFTER migrationerne.
-- Rollerne er NOLOGIN her: infrastrukturen opretter login-brugere (adgangskoder fra secret manager) og giver dem én rolle hver:
--   CREATE USER respin_web_app LOGIN PASSWORD '…' IN ROLE respin_web;
-- Pointen: hvis en app kompromitteres (SQL-injektion, lækket DATABASE_URL), kan angriberen kun det, appens rolle må.

CREATE ROLE respin_web NOLOGIN;     -- forbrugersitet + webhooks
CREATE ROLE respin_admin NOLOGIN;   -- admin-app (medarbejdere)
CREATE ROLE respin_worker NOLOGIN;  -- baggrundsjobs/outbox

GRANT USAGE ON SCHEMA public TO respin_web, respin_admin, respin_worker;

-- ---------- web ----------
GRANT SELECT, INSERT, UPDATE ON users, listings, listing_images, conversations, messages, offers TO respin_web;
GRANT SELECT, INSERT ON seller_profiles TO respin_web;
-- Web må ALDRIG selv sætte certificering (0,5 % gebyr) eller KYC-status – kun admin/system
GRANT UPDATE (stripe_account_id, payouts_enabled, kyc_status, stripe_requirements, stripe_disabled_reason, stripe_synced_at) ON seller_profiles TO respin_web;
GRANT UPDATE (status, attempts, run_after, last_error, done_at) ON outbox TO respin_web;  -- outbox køres fra cron i web-appen
GRANT SELECT, INSERT, DELETE ON favorites TO respin_web;
GRANT SELECT, INSERT, UPDATE ON listing_promotions TO respin_web;      -- fremhævning (købes af sælgeren selv)
GRANT SELECT, INSERT, UPDATE ON orders TO respin_web;
GRANT SELECT, INSERT ON order_events, ledger_transactions, outbox, reports TO respin_web;
GRANT INSERT ON ledger_entries, audit_log TO respin_web;
GRANT SELECT, INSERT, UPDATE ON stripe_events TO respin_web;
-- Kundeservice: kunden opretter sager og skriver beskeder; kan kun ændre status/ulæst på sagen
GRANT SELECT, INSERT ON support_cases, support_messages TO respin_web;
GRANT UPDATE (status, customer_unread, last_customer_at, resolved_at, updated_at, customer_notified_at) ON support_cases TO respin_web;
GRANT USAGE ON SEQUENCE support_cases_number_seq TO respin_web;

-- ---------- admin ----------
GRANT SELECT ON ALL TABLES IN SCHEMA public TO respin_admin;
GRANT UPDATE (status) ON users TO respin_admin;
GRANT UPDATE (status, moderation_status, moderation_note, moderated_by, moderated_at, category, subcategory, updated_at) ON listings TO respin_admin;
GRANT DELETE ON listings TO respin_admin;                                    -- permanent sletning af annoncer (uden ordrer)
GRANT SELECT, INSERT ON user_warnings TO respin_admin;                       -- advarsler: kun tilføjes
GRANT SELECT ON user_warnings TO respin_web;
GRANT UPDATE (seen_at) ON user_warnings TO respin_web;
GRANT INSERT, DELETE ON analytics_events TO respin_web;                      -- statistik uden cookies
GRANT SELECT (at, type, listing_id) ON analytics_events TO respin_web;       -- oprydning og visninger pr. annonce
GRANT SELECT, INSERT, DELETE ON analytics_salts TO respin_web;
GRANT UPDATE (status, handled_by, handled_at) ON reports TO respin_admin;
GRANT UPDATE (certified, certified_at) ON seller_profiles TO respin_admin;   -- kun admin-appen kan certificere
GRANT INSERT ON audit_log, order_events, ledger_transactions, outbox TO respin_admin;
GRANT INSERT ON ledger_entries TO respin_admin;
GRANT UPDATE ON orders TO respin_admin;
GRANT INSERT, UPDATE ON staff_users TO respin_admin;
-- Kundeservice og fire-øjne-godkendelser (beskeder kan kun tilføjes, aldrig ændres/slettes)
GRANT INSERT ON support_messages, admin_approvals TO respin_admin;
GRANT UPDATE (status, priority, assignee_id, last_staff_at, first_response_at, resolved_at, customer_unread, updated_at) ON support_cases TO respin_admin;
GRANT UPDATE (status, decided_by, decided_at, decision_note) ON admin_approvals TO respin_admin;

-- ---------- worker ----------
GRANT SELECT ON ALL TABLES IN SCHEMA public TO respin_worker;
GRANT UPDATE ON orders, outbox, stripe_events, listing_images, listings TO respin_worker;
GRANT INSERT ON order_events, ledger_transactions, ledger_entries, audit_log, outbox TO respin_worker;
GRANT UPDATE (stripe_account_id, payouts_enabled, kyc_status, stripe_requirements, stripe_disabled_reason, stripe_synced_at) ON seller_profiles TO respin_worker;

-- ---------- auth ----------
GRANT SELECT, INSERT, UPDATE ON user_passwords, sessions, auth_tokens TO respin_web;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO respin_web, respin_worker;
-- Admin kan se og tilbagekalde sessioner, men ALDRIG læse adgangskode-hashes eller engangstokens
-- (Tabel-rettigheder fra "GRANT SELECT ON ALL TABLES" ovenfor fjernes først – en kolonne-REVOKE er ikke nok)
REVOKE ALL ON user_passwords, auth_tokens, sessions FROM respin_admin, respin_worker;
GRANT SELECT (id, user_id, created_at, last_seen_at, expires_at, revoked_at, ip, user_agent) ON sessions TO respin_admin;
GRANT UPDATE (revoked_at) ON sessions TO respin_admin;

-- ---------- passkeys / MFA ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON webauthn_credentials, webauthn_challenges, mfa_totp, mfa_recovery_codes TO respin_web;
GRANT SELECT, INSERT, UPDATE ON mfa_pending TO respin_web;
-- Admin og worker må hverken se hemmeligheder, koder eller offentlige nøgler. (Support-nulstilling af MFA er et
-- højrisiko-flow for social engineering og skal bygges med fire-øjne + identitetstjek – ikke som en databaserettighed.)
REVOKE ALL ON webauthn_credentials, webauthn_challenges, mfa_totp, mfa_recovery_codes, mfa_pending FROM respin_admin, respin_worker;
GRANT SELECT (id, user_id, name, device_type, created_at, last_used_at) ON webauthn_credentials TO respin_admin;
GRANT SELECT (user_id, enabled_at) ON mfa_totp TO respin_admin;

-- ---------- sekvenser (bigserial) ----------
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO respin_web, respin_admin, respin_worker;

-- Belt and braces (udover append-only-triggers): ingen kan ændre eller slette historik
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log, ledger_entries, ledger_transactions, order_events FROM respin_web, respin_admin, respin_worker;
