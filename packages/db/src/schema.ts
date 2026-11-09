/**
 * Videro databaseskema (PostgreSQL).
 *
 * Principper:
 *  - Penge er `integer` i øre. CHECK-constraints sikrer interne sammenhænge (fx buyer_total = pris + gebyr + fragt).
 *  - Det vigtigste forsvar ligger i databasen, ikke kun i koden: ingen dobbeltsalg (partielt unikt index),
 *    ubalancerede ledger-transaktioner afvises ved commit, og audit-/ledger-/hændelsestabeller er append-only (triggers).
 *  - Alle id'er er uuid (ikke gættelige, forhindrer enumerering). Brugerinput gemmes som ren tekst.
 *  - Auth-bibliotekets egne tabeller (sessions/accounts/passkeys) tilføjes når auth-valget er truffet (se docs/platform/adr).
 */
import { sql } from 'drizzle-orm';
import { bigint, bigserial, boolean, check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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
  deletedAt: ts('deleted_at'),
  /** Offentligt profilnavn i adressen /@/<username>. Små bogstaver, tal, . _ - (3–30 tegn). Sættes første gang det skal bruges. */
  username: text('username').unique(),
  /** Valgt profilbanner (id fra appens faste liste) */
  profileBanner: text('profile_banner'),
  bio: text('bio')
}, (t) => [
  check('users_email_normalized_lower', sql`${t.emailNormalized} = lower(${t.emailNormalized})`),
  check('users_username_format', sql`${t.username} IS NULL OR ${t.username} ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'`),
  check('users_profile_banner_len', sql`${t.profileBanner} IS NULL OR char_length(${t.profileBanner}) BETWEEN 1 AND 20`),
  check('users_bio_len', sql`${t.bio} IS NULL OR char_length(${t.bio}) <= 300`)
]);

export const sellerProfiles = pgTable('seller_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }),
  /** Certificeret sælger → billigere fremhævning. Sættes kun af systemet/staff, aldrig af brugeren. */
  certified: boolean('certified').notNull().default(false),
  certifiedAt: ts('certified_at'),
  stripeAccountId: text('stripe_account_id').unique(),
  payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
  kycStatus: kycStatus('kyc_status').notNull().default('none'),
  /** Fra Stripe (account.updated): felter Stripe mangler for at kunne udbetale – vises for sælgeren. Aldrig selve oplysningerne. */
  stripeRequirements: jsonb('stripe_requirements').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** Stripes årsag til, at kontoen er begrænset (fx "requirements.past_due", "rejected.fraud") */
  stripeDisabledReason: text('stripe_disabled_reason'),
  stripeSyncedAt: ts('stripe_synced_at'),
  /** Afsenderadresse på fragtlabels (sælgerens egen, kun brugt til forsendelser) */
  senderAddress: jsonb('sender_address').$type<{ name: string; address1: string; zipcode: string; city: string; mobile: string }>(),
  createdAt: createdAt()
}, (t) => [check('seller_certified_has_date', sql`${t.certified} = false OR ${t.certifiedAt} IS NOT NULL`)]);

