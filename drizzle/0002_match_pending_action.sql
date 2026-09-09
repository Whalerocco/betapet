CREATE TYPE "public"."match_pending_action" AS ENUM('PLAY', 'REVIEW');--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "pending_action" "match_pending_action";