import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { match } from "./match";

/**
 * Messages within a match (T29.1; `online-multiplayer.md` sections 39-40).
 *
 * A table of its own, and that is the requirement rather than a preference: section 39 says chat
 * "is not part of `GameState`. It should be stored separately", and `architecture.md` section 22
 * says chat must not be part of the authoritative game-state transition system. Both come to the
 * same thing here — a message is written without the match's revision moving, so saying something
 * can never invalidate a move the opponent has in flight, and a chat write can never be a way to
 * reach the game.
 *
 * The shape is section 39's, field for field. What is deliberately absent is a sender's display
 * name: it is joined from `user` when messages are read, so a player who changes their name is
 * not left with a history attributed to somebody who no longer exists.
 */
export const chatMessage = pgTable(
  "chat_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),

    /**
     * Who wrote it. A message outlives neither its match nor its author: deleting an account
     * takes its messages with it, which is the same cascade every other table the user owns has.
     */
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /**
     * The message, stored exactly as the player typed it apart from trimming.
     *
     * Nothing is escaped or stripped on the way in. Escaping at the boundary would store text
     * that is wrong for every consumer that is not HTML, and would double-escape the moment
     * anything else read it; the rendering layer is what has to be safe, and React's default
     * escaping is what makes it so (section 40: "user-generated text must be safely rendered").
     */
    text: text("text").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Chat is only ever read as "this match's messages, oldest first" (section 40: chronological).
    index("chat_message_match_idx").on(table.matchId, table.createdAt),
  ],
);

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  match: one(match, {
    fields: [chatMessage.matchId],
    references: [match.id],
  }),
  sender: one(user, {
    fields: [chatMessage.senderUserId],
    references: [user.id],
  }),
}));