/* ------------------------------ Annoncer ------------------------------ */
export const listings = pgTable('listings', {
  id: id(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: listingCategory('category').notNull(),
  subcategory: text('subcategory'),
  brand: text('brand'),
  size: text('size'),
  condition: listingCondition('condition').notNull(),
  priceOre: integer('price_ore').notNull(),
  shippingSize: shippingSize('shipping_size').notNull(),
  status: listingStatus('status').notNull().default('draft'),
  moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
  /** Begrundelse fra en medarbejder ved afvisning/fjernelse – vises for sælgeren */
  moderationNote: text('moderation_note'),
  moderatedBy: uuid('moderated_by'),
  moderatedAt: ts('moderated_at'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check('listings_price_range', sql`${t.priceOre} BETWEEN 100 AND 10000000`),
  check('listings_title_len', sql`char_length(${t.title}) BETWEEN 3 AND 80`),
  check('listings_subcategory_len', sql`${t.subcategory} IS NULL OR char_length(${t.subcategory}) BETWEEN 1 AND 60`),
  check('listings_moderation_note_len', sql`${t.moderationNote} IS NULL OR char_length(${t.moderationNote}) BETWEEN 1 AND 500`),
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

/**
 * Købt fremhævning af en annonce (kind = 'listing') eller af sælgerens profil (kind = 'profile', listing_id er null).
 * Aktiv, når den er betalt og nu ligger mellem starts_at og ends_at.
 */
export const promotionPackage = pgEnum('promotion_package', ['1d', '3d', '7d']);
export const promotionKind = pgEnum('promotion_kind', ['listing', 'profile']);
export const promotionStatus = pgEnum('promotion_status', ['pending', 'paid', 'cancelled']);
export const listingPromotions = pgTable('listing_promotions', {
  id: id(),
  kind: promotionKind('kind').notNull().default('listing'),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  package: promotionPackage('package').notNull(),
  /** Pris fastfrosset ved køb */
  priceOre: integer('price_ore').notNull(),
  status: promotionStatus('status').notNull().default('pending'),
  /** Stripe Checkout-session (null ved testfremhævning uden betaling, kun uden for produktion) */
  stripeSessionId: text('stripe_session_id').unique(),
  startsAt: ts('starts_at'),
  endsAt: ts('ends_at'),
  createdAt: createdAt()
}, (t) => [
  check('promotions_price_positive', sql`${t.priceOre} > 0`),
  check('promotions_paid_has_period', sql`${t.status} <> 'paid' OR (${t.startsAt} IS NOT NULL AND ${t.endsAt} > ${t.startsAt})`),
  check('promotions_kind_target', sql`(${t.kind} = 'listing') = (${t.listingId} IS NOT NULL)`),
  index('promotions_active_idx').on(t.listingId, t.endsAt),
  index('promotions_profile_idx').on(t.sellerId, t.endsAt).where(sql`${t.kind} = 'profile'`)
]);

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
  createdAt: createdAt(),
  /** Seneste besked (sortering i indbakken og "ulæst") */
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  /** Hvornår hver part sidst har læst samtalen */
  buyerReadAt: ts('buyer_read_at'),
  sellerReadAt: ts('seller_read_at'),
  /** Hvornår hver part sidst fik en mail om nye beskeder (højst én pr. kvarter pr. samtale) */
  buyerNotifiedAt: ts('buyer_notified_at'),
  sellerNotifiedAt: ts('seller_notified_at')
}, (t) => [
  check('conversations_distinct_parties', sql`${t.buyerId} <> ${t.sellerId}`),
  uniqueIndex('conversations_unique').on(t.listingId, t.buyerId),
  index('conversations_buyer_idx').on(t.buyerId, t.lastMessageAt),
  index('conversations_seller_idx').on(t.sellerId, t.lastMessageAt)
]);

export const messages = pgTable('messages', {
  id: id(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  body: text('body').notNull(),
  /** Fra assessMessageRisk(): 'low' | 'medium' | 'high' */
  riskLevel: text('risk_level').notNull().default('low'),
  /** text = almindelig besked; offer/offer_accepted/offer_declined/offer_withdrawn = hændelser om et bud */
  kind: text('kind').notNull().default('text'),
  offerId: uuid('offer_id'),
  createdAt: createdAt()
}, (t) => [
  check('messages_body_len', sql`char_length(${t.body}) BETWEEN 1 AND 2000`),
  check('messages_kind', sql`${t.kind} IN ('text', 'offer', 'offer_accepted', 'offer_declined', 'offer_withdrawn')`),
  index('messages_conv_idx').on(t.conversationId, t.createdAt)
]);

export const offers = pgTable('offers', {
  id: id(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  amountOre: integer('amount_ore').notNull(),
  status: offerStatus('status').notNull().default('pending'),
  expiresAt: ts('expires_at').notNull(),
  createdAt: createdAt(),
  respondedAt: ts('responded_at')
}, (t) => [
  check('offers_amount_range', sql`${t.amountOre} BETWEEN 100 AND 10000000`),
  // Højst ét åbent bud ad gangen pr. køber og annonce
  uniqueIndex('offers_one_pending').on(t.listingId, t.buyerId).where(sql`${t.status} = 'pending'`)
]);

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
  /** Stripe Checkout-session (hostet betalingsside) – PaymentIntent kendes først, når køber betaler */
  stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
  /** Leveringsadresse fra betalingssiden (kun til sælgeren til forsendelsen) */
  shippingAddress: jsonb('shipping_address').$type<{ name: string; line1: string; line2?: string | null; postalCode: string; city: string; country: string; phone?: string | null }>(),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  shippedAt: ts('shipped_at'),
  deliveredAt: ts('delivered_at'),
  /** Mails om ordren er sendt (salg til sælger + kvittering til køber; afsendelse til køber) */
  paidNotifiedAt: ts('paid_notified_at'),
  /** Pakkeshop, køberen valgte ved købet (fra Shipmondo) */
  servicePoint: jsonb('service_point').$type<{ id: string; carrier: string; name: string; address: string; zipcode: string; city: string }>(),
  /** Forsendelse hos Shipmondo (label + sporing) */
  shipmondoShipmentId: text('shipmondo_shipment_id').unique(),
  labellessCode: text('labelless_code'),
  labelAttempts: integer('label_attempts').notNull().default(0),
  labelError: text('label_error'),
  /** Seneste sporingsstatus fra fragtfirmaet (vises for køber og sælger) */
  trackingStatus: text('tracking_status'),
  trackingUpdatedAt: ts('tracking_updated_at'),
  shippedNotifiedAt: ts('shipped_notified_at'),
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

/* ------------------------------ Advarsler ------------------------------ */
export const warningReason = pgEnum('warning_reason', ['prohibited_item', 'misleading', 'offensive', 'spam', 'off_platform', 'fraud', 'other']);

/** Advarsler fra en medarbejder til en bruger. Brugeren ser dem på sin konto; tre advarsler er et signal til at spærre. */
export const userWarnings = pgTable('user_warnings', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  reason: warningReason('reason').notNull(),
  message: text('message').notNull(),
  createdAt: createdAt(),
  seenAt: ts('seen_at')
}, (t) => [
  check('user_warnings_message_len', sql`char_length(${t.message}) BETWEEN 5 AND 1000`),
  index('user_warnings_user_idx').on(t.userId, t.createdAt)
]);

/* ------------------------------ Statistik (uden cookies) ------------------------------ */
/**
 * Hændelser til statistik: sidevisninger, annoncevisninger, klik, søgninger og favoritter.
 * Ingen cookies, ingen IP-adresser og ingen bruger-id'er. `visitor` er et hash af IP + browser + et tilfældigt
 * salt, der skiftes hver dag og slettes – det kan kun bruges til at tælle unikke besøgende samme dag.
 */
export const analyticsEvents = pgTable('analytics_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  type: text('type').notNull(),
  path: text('path').notNull(),
  listingId: uuid('listing_id'),
  category: text('category'),
  /** Søgeord eller klikmål (fx "sell_cta") */
  value: text('value'),
  /** Antal resultater ved søgning */
  num: integer('num'),
  referrerHost: text('referrer_host'),
  device: text('device').notNull(),
  visitor: text('visitor')
}, (t) => [
  check('analytics_type', sql`${t.type} IN ('pageview', 'listing_view', 'click', 'search', 'favorite', 'share')`),
  check('analytics_device', sql`${t.device} IN ('mobile', 'tablet', 'desktop')`),
  check('analytics_lengths', sql`char_length(${t.path}) <= 200 AND (${t.value} IS NULL OR char_length(${t.value}) <= 100) AND (${t.referrerHost} IS NULL OR char_length(${t.referrerHost}) <= 100) AND (${t.category} IS NULL OR char_length(${t.category}) <= 40) AND (${t.visitor} IS NULL OR ${t.visitor} ~ '^[0-9a-f]{16}$')`),
  index('analytics_at_idx').on(t.at),
  index('analytics_type_at_idx').on(t.type, t.at),
  index('analytics_listing_idx').on(t.listingId, t.type)
]);

/** Dagens salt til visitor-hashet. Gamle salte slettes, så hashes ikke kan genskabes. */
export const analyticsSalts = pgTable('analytics_salts', {
  day: text('day').primaryKey(),
  salt: text('salt').notNull(),
  createdAt: createdAt()
});

/** Medarbejdere. Identitet (SSO/MFA) kommer fra Cloudflare Access; rollen kommer herfra. Ingen adgangskoder her. */
export const staffUsers = pgTable('staff_users', {
  id: id(),
  email: text('email').notNull().unique(),
  role: staffRole('role').notNull(),
  /** Fornavn, som kunden ser i support-samtaler ("Signe fra Videro") */
  displayName: text('display_name'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt()
}, (t) => [
  check('staff_email_lower', sql`${t.email} = lower(${t.email})`),
  check('staff_display_name_len', sql`${t.displayName} IS NULL OR char_length(${t.displayName}) BETWEEN 1 AND 40`)
]);

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
  /** Hvordan sessionen blev oprettet: password | password+totp | password+recovery | passkey */
  authMethod: text('auth_method').notNull().default('password'),
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

/* ------------------------------ Passkeys / MFA ------------------------------ */
/** WebAuthn-legitimationer (passkeys). Kun den OFFENTLIGE nøgle gemmes – den private forlader aldrig brugerens enhed. */
export const webauthnCredentials = pgTable('webauthn_credentials', {
  /** Credential ID (base64url) fra autentikatoren */
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  /** Signaturtæller – falder den, kan nøglen være klonet */
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  transports: jsonb('transports').notNull().default([]),
  deviceType: text('device_type').notNull(),
  backedUp: boolean('backed_up').notNull().default(false),
  name: text('name').notNull(),
  createdAt: createdAt(),
  lastUsedAt: ts('last_used_at')
}, (t) => [index('webauthn_user_idx').on(t.userId)]);

export const webauthnPurpose = pgEnum('webauthn_purpose', ['register', 'login']);
/** Engangs-challenges (5 min.). Forbruges ved første brug, så et opfanget svar ikke kan genafspilles. */
export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: id(),
  challenge: text('challenge').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  purpose: webauthnPurpose('purpose').notNull(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: createdAt()
});

/** TOTP (authenticator-app). Hemmeligheden er krypteret (AES-256-GCM, bundet til bruger-id) – et DB-læk giver ikke koderne. */
export const mfaTotp = pgTable('mfa_totp', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  secretEnc: text('secret_enc').notNull(),
  /** null = opsætning påbegyndt, men ikke bekræftet med en kode */
  enabledAt: ts('enabled_at'),
  /** Sidst brugte tidstrin – samme kode kan ikke bruges to gange */
  lastUsedStep: bigint('last_used_step', { mode: 'number' }).notNull().default(0),
  createdAt: createdAt()
});

/** Gendannelseskoder (engangs). Kun SHA-256 gemmes; 80 bits entropi pr. kode. */
export const mfaRecoveryCodes = pgTable('mfa_recovery_codes', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull().unique(),
  usedAt: ts('used_at'),
  createdAt: createdAt()
}, (t) => [index('mfa_recovery_user_idx').on(t.userId)]);

