ALTER TABLE "messages" DROP CONSTRAINT "messages_body_len";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_kind";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_image" CHECK (("messages"."kind" = 'image') = ("messages"."image_key" IS NOT NULL) AND ("messages"."image_key" IS NULL OR "messages"."image_key" ~ '^chat/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}[.]webp$'));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_len" CHECK (char_length("messages"."body") BETWEEN 1 AND 2000 OR ("messages"."kind" = 'image' AND char_length("messages"."body") = 0));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_kind" CHECK ("messages"."kind" IN ('text', 'image', 'offer', 'offer_accepted', 'offer_declined', 'offer_withdrawn'));