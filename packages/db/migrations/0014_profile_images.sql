ALTER TABLE "users" ADD COLUMN "avatar_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banner_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_key_format" CHECK ("users"."avatar_key" IS NULL OR "users"."avatar_key" ~ '^profiles/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}[.]webp$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_banner_key_format" CHECK ("users"."banner_key" IS NULL OR "users"."banner_key" ~ '^profiles/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}[.]webp$');