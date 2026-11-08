CREATE TYPE "public"."warning_reason" AS ENUM('prohibited_item', 'misleading', 'offensive', 'spam', 'off_platform', 'fraud', 'other');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"listing_id" uuid,
	"category" text,
	"value" text,
	"num" integer,
	"referrer_host" text,
	"device" text NOT NULL,
	"visitor" text,
	CONSTRAINT "analytics_type" CHECK ("analytics_events"."type" IN ('pageview', 'listing_view', 'click', 'search', 'favorite', 'share')),
	CONSTRAINT "analytics_device" CHECK ("analytics_events"."device" IN ('mobile', 'tablet', 'desktop')),
	CONSTRAINT "analytics_lengths" CHECK (char_length("analytics_events"."path") <= 200 AND ("analytics_events"."value" IS NULL OR char_length("analytics_events"."value") <= 100) AND ("analytics_events"."referrer_host" IS NULL OR char_length("analytics_events"."referrer_host") <= 100) AND ("analytics_events"."category" IS NULL OR char_length("analytics_events"."category") <= 40) AND ("analytics_events"."visitor" IS NULL OR "analytics_events"."visitor" ~ '^[0-9a-f]{16}$'))
);
--> statement-breakpoint
CREATE TABLE "analytics_salts" (
	"day" text PRIMARY KEY NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"listing_id" uuid,
	"reason" "warning_reason" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "user_warnings_message_len" CHECK (char_length("user_warnings"."message") BETWEEN 5 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderation_note" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_at_idx" ON "analytics_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "analytics_type_at_idx" ON "analytics_events" USING btree ("type","at");--> statement-breakpoint
CREATE INDEX "analytics_listing_idx" ON "analytics_events" USING btree ("listing_id","type");--> statement-breakpoint
CREATE INDEX "user_warnings_user_idx" ON "user_warnings" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_moderation_note_len" CHECK ("listings"."moderation_note" IS NULL OR char_length("listings"."moderation_note") BETWEEN 1 AND 500);--> statement-breakpoint
-- Rettigheder (roles.sql er kun kørt én gang ved opsætningen). Kun hvis rollerne findes.
-- Advarsler kan kun tilføjes af admin – ikke ændres eller slettes – så forløbet er pålideligt. Brugeren kan kun markere dem som set.
-- Statistik: hjemmesiden skriver hændelser og rydder gamle op; admin læser.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT SELECT ON user_warnings TO respin_web;
    GRANT UPDATE (seen_at) ON user_warnings TO respin_web;
    GRANT INSERT, DELETE ON analytics_events TO respin_web;
    GRANT SELECT (at, type, listing_id) ON analytics_events TO respin_web;  -- oprydning og visninger pr. annonce (ingen besøgsdata)
    GRANT SELECT, INSERT, DELETE ON analytics_salts TO respin_web;
    GRANT USAGE ON SEQUENCE analytics_events_id_seq TO respin_web;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_admin') THEN
    GRANT SELECT, INSERT ON user_warnings TO respin_admin;
    GRANT SELECT ON analytics_events TO respin_admin;
    GRANT UPDATE (status, moderation_status, moderation_note, moderated_by, moderated_at, category, subcategory, updated_at) ON listings TO respin_admin;
    -- Permanent sletning (billeder følger med via ON DELETE CASCADE). Annoncer med ordrer kan ikke slettes (fremmednøgle).
    GRANT DELETE ON listings TO respin_admin;
  END IF;
END $$;
