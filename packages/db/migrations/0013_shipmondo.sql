ALTER TABLE "orders" ADD COLUMN "service_point" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipmondo_shipment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "labelless_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "label_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "label_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "sender_address" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipmondo_shipment_id_unique" UNIQUE("shipmondo_shipment_id");--> statement-breakpoint
-- Rettigheder: sælgeren gemmer sin afsenderadresse (web); worker kan også opdatere den
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT UPDATE (sender_address) ON seller_profiles TO respin_web;
  END IF;
END $$;
