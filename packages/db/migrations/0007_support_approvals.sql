CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."support_category" AS ENUM('order', 'payment', 'account', 'listing', 'safety', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('open', 'pending_customer', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "admin_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"amount_ore" integer,
	"reason" text NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_four_eyes" CHECK ("admin_approvals"."decided_by" IS NULL OR "admin_approvals"."decided_by" <> "admin_approvals"."requested_by"),
	CONSTRAINT "approvals_reason_len" CHECK (char_length("admin_approvals"."reason") BETWEEN 5 AND 500),
	CONSTRAINT "approvals_decided" CHECK (("admin_approvals"."status" = 'pending') = ("admin_approvals"."decided_by" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "support_cases_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"category" "support_category" NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"priority" "support_priority" DEFAULT 'normal' NOT NULL,
	"assignee_id" uuid,
	"order_id" uuid,
	"listing_id" uuid,
	"last_customer_at" timestamp with time zone,
	"last_staff_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"customer_unread" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_cases_number_unique" UNIQUE("number"),
	CONSTRAINT "support_subject_len" CHECK (char_length("support_cases"."subject") BETWEEN 3 AND 120)
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"author_type" text NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_msg_author" CHECK ("support_messages"."author_type" IN ('customer', 'staff', 'system')),
	CONSTRAINT "support_msg_body_len" CHECK (char_length("support_messages"."body") BETWEEN 1 AND 4000),
	CONSTRAINT "support_msg_internal_staff" CHECK (NOT "support_messages"."internal" OR "support_messages"."author_type" = 'staff')
);
--> statement-breakpoint
ALTER TABLE "staff_users" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "admin_approvals" ADD CONSTRAINT "admin_approvals_requested_by_staff_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_approvals" ADD CONSTRAINT "admin_approvals_decided_by_staff_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assignee_id_staff_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_case_id_support_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."support_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_one_pending" ON "admin_approvals" USING btree ("action","target_id") WHERE "admin_approvals"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "admin_approvals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_cases_queue_idx" ON "support_cases" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "support_cases_user_idx" ON "support_cases" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "support_cases_assignee_idx" ON "support_cases" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "support_messages_case_idx" ON "support_messages" USING btree ("case_id","created_at");--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_display_name_len" CHECK ("staff_users"."display_name" IS NULL OR char_length("staff_users"."display_name") BETWEEN 1 AND 40);--> statement-breakpoint
-- Beskeder kan ikke redigeres bagefter (heller ikke af ejeren af databasen via appen)
CREATE TRIGGER support_messages_no_update BEFORE UPDATE ON support_messages FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
-- Rettigheder til de nye tabeller (roles.sql er kun kørt én gang ved opsætningen). Kun hvis rollerne findes.
-- Beskeder kan ikke ændres eller slettes af apps (kun tilføjes), så samtalen er et pålideligt forløb.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_web') THEN
    GRANT SELECT, INSERT ON support_cases, support_messages TO respin_web;
    GRANT UPDATE (status, customer_unread, last_customer_at, resolved_at, updated_at) ON support_cases TO respin_web;
    GRANT USAGE ON SEQUENCE support_cases_number_seq TO respin_web;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respin_admin') THEN
    GRANT SELECT ON support_cases, support_messages, admin_approvals TO respin_admin;
    GRANT INSERT ON support_messages, admin_approvals TO respin_admin;
    GRANT UPDATE (status, priority, assignee_id, last_staff_at, first_response_at, resolved_at, customer_unread, updated_at) ON support_cases TO respin_admin;
    GRANT UPDATE (status, decided_by, decided_at, decision_note) ON admin_approvals TO respin_admin;
  END IF;
END $$;
