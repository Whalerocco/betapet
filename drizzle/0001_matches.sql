CREATE TYPE "public"."match_status" AS ENUM('INVITED', 'ACTIVE', 'FINISHED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "match_status" DEFAULT 'INVITED' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"game_state" jsonb,
	"configuration_id" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"current_actor_user_id" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_action_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_player" (
	"match_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"player_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_player_match_id_player_id_pk" PRIMARY KEY("match_id","player_id"),
	CONSTRAINT "match_player_user_unique" UNIQUE("match_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_current_actor_user_id_user_id_fk" FOREIGN KEY ("current_actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_current_actor_idx" ON "match" USING btree ("current_actor_user_id");--> statement-breakpoint
CREATE INDEX "match_status_idx" ON "match" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_player_user_idx" ON "match_player" USING btree ("user_id");