CREATE TYPE "public"."friendship_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');--> statement-breakpoint
CREATE TABLE "friendship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_user_id" text NOT NULL,
	"addressee_user_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "friendship_not_self" CHECK ("friendship"."requester_user_id" <> "friendship"."addressee_user_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "handle" text;--> statement-breakpoint
-- Existing accounts predate handles (DEC-027), so each is given one before the column is
-- tightened: the local part of the address if that happens to be a legal handle, and a stable
-- generated one otherwise or where two accounts would derive the same handle. Nobody can change
-- a handle yet, so a derived one is permanent until that is built.
WITH candidates AS (
	SELECT
		"id",
		substr(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_]', '', 'g'), 1, 20) AS candidate
	FROM "user"
	WHERE "handle" IS NULL
), numbered AS (
	SELECT "id", candidate, row_number() OVER (PARTITION BY candidate ORDER BY "id") AS n
	FROM candidates
)
UPDATE "user" AS u
SET "handle" = CASE
		WHEN numbered.candidate ~ '^[a-z][a-z0-9_]{2,19}$' AND numbered.n = 1 THEN numbered.candidate
		ELSE 'spelare' || substr(md5(u."id"), 1, 8)
	END
FROM numbered
WHERE numbered."id" = u."id";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_addressee_user_id_user_id_fk" FOREIGN KEY ("addressee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friendship_pair_unique" ON "friendship" USING btree (least("requester_user_id", "addressee_user_id"),greatest("requester_user_id", "addressee_user_id"));--> statement-breakpoint
CREATE INDEX "friendship_addressee_idx" ON "friendship" USING btree ("addressee_user_id");--> statement-breakpoint
CREATE INDEX "friendship_requester_idx" ON "friendship" USING btree ("requester_user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_unique" UNIQUE("handle");