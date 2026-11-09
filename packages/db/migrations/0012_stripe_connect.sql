ALTER TABLE "orders" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "stripe_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "stripe_disabled_reason" text;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "stripe_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id");--> statement-breakpoint
-- Rettigheder (mindste privilegium): web-appen synkroniserer sælgerens Stripe-status og kører ordre-timere/outbox fra cron
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT UPDATE (stripe_requirements, stripe_disabled_reason, stripe_synced_at) ON seller_profiles TO respin_web;
    GRANT UPDATE (status, attempts, run_after, last_error, done_at) ON outbox TO respin_web;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_worker') THEN
    GRANT UPDATE (stripe_requirements, stripe_disabled_reason, stripe_synced_at) ON seller_profiles TO respin_worker;
  END IF;
END $$;
