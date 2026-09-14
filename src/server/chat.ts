import { and, asc, eq } from "drizzle-orm";

import { db } from "./db/client";
import { chatMessage, matchPlayer, user } from "./db/schema";

/**
 * Chat within a match (T29.1; `online-multiplayer.md` sections 39-40).
 *
 * Two boundaries shape this module, and both are requirements rather than preferences.
 *
 * Chat is not the game. Nothing here imports the engine, touches a `GameState`, or moves a
 * match's revision — `architecture.md` section 22 keeps chat out of the authoritative state
 * transition system, and the practical consequence is that saying something can never invalidate
 * a move the opponent has in flight, the way DEC-030 showed a stray write can.
 *
 * And a message is visible only to the match's participants (section 40). Like `matches.ts`,
 * that is folded into each query rather than checked beside it, so a match id alone can never be
 * enough to read or write a conversation; a non-participant is told what a stranger is always
 * told, which is nothing (section 38).
 */

/**
 * The longest message a player may send.
 *
 * A limit is needed because the column has none and the screen has to render whatever arrives.
 * This one is chosen to be generous for what chat within a word game is for — "bra drag", "spelar
 * imorgon" — while staying far short of anything that could be used to make a match's
 * conversation expensive to load.
 */
export const MAX_MESSAGE_LENGTH = 500;

export interface ChatMessage {
  readonly id: string;
  readonly matchId: string;
  readonly senderUserId: string;
  /**
   * The sender's display name, joined rather than stored: a player who changes their name should
   * not be left with a history attributed to a name that no longer exists.
   */
  readonly senderName: string;
  readonly text: string;
  readonly createdAt: Date;
}

export type SendMessageResult =
  | { readonly outcome: "OK"; readonly message: ChatMessage }
  /** No such match, or this user does not play in it — deliberately the same answer. */
  | { readonly outcome: "NOT_FOUND" }
  | { readonly outcome: "EMPTY_MESSAGE" }
  | { readonly outcome: "MESSAGE_TOO_LONG"; readonly maxLength: number };

/**
 * A match's messages, oldest first, for a user who plays in it (section 40: chronological).
 *
 * `undefined` rather than an empty list when the user is not a participant, so that "no messages
 * yet" and "not your match" cannot be confused by the caller — and so the endpoint can answer 404
 * for the second without the first looking like one.
 */
export async function listMessagesForUser(
  matchId: string,
  userId: string,
): Promise<readonly ChatMessage[] | undefined> {
  const [seat] = await db
    .select({ userId: matchPlayer.userId })
    .from(matchPlayer)
    .where(
      and(eq(matchPlayer.matchId, matchId), eq(matchPlayer.userId, userId)),
    )
    .limit(1);

  if (!seat) return undefined;

  return db
    .select({
      id: chatMessage.id,
      matchId: chatMessage.matchId,
      senderUserId: chatMessage.senderUserId,
      senderName: user.name,
      text: chatMessage.text,
      createdAt: chatMessage.createdAt,
    })
    .from(chatMessage)
    .innerJoin(user, eq(user.id, chatMessage.senderUserId))
    .where(eq(chatMessage.matchId, matchId))
    .orderBy(asc(chatMessage.createdAt));
}

/**
 * Sends a message to a match this user plays in.
 *
 * The seat check and the insert are one transaction, for the same reason every other write here
 * is: between deciding that somebody may write and writing, the thing that made it true could
 * stop being true.
 *
 * The text is trimmed and length-checked, and nothing else is done to it. It is not escaped,
 * stripped of markup, or filtered: storing escaped text would be wrong for every reader that is
 * not HTML, and safety is the rendering layer's job — which is where section 40's "user-generated
 * text must be safely rendered" is actually satisfied.
 *
 * Nothing here is allowed to depend on the match's status. A player may write before an
 * invitation is answered and after the game is over, which is what "match participants only"
 * says and all it says; inventing a rule that chat closes with the game would be inventing a
 * rule the specification does not have.
 */
export async function sendMessage(input: {
  readonly matchId: string;
  readonly senderUserId: string;
  readonly text: string;
}): Promise<SendMessageResult> {
  const text = input.text.trim();
  if (text.length === 0) return { outcome: "EMPTY_MESSAGE" };
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { outcome: "MESSAGE_TOO_LONG", maxLength: MAX_MESSAGE_LENGTH };
  }

  return db.transaction(async (tx) => {
    const [seat] = await tx
      .select({ userId: matchPlayer.userId })
      .from(matchPlayer)
      .where(
        and(
          eq(matchPlayer.matchId, input.matchId),
          eq(matchPlayer.userId, input.senderUserId),
        ),
      )
      .limit(1);

    if (!seat) return { outcome: "NOT_FOUND" } as const;

    const [sender] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, input.senderUserId))
      .limit(1);

    const [row] = await tx
      .insert(chatMessage)
      .values({
        matchId: input.matchId,
        senderUserId: input.senderUserId,
        text,
      })
      .returning();

    return {
      outcome: "OK",
      message: {
        id: row!.id,
        matchId: row!.matchId,
        senderUserId: row!.senderUserId,
        senderName: sender?.name ?? "",
        text: row!.text,
        createdAt: row!.createdAt,
      },
    } as const;
  });
}
