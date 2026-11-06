/**
 * re:spin databaseskema (PostgreSQL).
 *
 * Principper:
 *  - Penge er `integer` i øre. CHECK-constraints sikrer interne sammenhænge (fx buyer_total = pris + gebyr + fragt).
 *  - Det vigtigste forsvar ligger i databasen, ikke kun i koden: ingen dobbeltsalg (partielt unikt index),
 *    ubalancerede ledger-transaktioner afvises ved commit, og audit-/ledger-/hændelsestabeller er append-only (triggers).
 *  - Alle id'er er uuid (ikke gættelige, forhindrer enumerering). Brugerinput gemmes som ren tekst.
 *  - Auth-bibliotekets egne tabeller (sessions/accounts/passkeys) tilføjes når auth-valget er truffet (se docs/platform/adr).
 */
import { sql } from 'drizzle-orm';
import { bigserial, boolean, check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CATEGORIES, CONDITIONS, ORDER_STATUSES, SHIPPING_SIZES } from '@respin/core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const kycStatus = pgEnum('kyc_status', ['none', 'pending', 'verified', 'rejected']);
export const listingStatus = pgEnum('listing_status', ['draft', 'active', 'reserved', 'sold', 'removed']);
export const moderationStatus = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);
export const listingCategory = pgEnum('listing_category', CATEGORIES);
export const listingCondition = pgEnum('listing_condition', CONDITIONS);
export const shippingSize = pgEnum('shipping_size', SHIPPING_SIZES);
export const scanStatus = pgEnum('scan_status', ['pending', 'clean', 'rejected']);
export const offerStatus = pgEnum('offer_status', ['pending', 'accepted', 'declined', 'expired', 'withdrawn']);
export const orderStatus = pgEnum('order_status', ORDER_STATUSES);
export const ledgerDirection = pgEnum('ledger_direction', ['debit', 'credit']);
export const stripeEventStatus = pgEnum('stripe_event_status', ['received', 'processed', 'failed', 'ignored']);
export const reportStatus = pgEnum('report_status', ['open', 'actioned', 'dismissed']);
export const reportTarget = pgEnum('report_target', ['listing', 'user', 'message']);
export const staffRole = pgEnum('staff_role', ['support', 'moderator', 'finance', 'admin']);

/* ------------------------------ Brugere ------------------------------ */
export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull(),
  /** Små bogstaver, trimmet – bruges til unikhed (forhindrer Mette@x.dk og mette@x.dk som to konti) */
  emailNormalized: text('email_normalized').notNull().unique(),
  displayName: text('display_name').notNull(),
  status: userStatus('status').notNull().default('active'),
  /** Login kræver bekræftet e-mail */
  emailVerifiedAt: ts('email_verified_at'),
  createdAt: createdAt(),
  deletedAt: ts('deleted_at')
}, (t) => [check('users_email_normalized_lower', sql`${t.emailNormalized} = lower(${t.emailNormalized})`)]);

export const sellerProfiles = pgTable('seller_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }),
  /** Certificeret sælger → 0,5 % gebyr. Sættes kun af systemet/staff, aldrig af brugeren. */
  certified: boolean('certified').notNull().default(false),
  certifiedAt: ts('certified_at'),
  stripeAccountId: text('stripe_account_id').unique(),
  payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
  kycStatus: kycStatus('kyc_status').notNull().default('none'),
  createdAt: createdAt()
}, (t) => [check('seller_certified_has_date', sql`${t.certified} = false OR ${t.certifiedAt} IS NOT NULL`)]);

/* ------------------------------ Annoncer ------------------------------ */
export const listings = pgTable('listings', {
  id: id(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: listingCategory('category').notNull(),
  brand: text('brand'),
  size: text('size'),
  condition: listingCondition('condition').notNull(),
  priceOre: integer('price_ore').notNull(),
  shippingSize: shippingSize('shipping_size').notNull(),
  status: listingStatus('status').notNull().default('draft'),
  moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check('listings_price_range', sql`${t.priceOre} BETWEEN 100 AND 10000000`),
  check('listings_title_len', sql`char_length(${t.title}) BETWEEN 3 AND 80`),
  index('listings_feed_idx').on(t.status, t.createdAt),
  index('listings_seller_idx').on(t.sellerId)
]);

export const listingImages = pgTable('listing_images', {
  /** Samme værdi som `imageKeys` i API'et: server-genereret uuid, aldrig et klient-filnavn */
  id: id(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  bytes: integer('bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  /** Billedet vises først, når det er behandlet (EXIF fjernet, omkodet) og scannet */
  scanStatus: scanStatus('scan_status').notNull().default('pending'),
  position: integer('position').notNull().default(0),
  createdAt: createdAt()
}, (t) => [check('listing_images_type', sql`${t.contentType} IN ('image/jpeg','image/png','image/webp')`), check('listing_images_size', sql`${t.bytes} BETWEEN 1 AND 15728640`)]);

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: createdAt()
}, (t) => [primaryKey({ columns: [t.userId, t.listingId] })]);

/* --------------------------- Samtaler og bud --------------------------- */
export const conversations = pgTable('conversations', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: createdAt()
}, (t) => [check('conversations_distinct_parties', sql`${t.buyerId} <> ${t.sellerId}`), uniqueIndex('conversations_unique').on(t.listingId, t.buyerId)]);

