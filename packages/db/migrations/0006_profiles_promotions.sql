CREATE TYPE "public"."promotion_package" AS ENUM('1d', '3d', '7d');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "listing_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"package" "promotion_package" NOT NULL,
	"price_ore" integer NOT NULL,
	"status" "promotion_status" DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_promotions_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "promotions_price_positive" CHECK ("listing_promotions"."price_ore" > 0),
	CONSTRAINT "promotions_paid_has_period" CHECK ("listing_promotions"."status" <> 'paid' OR ("listing_promotions"."starts_at" IS NOT NULL AND "listing_promotions"."ends_at" > "listing_promotions"."starts_at"))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_banner" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "listing_promotions" ADD CONSTRAINT "listing_promotions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_promotions" ADD CONSTRAINT "listing_promotions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promotions_active_idx" ON "listing_promotions" USING btree ("listing_id","ends_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_format" CHECK ("users"."username" IS NULL OR "users"."username" ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_profile_banner_len" CHECK ("users"."profile_banner" IS NULL OR char_length("users"."profile_banner") BETWEEN 1 AND 20);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bio_len" CHECK ("users"."bio" IS NULL OR char_length("users"."bio") <= 300);--> statement-breakpoint
-- Rettigheder til den nye tabel (roles.sql er kun kørt én gang ved opsætningen). Kun hvis rollerne findes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT SELECT, INSERT, UPDATE ON listing_promotions TO respin_web;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_admin') THEN
    GRANT SELECT, UPDATE (status) ON listing_promotions TO respin_admin;
  END IF;
END $$;
