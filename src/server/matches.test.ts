import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import { createGame } from "@/game/engine/createGame";
import { endGame } from "@/game/engine/endGame";
import type { GameState } from "@/game/model/game";
import type { PlayerId } from "@/game/model/ids";

/**
 * Persistence is only worth testing against a real database: the guarantees T24.4 asks for —
 * one atomic transition, a revision that rejects a stale write, a match nobody else can read —
 * are properties of Postgres, and a fake would prove nothing about them.
 *
 * So these run when a database is configured and are skipped when it is not, rather than being
 * mocked into something that always passes. Each test cleans up after itself; the two users are
 * created once and removed at the end, which cascades to everything they own.
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

describe.skipIf(!configured)("match persistence", () => {
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

  async function seats() {
    return [
      { userId: augustId, playerId: augustPlayerId },
      { userId: annaId, playerId: annaPlayerId },
    ] as const;
  }

  beforeAll(async () => {
    matches = await import("./matches");
    db = (await import("./db/client")).db;
    schema = await import("./db/schema");
    drizzle = await import("drizzle-orm");

    await db.insert(schema.user).values(
      [augustId, annaId, outsiderId].map((id) => ({
        id,
        name: id,
        email: `${id}@example.invalid`,
        emailVerified: false,
      })),
    );

    game = createGame({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
    });
    [augustPlayerId, annaPlayerId] = [game.players[0].id, game.players[1].id];
  });

  afterAll(async () => {
    if (!configured) return;
    await db
      .delete(schema.user)
      .where(drizzle.inArray(schema.user.id, [augustId, annaId, outsiderId]));
  });

  async function createActiveMatch() {
    return matches.createMatch({
      createdByUserId: augustId,
      configuration: CONFIGURATION,
      players: [...(await seats())] as [
        { userId: string; playerId: PlayerId },
        { userId: string; playerId: PlayerId },
      ],
      gameState: game,
    });
  }

  describe("creating a match", () => {
    it("stores the state, the seats and a first revision", async () => {
      const created = await createActiveMatch();

      expect(created.status).toBe("ACTIVE");
      expect(created.revision).toBe(1);
      expect(created.configurationId).toBe(SWEDISH_CONFIGURATION_ID);
      expect(created.gameState?.id).toBe(game.id);
      expect(created.players).toHaveLength(2);
    });

    it("is an invitation, with no game, until a state is given", async () => {
      const created = await matches.createMatch({
        createdByUserId: augustId,
        configuration: CONFIGURATION,
        players: [
          { userId: augustId, playerId: augustPlayerId },
          { userId: annaId, playerId: annaPlayerId },
        ],
      });

      expect(created.status).toBe("INVITED");
      expect(created.gameState).toBeUndefined();
      expect(created.currentActorUserId).toBeUndefined();
    });

    it("records whose turn it is, as a user rather than a player", async () => {
      const created = await createActiveMatch();

      const expected =
        game.currentPlayerId === augustPlayerId ? augustId : annaId;
      expect(created.currentActorUserId).toBe(expected);
    });

    it("refuses a match a single user plays both sides of", async () => {
      await expect(
        matches.createMatch({
          createdByUserId: augustId,
          configuration: CONFIGURATION,
          players: [
            { userId: augustId, playerId: augustPlayerId },
            { userId: augustId, playerId: annaPlayerId },
          ],
        }),
      ).rejects.toThrow(/two different users/);
    });

    it("refuses to store a state the engine would reject", async () => {
      await expect(
        matches.createMatch({
          createdByUserId: augustId,
          configuration: CONFIGURATION,
          players: [
            { userId: augustId, playerId: augustPlayerId },
            { userId: annaId, playerId: annaPlayerId },
          ],
          gameState: { ...game, version: 0 },
        }),
      ).rejects.toThrow(/would reject/);
    });
  });

  describe("reading a match", () => {
    it("is readable by both players", async () => {
      const created = await createActiveMatch();

      expect(
        await matches.loadMatchForUser(created.id, augustId),
      ).toBeDefined();
      expect(await matches.loadMatchForUser(created.id, annaId)).toBeDefined();
    });

    /*
     * `online-multiplayer.md` section 38: a match id is not authorization. A stranger who guesses
     * an id learns nothing — not even that the match exists.
     */
    it("is invisible to a user who does not play in it", async () => {
      const created = await createActiveMatch();

      expect(
        await matches.loadMatchForUser(created.id, outsiderId),
      ).toBeUndefined();
    });

    it("returns a state the engine can play on directly", async () => {
      const created = await createActiveMatch();

      const loaded = await matches.loadMatchForUser(created.id, augustId);

      expect(loaded?.gameState).toEqual(game);
    });
  });

  describe("saving a new state", () => {
    it("advances the revision and stores the new state", async () => {
      const created = await createActiveMatch();
      const passed = { ...game, consecutivePasses: 1 };

      const result = await matches.saveGameState({
        matchId: created.id,
        actingUserId: augustId,
        expectedRevision: created.revision,
        gameState: passed,
      });

      expect(result.outcome).toBe("SAVED");
      const loaded = await matches.loadMatchForUser(created.id, augustId);
      expect(loaded?.revision).toBe(created.revision + 1);
      expect(loaded?.gameState?.consecutivePasses).toBe(1);
      expect(loaded?.lastActionAt).toBeInstanceOf(Date);
    });

    /*
     * The double-click of `online-multiplayer.md` section 32: the second write must not score
     * twice, draw twice or advance two turns. It changes nothing at all.
     */
    it("rejects a second write at the same revision, and changes nothing", async () => {
      const created = await createActiveMatch();
      const first = { ...game, consecutivePasses: 1 };
      const second = { ...game, consecutivePasses: 2 };

      await matches.saveGameState({
        matchId: created.id,
        actingUserId: augustId,
        expectedRevision: created.revision,
        gameState: first,
      });

      const result = await matches.saveGameState({
        matchId: created.id,
        actingUserId: augustId,
        expectedRevision: created.revision,
        gameState: second,
      });

      expect(result).toEqual({
        outcome: "STALE_REVISION",
        currentRevision: created.revision + 1,
      });

      const loaded = await matches.loadMatchForUser(created.id, augustId);
      expect(loaded?.gameState?.consecutivePasses).toBe(1);
      expect(loaded?.revision).toBe(created.revision + 1);
    });

    it("refuses a user who does not play in the match, and writes nothing", async () => {
      const created = await createActiveMatch();

      const result = await matches.saveGameState({
        matchId: created.id,
        actingUserId: outsiderId,
        expectedRevision: created.revision,
        gameState: { ...game, consecutivePasses: 3 },
      });

      expect(result).toEqual({ outcome: "NOT_FOUND" });
      const loaded = await matches.loadMatchForUser(created.id, augustId);
      expect(loaded?.revision).toBe(created.revision);
      expect(loaded?.gameState?.consecutivePasses).toBe(0);
    });

    it("refuses a state that breaks the engine's invariants", async () => {
      const created = await createActiveMatch();

      const result = await matches.saveGameState({
        matchId: created.id,
        actingUserId: augustId,
        expectedRevision: created.revision,
        gameState: { ...game, version: 0 },
      });

      expect(result).toEqual({ outcome: "INVALID_STATE" });
      const loaded = await matches.loadMatchForUser(created.id, augustId);
      expect(loaded?.revision).toBe(created.revision);
    });

    it("reports a match that does not exist", async () => {
      const result = await matches.saveGameState({
        matchId: crypto.randomUUID(),
        actingUserId: augustId,
        expectedRevision: 1,
        gameState: game,
      });

      expect(result).toEqual({ outcome: "NOT_FOUND" });
    });

    it("follows the game to its end, and leaves nobody to act", async () => {
      const created = await createActiveMatch();
      const ended = endGame(game, game.currentPlayerId);
      expect(ended.success).toBe(true);
      if (!ended.success) return;

      const result = await matches.saveGameState({
        matchId: created.id,
        actingUserId: augustId,
        expectedRevision: created.revision,
        gameState: ended.state,
      });

      expect(result.outcome).toBe("SAVED");
      const loaded = await matches.loadMatchForUser(created.id, augustId);
      expect(loaded?.status).toBe("FINISHED");
      expect(loaded?.currentActorUserId).toBeUndefined();
    });
  });

  describe("the match list", () => {
    it("shows a user their own matches, and which pile each belongs in", async () => {
      const created = await createActiveMatch();
      const actorId =
        game.currentPlayerId === augustPlayerId ? augustId : annaId;
      const waitingId = actorId === augustId ? annaId : augustId;

      const forActor = await matches.listMatchesForUser(actorId);
      const forWaiting = await matches.listMatchesForUser(waitingId);

      expect(forActor.find((row) => row.id === created.id)?.category).toBe(
        "YOUR_TURN",
      );
      expect(forWaiting.find((row) => row.id === created.id)?.category).toBe(
        "WAITING_FOR_OPPONENT",
      );
    });

    it("does not show a user matches they do not play in", async () => {
      const created = await createActiveMatch();

      const forOutsider = await matches.listMatchesForUser(outsiderId);

      expect(forOutsider.find((row) => row.id === created.id)).toBeUndefined();
    });
  });
});