export const messages = pgTable('messages', {
  id: id(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  body: text('body').notNull(),
  /** Fra assessMessageRisk(): 'low' | 'medium' | 'high' */
  riskLevel: text('risk_level').notNull().default('low'),
  createdAt: createdAt()
}, (t) => [check('messages_body_len', sql`char_length(${t.body}) BETWEEN 1 AND 2000`), index('messages_conv_idx').on(t.conversationId, t.createdAt)]);

export const offers = pgTable('offers', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  amountOre: integer('amount_ore').notNull(),
  status: offerStatus('status').notNull().default('pending'),
  expiresAt: ts('expires_at').notNull(),
  createdAt: createdAt()
}, (t) => [check('offers_amount_range', sql`${t.amountOre} BETWEEN 100 AND 10000000`)]);

/* ------------------------------- Ordrer ------------------------------- */
const ACTIVE_ORDER = sql`status IN ('pending_payment','paid','shipped','delivered','disputed')`;

export const orders = pgTable('orders', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'restrict' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: orderStatus('status').notNull().default('pending_payment'),
  /** Beløb fastfryses ved oprettelse (computeOrderAmounts) og ændres aldrig */
  priceOre: integer('price_ore').notNull(),
  buyerFeeOre: integer('buyer_fee_ore').notNull(),
  sellerFeeOre: integer('seller_fee_ore').notNull(),
  shippingOre: integer('shipping_ore').notNull(),
  buyerTotalOre: integer('buyer_total_ore').notNull(),
  sellerPayoutOre: integer('seller_payout_ore').notNull(),
  sellerCertifiedAtOrder: boolean('seller_certified_at_order').notNull().default(false),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeTransferId: text('stripe_transfer_id').unique(),
  stripeChargeId: text('stripe_charge_id'),
  /** Optimistisk lås: opdateringer sker med WHERE version = $læst, så to samtidige overgange ikke begge vinder */
  version: integer('version').notNull().default(0),
  paymentExpiresAt: ts('payment_expires_at'),
  shipByAt: ts('ship_by_at'),
  autoCompleteAt: ts('auto_complete_at'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check('orders_distinct_parties', sql`${t.buyerId} <> ${t.sellerId}`),
  check('orders_amounts_nonneg', sql`${t.priceOre} > 0 AND ${t.buyerFeeOre} >= 0 AND ${t.sellerFeeOre} >= 0 AND ${t.shippingOre} >= 0`),
  check('orders_buyer_total', sql`${t.buyerTotalOre} = ${t.priceOre} + ${t.buyerFeeOre} + ${t.shippingOre}`),
  check('orders_seller_payout', sql`${t.sellerPayoutOre} = ${t.priceOre} - ${t.sellerFeeOre}`),
  /** Forhindrer dobbeltsalg: kun én aktiv ordre pr. annonce, også ved samtidige køb */
  uniqueIndex('orders_one_active_per_listing').on(t.listingId).where(ACTIVE_ORDER),
  index('orders_buyer_idx').on(t.buyerId),
  index('orders_seller_idx').on(t.sellerId),
  index('orders_status_idx').on(t.status)
]);

