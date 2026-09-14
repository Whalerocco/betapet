import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import { createGame } from "@/game/engine/createGame";
import type { GameState } from "@/game/model/game";
import type { PlayerId } from "@/game/model/ids";

/**
 * Chat within a match (T29.1), against a real database for the reason `matches.test.ts` gives:
 * the guarantees worth testing here — that a message reaches its match and nobody else's, that a
 * non-participant is told nothing, that messages come back in the order they were written — are
 * properties of the queries, and a fake would only prove the test's own fixtures right.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Nothing to load; the environment may already carry DATABASE_URL, or the suite will skip.
}

const configured = Boolean(process.env.DATABASE_URL);

const CONFIGURATION = {
  configurationId: SWEDISH_CONFIGURATION_ID,
  rackSize: 7,
  modifiers: [],
  polyglotLanguages: [],
  wildLanguages: [],
} as const;

describe.skipIf(!configured)("match chat", () => {
  let chat: typeof import("./chat");
  let matches: typeof import("./matches");
  let db: typeof import("./db/client").db;
  let schema: typeof import("./db/schema");
  let drizzle: typeof import("drizzle-orm");

  const augustId = `test-user-${crypto.randomUUID()}`;
  const annaId = `test-user-${crypto.randomUUID()}`;
  const outsiderId = `test-user-${crypto.randomUUID()}`;

  let game: GameState;
  let augustPlayerId: PlayerId;
  let annaPlayerId: PlayerId;
  let matchId: string;

  beforeAll(async () => {
    chat = await import("./chat");
    matches = await import("./matches");
    db = (await import("./db/client")).db;
    schema = await import("./db/schema");
    drizzle = await import("drizzle-orm");

    await db.insert(schema.user).values(
      [
        { id: augustId, name: "August" },
        { id: annaId, name: "Anna" },
        { id: outsiderId, name: "Outsider" },
      ].map((entry) => ({
        ...entry,
        email: `${entry.id}@example.invalid`,
        emailVerified: false,
        handle: `t${entry.id.replaceAll("-", "").slice(-12)}`,
      })),
    );

    game = createGame({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
    });
    [augustPlayerId, annaPlayerId] = [game.players[0]!.id, game.players[1]!.id];
  });

  afterAll(async () => {
    if (!configured) return;
    await db
      .delete(schema.user)
      .where(drizzle.inArray(schema.user.id, [augustId, annaId, outsiderId]));
  });

  beforeEach(async () => {
    await db
      .delete(schema.match)
      .where(drizzle.eq(schema.match.createdByUserId, augustId));

    const created = await matches.createMatch({
      createdByUserId: augustId,
      configuration: CONFIGURATION,
      players: [
        { userId: augustId, playerId: augustPlayerId },
        { userId: annaId, playerId: annaPlayerId },
      ],
      gameState: game,
    });
    matchId = created.id;
  });

  describe("sending and reading", () => {
    it("keeps messages in the order they were written", async () => {
      await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "Hej!",
      });
      await chat.sendMessage({
        matchId,
        senderUserId: annaId,
        text: "Hej själv.",
      });
      await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "Din tur.",
      });

      const messages = await chat.listMessagesForUser(matchId, augustId);

      expect(messages?.map((message) => message.text)).toEqual([
        "Hej!",
        "Hej själv.",
        "Din tur.",
      ]);
    });

    it("names the sender by their current display name, not a stored copy", async () => {
      await chat.sendMessage({ matchId, senderUserId: annaId, text: "Hej!" });

      await db
        .update(schema.user)
        .set({ name: "Anna B" })
        .where(drizzle.eq(schema.user.id, annaId));

      try {
        const messages = await chat.listMessagesForUser(matchId, augustId);
        expect(messages?.[0]?.senderName).toBe("Anna B");
      } finally {
        await db
          .update(schema.user)
          .set({ name: "Anna" })
          .where(drizzle.eq(schema.user.id, annaId));
      }
    });

    it("is read the same by both players", async () => {
      await chat.sendMessage({ matchId, senderUserId: augustId, text: "Hej!" });

      expect(await chat.listMessagesForUser(matchId, annaId)).toHaveLength(1);
      expect(await chat.listMessagesForUser(matchId, augustId)).toHaveLength(1);
    });
  });

  /*
   * `online-multiplayer.md` section 40: visible only to match participants. Section 38 decides
   * *how* a stranger is refused — with the same answer a match that does not exist gets, so that
   * an id cannot be used to learn a conversation is there.
   */
  describe("participants only", () => {
    it("shows nothing to a user who does not play in the match", async () => {
      await chat.sendMessage({ matchId, senderUserId: augustId, text: "Hej!" });

      expect(
        await chat.listMessagesForUser(matchId, outsiderId),
      ).toBeUndefined();
    });

    it("refuses a message from a user who does not play in the match", async () => {
      const result = await chat.sendMessage({
        matchId,
        senderUserId: outsiderId,
        text: "Släpp in mig",
      });

      expect(result.outcome).toBe("NOT_FOUND");
      expect(await chat.listMessagesForUser(matchId, augustId)).toEqual([]);
    });

    it("tells a stranger the same thing whether or not the match exists", async () => {
      const unknownMatch = crypto.randomUUID();

      expect(
        await chat.listMessagesForUser(unknownMatch, outsiderId),
      ).toBeUndefined();
      expect(
        await chat.listMessagesForUser(matchId, outsiderId),
      ).toBeUndefined();
    });
  });

  describe("what a message may be", () => {
    it("trims what was typed", async () => {
      await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "  Hej!  ",
      });

      const messages = await chat.listMessagesForUser(matchId, augustId);
      expect(messages?.[0]?.text).toBe("Hej!");
    });

    it("refuses a message that is only whitespace", async () => {
      const result = await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "   \n  ",
      });

      expect(result.outcome).toBe("EMPTY_MESSAGE");
      expect(await chat.listMessagesForUser(matchId, augustId)).toEqual([]);
    });

    it("refuses a message longer than the limit, and accepts one at it", async () => {
      const tooLong = await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "a".repeat(chat.MAX_MESSAGE_LENGTH + 1),
      });
      expect(tooLong.outcome).toBe("MESSAGE_TOO_LONG");

      const atLimit = await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "a".repeat(chat.MAX_MESSAGE_LENGTH),
      });
      expect(atLimit.outcome).toBe("OK");
    });

    /*
     * Nothing is escaped or stripped on the way in. Storing escaped text would be wrong for every
     * reader that is not HTML; safety is the rendering layer's job, and `MatchChat` is where it
     * is done (section 40).
     */
    it("stores text exactly as it was typed, markup and all", async () => {
      const text = '<script>alert("hej")</script> & <b>fet</b>';
      await chat.sendMessage({ matchId, senderUserId: augustId, text });

      const messages = await chat.listMessagesForUser(matchId, augustId);
      expect(messages?.[0]?.text).toBe(text);
    });

    it("keeps the line breaks somebody typed", async () => {
      await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "Rad ett\nRad två",
      });

      const messages = await chat.listMessagesForUser(matchId, augustId);
      expect(messages?.[0]?.text).toBe("Rad ett\nRad två");
    });
  });

  describe("separation from the game", () => {
    /*
     * `architecture.md` section 22 and DEC-030's lesson in one assertion: a message must not move
     * the match's revision, or saying something would invalidate a move the opponent had in
     * flight and they would be told "Motståndaren hann före".
     */
    it("does not touch the match's revision or its state", async () => {
      const before = await matches.loadMatchForUser(matchId, augustId);

      await chat.sendMessage({ matchId, senderUserId: augustId, text: "Hej!" });

      const after = await matches.loadMatchForUser(matchId, augustId);
      expect(after?.revision).toBe(before?.revision);
      expect(after?.currentActorUserId).toBe(before?.currentActorUserId);
      expect(after?.gameState?.id).toBe(before?.gameState?.id);
    });

    it("keeps each match's conversation to itself", async () => {
      const other = await matches.createMatch({
        createdByUserId: augustId,
        configuration: CONFIGURATION,
        players: [
          { userId: augustId, playerId: augustPlayerId },
          { userId: annaId, playerId: annaPlayerId },
        ],
        gameState: game,
      });

      await chat.sendMessage({
        matchId,
        senderUserId: augustId,
        text: "Första matchen",
      });
      await chat.sendMessage({
        matchId: other.id,
        senderUserId: augustId,
        text: "Andra matchen",
      });

      expect(
        (await chat.listMessagesForUser(matchId, augustId))?.map((m) => m.text),
      ).toEqual(["Första matchen"]);
      expect(
        (await chat.listMessagesForUser(other.id, augustId))?.map(
          (m) => m.text,
        ),
      ).toEqual(["Andra matchen"]);
    });
  });
});
