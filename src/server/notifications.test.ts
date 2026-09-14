import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import { createGame } from "@/game/engine/createGame";
import { endGame } from "@/game/engine/endGame";
import type { GameState } from "@/game/model/game";
import { createHistoryEventId, type PlayerId } from "@/game/model/ids";

/**
 * Notifications are derived, so what is worth testing is the derivation: given a match in a
 * particular condition, does the right person get told the right thing (T30.1)?
 *
 * Like `matches.test.ts`, this runs against a real database and skips when none is configured.
 * A fake would be no use here for a specific reason: most of what a notification is made of comes
 * out of a query — which matches this user is in, whose turn it is, what their seat has seen —
 * and a stub of that would only be asserting that the test's own object literals are correct.
 *
 * The game states are crafted rather than played. A rejected move and a proposal awaiting review
 * are several real turns deep, and building them by playing would test the engine, which has its
 * own suite for exactly that; what matters here is that a state in that shape produces the right
 * notification.
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

describe.skipIf(!configured)("notifications", () => {
  let notifications: typeof import("./notifications");
  let matches: typeof import("./matches");
  let db: typeof import("./db/client").db;
  let schema: typeof import("./db/schema");
  let drizzle: typeof import("drizzle-orm");

  const augustId = `test-user-${crypto.randomUUID()}`;
  const annaId = `test-user-${crypto.randomUUID()}`;

  let game: GameState;
  let augustPlayerId: PlayerId;
  let annaPlayerId: PlayerId;

  function seats() {
    return [
      { userId: augustId, playerId: augustPlayerId },
      { userId: annaId, playerId: annaPlayerId },
    ] as [
      { userId: string; playerId: PlayerId },
      { userId: string; playerId: PlayerId },
    ];
  }

  /** A match in whatever condition the given state puts it in. */
  async function matchWith(gameState?: GameState, createdByUserId = augustId) {
    return matches.createMatch({
      createdByUserId,
      configuration: CONFIGURATION,
      players: seats(),
      gameState,
    });
  }

  /** The one notification this user has, which most of these tests expect exactly one of. */
  async function only(userId: string) {
    const list = await notifications.listNotificationsForUser(userId);
    expect(list).toHaveLength(1);
    return list[0]!;
  }

  beforeAll(async () => {
    notifications = await import("./notifications");
    matches = await import("./matches");
    db = (await import("./db/client")).db;
    schema = await import("./db/schema");
    drizzle = await import("drizzle-orm");

    await db.insert(schema.user).values(
      [
        { id: augustId, name: "August" },
        { id: annaId, name: "Anna" },
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
      .where(drizzle.inArray(schema.user.id, [augustId, annaId]));
  });

  // Each test starts from nothing waiting, so a count is about the match it just made.
  beforeEach(async () => {
    await db
      .delete(schema.match)
      .where(drizzle.inArray(schema.match.createdByUserId, [augustId, annaId]));
    await db
      .delete(schema.friendship)
      .where(
        drizzle.or(
          drizzle.inArray(schema.friendship.requesterUserId, [
            augustId,
            annaId,
          ]),
          drizzle.inArray(schema.friendship.addresseeUserId, [
            augustId,
            annaId,
          ]),
        ),
      );
  });

  describe("a turn that is owed", () => {
    it("tells the player whose turn it is, and nobody else", async () => {
      const state: GameState = {
        ...game,
        turnState: { type: "PLAYER_TURN", playerId: augustPlayerId },
      };
      await matchWith(state);

      const notification = await only(augustId);
      expect(notification.type).toBe("YOUR_TURN");
      expect(notification.otherUserName).toBe("Anna");

      expect(await notifications.listNotificationsForUser(annaId)).toEqual([]);
    });

    /*
     * The distinction DEC-025 drew for the match list, which matters twice as much here: telling
     * both players it is their turn would make the feed useless.
     */
    it("names the reviewer, not the proposer, while a word awaits a verdict", async () => {
      const state: GameState = {
        ...game,
        turnState: {
          type: "WAITING_FOR_OPPONENT_APPROVAL",
          proposingPlayerId: annaPlayerId,
          reviewingPlayerId: augustPlayerId,
        },
        history: {
          events: [
            {
              id: createHistoryEventId(),
              sequence: 0,
              type: "UNKNOWN_WORD_PROPOSED",
              playerId: annaPlayerId,
              payload: { words: ["KRAX"] },
            },
          ],
        },
      };
      await matchWith(state);

      const notification = await only(augustId);
      expect(notification.type).toBe("AWAITING_YOUR_REVIEW");
      // The word is the point: "Anna vill spela KRAX" is a different message from "your turn".
      expect(notification.words).toEqual(["KRAX"]);

      expect(await notifications.listNotificationsForUser(annaId)).toEqual([]);
    });
  });

  describe("a rejected move", () => {
    /*
     * The turn comes back to the proposer, so without this it is an ordinary `Din tur` — for a
     * turn the player believed they had already taken. This is the notification the match list
     * cannot give on its own, and the reason the feed reads the game's history at all.
     */
    it("says why the turn came back, rather than only that it did", async () => {
      const state: GameState = {
        ...game,
        turnState: { type: "PLAYER_TURN", playerId: augustPlayerId },
        history: {
          events: [
            {
              id: createHistoryEventId(),
              sequence: 0,
              type: "UNKNOWN_WORD_REJECTED",
              playerId: annaPlayerId,
              payload: {
                proposingPlayerId: augustPlayerId,
                reviewingPlayerId: annaPlayerId,
                words: ["BLUNK"],
              },
            },
          ],
        },
      };
      await matchWith(state);

      const notification = await only(augustId);
      expect(notification.type).toBe("MOVE_REJECTED");
      expect(notification.words).toEqual(["BLUNK"]);
    });

    it("is not reported to the player who did the rejecting", async () => {
      const state: GameState = {
        ...game,
        // Anna rejected August's word, so it is August's turn and Anna owes nothing.
        turnState: { type: "PLAYER_TURN", playerId: augustPlayerId },
        history: {
          events: [
            {
              id: createHistoryEventId(),
              sequence: 0,
              type: "UNKNOWN_WORD_REJECTED",
              playerId: annaPlayerId,
              payload: {
                proposingPlayerId: augustPlayerId,
                reviewingPlayerId: annaPlayerId,
                words: ["BLUNK"],
              },
            },
          ],
        },
      };
      await matchWith(state);

      expect(await notifications.listNotificationsForUser(annaId)).toEqual([]);
    });
  });

  describe("an invitation", () => {
    it("is reported to the person invited", async () => {
      await matchWith(undefined, annaId);

      const notification = await only(augustId);
      expect(notification.type).toBe("MATCH_INVITATION");
      expect(notification.otherUserName).toBe("Anna");
    });

    it("is not reported to the person who sent it", async () => {
      await matchWith(undefined, augustId);

      expect(await notifications.listNotificationsForUser(augustId)).toEqual(
        [],
      );
    });
  });

  describe("a finished match", () => {
    /*
     * Played to its end rather than created finished, because that is the only way a match
     * reaches FINISHED: `createMatch` stores ACTIVE or INVITED and nothing else, and the status
     * the feed reads is derived by `saveGameState` from the state it is given.
     */
    async function finishedMatch() {
      const record = await matchWith(game);
      const ended = endGame(game, augustPlayerId);
      if (!ended.success) throw new Error("Could not end the game");

      const saved = await matches.saveGameState({
        matchId: record.id,
        actingUserId: augustId,
        expectedRevision: record.revision,
        gameState: ended.state,
      });
      if (saved.outcome !== "SAVED") {
        throw new Error(`Could not finish the match: ${saved.outcome}`);
      }

      return { record: saved.match, state: ended.state };
    }

    it("is reported to both players, with the result from each side", async () => {
      const { state } = await finishedMatch();

      const forAugust = await only(augustId);
      const forAnna = await only(annaId);

      expect(forAugust.type).toBe("MATCH_FINISHED");
      expect(forAnna.type).toBe("MATCH_FINISHED");

      // Whatever the engine decided, the two sides must not both be told they won.
      if (state.status !== "FINISHED") throw new Error("Expected a result");
      const winners = state.result.winnerPlayerIds;
      const expected = (playerId: PlayerId) =>
        winners.length === 0
          ? "TIED"
          : winners.includes(playerId)
            ? "WON"
            : "LOST";

      expect(forAugust.outcome).toBe(expected(augustPlayerId));
      expect(forAnna.outcome).toBe(expected(annaPlayerId));
    });

    /*
     * The one thing that cannot be derived. Every other notification stops being true when the
     * player acts on it; a finished game is finished forever, and would be reported forever.
     */
    it("stops being reported once the player has opened it", async () => {
      const { record } = await finishedMatch();

      expect(await notifications.markMatchSeen(record.id, augustId)).toBe(true);

      expect(await notifications.listNotificationsForUser(augustId)).toEqual(
        [],
      );
      // Seen by one player is not seen by the other.
      expect(await notifications.listNotificationsForUser(annaId)).toHaveLength(
        1,
      );
    });

    it("is reported again if the match changes after it was seen", async () => {
      const { record } = await finishedMatch();
      await notifications.markMatchSeen(record.id, augustId);

      // Any later write bumps the revision past the one that was seen.
      await db
        .update(schema.match)
        .set({ revision: record.revision + 1 })
        .where(drizzle.eq(schema.match.id, record.id));

      expect(
        await notifications.listNotificationsForUser(augustId),
      ).toHaveLength(1);
    });
  });

  describe("marking a match seen", () => {
    /*
     * The same rule every other read follows: an id is not authorization, and a stranger is told
     * nothing rather than refused (`online-multiplayer.md` section 38).
     */
    it("changes nothing for a user who does not play in the match", async () => {
      const outsiderId = `test-user-${crypto.randomUUID()}`;
      await db.insert(schema.user).values({
        id: outsiderId,
        name: "Outsider",
        email: `${outsiderId}@example.invalid`,
        emailVerified: false,
        handle: `t${outsiderId.replaceAll("-", "").slice(-12)}`,
      });

      try {
        const record = await matchWith(game);
        expect(await notifications.markMatchSeen(record.id, outsiderId)).toBe(
          false,
        );
      } finally {
        await db
          .delete(schema.user)
          .where(drizzle.eq(schema.user.id, outsiderId));
      }
    });
  });

  describe("a friend request", () => {
    it("is reported to the person asked, and not to the asker", async () => {
      await db.insert(schema.friendship).values({
        requesterUserId: annaId,
        addresseeUserId: augustId,
        status: "PENDING",
      });

      const notification = await only(augustId);
      expect(notification.type).toBe("FRIEND_REQUEST");
      expect(notification.otherUserName).toBe("Anna");
      // A friend request is answered by naming the row, not a match.
      expect(notification.requestId).toBeDefined();
      expect(notification.matchId).toBeUndefined();

      expect(await notifications.listNotificationsForUser(annaId)).toEqual([]);
    });

    it("stops being reported once it is answered", async () => {
      await db.insert(schema.friendship).values({
        requesterUserId: annaId,
        addresseeUserId: augustId,
        status: "ACCEPTED",
      });

      expect(await notifications.listNotificationsForUser(augustId)).toEqual(
        [],
      );
    });
  });

  describe("counts", () => {
    it("adds up what the badges show", async () => {
      await matchWith({
        ...game,
        turnState: { type: "PLAYER_TURN", playerId: augustPlayerId },
      });
      await matchWith(undefined, annaId);
      await db.insert(schema.friendship).values({
        requesterUserId: annaId,
        addresseeUserId: augustId,
        status: "PENDING",
      });

      const counts = notifications.countByType(
        await notifications.listNotificationsForUser(augustId),
      );

      expect(counts.YOUR_TURN).toBe(1);
      expect(counts.MATCH_INVITATION).toBe(1);
      expect(counts.FRIEND_REQUEST).toBe(1);
      expect(counts.AWAITING_YOUR_REVIEW).toBe(0);
      expect(counts.MOVE_REJECTED).toBe(0);
      expect(counts.MATCH_FINISHED).toBe(0);
    });
  });
});