export const orderEvents = pgTable('order_events', {
  id: id(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  event: text('event').notNull(),
  fromStatus: orderStatus('from_status').notNull(),
  toStatus: orderStatus('to_status').notNull(),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: createdAt()
}, (t) => [index('order_events_order_idx').on(t.orderId, t.createdAt)]);

/* ------------------------------ Bogholderi ------------------------------ */
export const ledgerTransactions = pgTable('ledger_transactions', {
  id: id(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'restrict' }),
  kind: text('kind').notNull(),
  /** Unik pr. pengebevægelse (fx `payment_captured:<pi_id>`) → en retried webhook kan aldrig bogføre to gange */
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: createdAt()
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => ledgerTransactions.id, { onDelete: 'restrict' }),
  account: text('account').notNull(),
  direction: ledgerDirection('direction').notNull(),
  amountOre: integer('amount_ore').notNull(),
  createdAt: createdAt()
}, (t) => [check('ledger_entries_positive', sql`${t.amountOre} > 0`), index('ledger_entries_tx_idx').on(t.transactionId), index('ledger_entries_account_idx').on(t.account)]);

/* ------------------------------- Stripe ------------------------------- */
export const stripeEvents = pgTable('stripe_events', {
  /** Stripes event-id (evt_…). Primærnøglen er idempotens-låsen: samme event kan kun modtages én gang */
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  livemode: boolean('livemode').notNull(),
  payload: jsonb('payload').notNull(),
  status: stripeEventStatus('status').notNull().default('received'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: ts('processed_at')
}, (t) => [index('stripe_events_status_idx').on(t.status, t.receivedAt)]);

/* ----------------------- Moderation, staff og audit ----------------------- */
export const reports = pgTable('reports', {
  id: id(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  targetType: reportTarget('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  status: reportStatus('status').notNull().default('open'),
  handledBy: uuid('handled_by'),
  createdAt: createdAt(),
  handledAt: ts('handled_at')
}, (t) => [index('reports_open_idx').on(t.status, t.createdAt)]);

/** Medarbejdere. Identitet (SSO/MFA) kommer fra Cloudflare Access; rollen kommer herfra. Ingen adgangskoder her. */
export const staffUsers = pgTable('staff_users', {
  id: id(),
  email: text('email').notNull().unique(),
  role: staffRole('role').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt()
}, (t) => [check('staff_email_lower', sql`${t.email} = lower(${t.email})`)]);

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: createdAt()
}, (t) => [index('audit_actor_idx').on(t.actorType, t.actorId, t.createdAt), index('audit_target_idx').on(t.targetType, t.targetId)]);

/**
 * Outbox: eksterne handlinger (Stripe-overførsel/refundering) skrives i SAMME transaktion som ordre-ændringen og
 * udføres bagefter af en worker. `dedupe_key` + Stripes idempotensnøgle gør, at en handling aldrig udføres to gange.
 */
export const outboxStatus = pgEnum('outbox_status', ['pending', 'done', 'failed']);
export const outbox = pgTable('outbox', {
  id: id(),
  topic: text('topic').notNull(),
  payload: jsonb('payload').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
  status: outboxStatus('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),
  lastError: text('last_error'),
  createdAt: createdAt(),
  doneAt: ts('done_at')
}, (t) => [index('outbox_due_idx').on(t.status, t.runAfter)]);

/* --------------------------------- Auth --------------------------------- */
/**
 * Adgangskode-hash (Argon2id) i egen tabel: kommer aldrig med i en `SELECT * FROM users`,
 * og admin-rollen har slet ingen adgang til den (se sql/roles.sql).
 */
export const userPasswords = pgTable('user_passwords', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [check('user_passwords_argon2id', sql`${t.hash} LIKE '$argon2id$%'`)]);

/** Sessioner. Kun SHA-256 af tokenet gemmes – et læk af tabellen giver ikke adgang til nogen konto. */
export const sessions = pgTable('sessions', {
  id: id(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  /** Genbekræftet med adgangskode indtil – kræves før følsomme handlinger (step-up) */
  elevatedUntil: ts('elevated_until'),
  revokedAt: ts('revoked_at'),
  ip: text('ip'),
  userAgent: text('user_agent')
}, (t) => [index('sessions_user_idx').on(t.userId), check('sessions_token_hash_len', sql`char_length(${t.tokenHash}) = 64`)]);

export const authTokenPurpose = pgEnum('auth_token_purpose', ['verify_email', 'reset_password']);
/** Engangstokens (e-mailbekræftelse, nulstilling). Kun hash gemmes; korte levetider; kan kun bruges én gang. */
export const authTokens = pgTable('auth_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: authTokenPurpose('purpose').notNull(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: createdAt()
}, (t) => [index('auth_tokens_user_idx').on(t.userId, t.purpose)]);

/** Delt rate limiting (token bucket) på tværs af server-instanser. Nøglen er en hash – ingen IP/e-mail i klartekst. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  tokens: doublePrecision('tokens').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
});