/** Login hvor adgangskoden er godkendt, men anden faktor mangler (5 min., maks. 5 forsøg). */
export const mfaPending = pgTable('mfa_pending', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  usedAt: ts('used_at'),
  createdAt: createdAt()
}, (t) => [check('mfa_pending_attempts', sql`${t.attempts} BETWEEN 0 AND 5`)]);

/* ------------------------------ Kundeservice ------------------------------ */
export const SUPPORT_CATEGORIES = ['order', 'payment', 'account', 'listing', 'safety', 'other'] as const;
export const SUPPORT_STATUSES = ['open', 'pending_customer', 'resolved', 'closed'] as const;
export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const supportCategory = pgEnum('support_category', SUPPORT_CATEGORIES);
export const supportStatus = pgEnum('support_status', SUPPORT_STATUSES);
export const supportPriority = pgEnum('support_priority', SUPPORT_PRIORITIES);

/**
 * En henvendelse fra en kunde (sag). Samtalen ligger i support_messages. Kunden ser kun sine egne sager
 * (håndhæves i hver forespørgsel), medarbejdere ser alle. `number` er det korte sagsnummer kunden ser (#1001).
 */
export const supportCases = pgTable('support_cases', {
  id: id(),
  number: integer('number').generatedAlwaysAsIdentity({ startWith: 1001 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  subject: text('subject').notNull(),
  category: supportCategory('category').notNull(),
  status: supportStatus('status').notNull().default('open'),
  priority: supportPriority('priority').notNull().default('normal'),
  assigneeId: uuid('assignee_id').references(() => staffUsers.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  /** Seneste besked fra kunden (svartid måles herfra) og fra en medarbejder */
  lastCustomerAt: ts('last_customer_at'),
  lastStaffAt: ts('last_staff_at'),
  firstResponseAt: ts('first_response_at'),
  resolvedAt: ts('resolved_at'),
  /** Kunden har ulæste svar (vises som prik på Min konto) */
  customerUnread: boolean('customer_unread').notNull().default(false),
  /** Hvornår kunden sidst fik en mail om et svar */
  customerNotifiedAt: ts('customer_notified_at'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  check('support_subject_len', sql`char_length(${t.subject}) BETWEEN 3 AND 120`),
  index('support_cases_queue_idx').on(t.status, t.updatedAt),
  index('support_cases_user_idx').on(t.userId, t.updatedAt),
  index('support_cases_assignee_idx').on(t.assigneeId, t.status)
]);

export const supportMessages = pgTable('support_messages', {
  id: id(),
  caseId: uuid('case_id').notNull().references(() => supportCases.id, { onDelete: 'cascade' }),
  authorType: text('author_type').notNull(),
  /** users.id for kunden, staff_users.id for medarbejdere, NULL for systemet */
  authorId: uuid('author_id'),
  body: text('body').notNull(),
  /** Interne noter ses kun af medarbejdere */
  internal: boolean('internal').notNull().default(false),
  createdAt: createdAt()
}, (t) => [
  check('support_msg_author', sql`${t.authorType} IN ('customer', 'staff', 'system')`),
  check('support_msg_body_len', sql`char_length(${t.body}) BETWEEN 1 AND 4000`),
  check('support_msg_internal_staff', sql`NOT ${t.internal} OR ${t.authorType} = 'staff'`),
  index('support_messages_case_idx').on(t.caseId, t.createdAt)
]);

/* ------------------------------ Fire-øjne-godkendelser ------------------------------ */
export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

/**
 * Handlinger, der kræver en anden medarbejders godkendelse (fx refundering fra 1.000 kr.). Udføres først, når en
 * ANDEN medarbejder med samme rettighed har godkendt – databasen afviser, at samme person godkender sin egen.
 */
export const adminApprovals = pgTable('admin_approvals', {
  id: id(),
  permission: text('permission').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  amountOre: integer('amount_ore'),
  reason: text('reason').notNull(),
  requestedBy: uuid('requested_by').notNull().references(() => staffUsers.id, { onDelete: 'restrict' }),
  status: approvalStatus('status').notNull().default('pending'),
  decidedBy: uuid('decided_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
  decidedAt: ts('decided_at'),
  decisionNote: text('decision_note'),
  createdAt: createdAt()
}, (t) => [
  check('approvals_four_eyes', sql`${t.decidedBy} IS NULL OR ${t.decidedBy} <> ${t.requestedBy}`),
  check('approvals_reason_len', sql`char_length(${t.reason}) BETWEEN 5 AND 500`),
  check('approvals_decided', sql`(${t.status} = 'pending') = (${t.decidedBy} IS NULL)`),
  uniqueIndex('approvals_one_pending').on(t.action, t.targetId).where(sql`${t.status} = 'pending'`),
  index('approvals_status_idx').on(t.status, t.createdAt)
]);
