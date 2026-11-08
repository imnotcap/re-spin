CREATE TYPE "public"."promotion_kind" AS ENUM('listing', 'profile');--> statement-breakpoint
ALTER TABLE "listing_promotions" ALTER COLUMN "listing_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_promotions" ADD COLUMN "kind" "promotion_kind" DEFAULT 'listing' NOT NULL;--> statement-breakpoint
CREATE INDEX "promotions_profile_idx" ON "listing_promotions" USING btree ("seller_id","ends_at") WHERE "listing_promotions"."kind" = 'profile';--> statement-breakpoint
ALTER TABLE "listing_promotions" ADD CONSTRAINT "promotions_kind_target" CHECK (("listing_promotions"."kind" = 'listing') = ("listing_promotions"."listing_id" IS NOT NULL));