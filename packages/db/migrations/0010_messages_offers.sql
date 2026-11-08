ALTER TABLE "conversations" ADD COLUMN "last_message_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "buyer_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "seller_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "buyer_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "seller_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "kind" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support_cases" ADD COLUMN "customer_notified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "conversations_buyer_idx" ON "conversations" USING btree ("buyer_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_seller_idx" ON "conversations" USING btree ("seller_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_one_pending" ON "offers" USING btree ("listing_id","buyer_id") WHERE "offers"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_kind" CHECK ("messages"."kind" IN ('text', 'offer', 'offer_accepted', 'offer_declined', 'offer_withdrawn'));--> statement-breakpoint
-- Hjemmesiden markerer, hvornår kunden har fået en mail om et svar fra kundeservice (kun den kolonne).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT UPDATE (customer_notified_at) ON support_cases TO respin_web;
  END IF;
END $$;
