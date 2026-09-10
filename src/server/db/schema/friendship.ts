import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Where a friendship stands (`online-multiplayer.md` section 11, DEC-028).
 *
 * The section lists `BLOCKED` as a possible fourth status. It is deliberately absent: blocking is
 * a moderation feature with its own rules — what a blocked user may still see, whether they are
 * told — and Milestone 7 asks for none of it. Adding the value without those rules would be a
 * column nothing honours.
 *
 * `DECLINED` is kept rather than deleted, so that a declined request stops being pending for both
 * sides without the requester being told which of "declined" or "not yet answered" happened. A
 * later request between the same two people reuses the row (DEC-028).
 */
export const friendshipStatus = pgEnum("friendship_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
]);

export type FriendshipStatus = (typeof friendshipStatus.enumValues)[number];

/**
 * One row per pair of users, in whichever direction the first request went.
 *
 * The direction is kept because a pending request is inherently directed — one person is waiting
 * for the other, and only the addressee may accept. Once accepted, the direction stops meaning
 * anything: friendship is symmetric, and every read treats the pair as unordered.
 *
 * That is what the unique index enforces. Ordering the two ids with `least`/`greatest` makes
 * "August and Anna" and "Anna and August" the same key, so the database — not the application —
 * is what guarantees a pair cannot end up with two rows, including when both people send a
 * request at the same instant.
 */
export const friendship = pgTable(
  "friendship",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Who asked. Only meaningful while the status is `PENDING`. */
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Who was asked, and therefore the only user who may accept or decline. */
    addresseeUserId: text("addressee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: friendshipStatus("status").notNull().default("PENDING"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** When the addressee answered, as opposed to when the row last changed. */
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("friendship_pair_unique").on(
      sql`least(${table.requesterUserId}, ${table.addresseeUserId})`,
      sql`greatest(${table.requesterUserId}, ${table.addresseeUserId})`,
    ),
    // Incoming requests are read as "everything addressed to me", the friend list as "every
    // accepted row I appear in" — which needs both columns indexed, not just the pair.
    index("friendship_addressee_idx").on(table.addresseeUserId),
    index("friendship_requester_idx").on(table.requesterUserId),
    check(
      "friendship_not_self",
      sql`${table.requesterUserId} <> ${table.addresseeUserId}`,
    ),
  ],
);

export const friendshipRelations = relations(friendship, ({ one }) => ({
  requester: one(user, {
    fields: [friendship.requesterUserId],
    references: [user.id],
    relationName: "friendshipRequester",
  }),
  addressee: one(user, {
    fields: [friendship.addresseeUserId],
    references: [user.id],
    relationName: "friendshipAddressee",
  }),
}));
