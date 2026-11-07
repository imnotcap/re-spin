-- Kategorier og stand som på hjemmesiden + underkategori.
-- Postgres kan ikke fjerne værdier fra en enum, så typerne genskabes. Eksisterende rækker oversættes.
ALTER TABLE "listings" ALTER COLUMN "category" TYPE text;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "condition" TYPE text;--> statement-breakpoint
DROP TYPE "public"."listing_category";--> statement-breakpoint
DROP TYPE "public"."listing_condition";--> statement-breakpoint
CREATE TYPE "public"."listing_category" AS ENUM('kvinder', 'maend', 'boern', 'sko', 'tasker', 'accessories', 'bolig', 'sport');--> statement-breakpoint
CREATE TYPE "public"."listing_condition" AS ENUM('new_with_tag', 'new_without_tag', 'very_good', 'good', 'satisfactory');--> statement-breakpoint
UPDATE "listings" SET "category" = CASE "category"
  WHEN 'vintage' THEN 'kvinder' WHEN 'gadestil' THEN 'maend' WHEN 'sneakers' THEN 'sko' WHEN 'born' THEN 'boern'
  WHEN 'smykker' THEN 'accessories' ELSE "category" END,
  "condition" = CASE "condition"
  WHEN 'like_new' THEN 'new_without_tag' WHEN 'almost_new' THEN 'very_good' WHEN 'used' THEN 'good' ELSE "condition" END;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "category" TYPE "public"."listing_category" USING "category"::"public"."listing_category";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "condition" TYPE "public"."listing_condition" USING "condition"::"public"."listing_condition";--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "subcategory" text;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_subcategory_len" CHECK ("listings"."subcategory" IS NULL OR char_length("listings"."subcategory") BETWEEN 1 AND 40);
