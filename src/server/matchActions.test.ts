import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import type { TileId } from "@/game/model/ids";

import type { SessionUser } from "./session";

/**
 * The action layer end to end, against a real database: authenticate, authorize, load, run the
 * shared engine, persist atomically, return a player-safe view (`online-multiplayer.md`
 * section 5). Skipped when no database is configured, like the rest of the server suite.
 *
 * The session is passed in directly rather than through a cookie: the routes are thin wrappers
 * that do nothing but read the session and map outcomes to status codes, and what is worth
 * testing is underneath them.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Nothing to load; the suite will skip if DATABASE_URL is absent.
}

const configured = Boolean(process.env.DATABASE_URL);

const CONFIGURATION = {
  configurationId: SWEDISH_CONFIGURATION_ID,
  rackSize: 7,
  modifiers: [],
  polyglotLanguages: [],
  wildLanguages: [],
} as const;

describe.skipIf(!configured)("match actions", () => {
  let actions: typeof import("./matchActions");
  let matches: typeof import("./matches");
  let db: typeof import("./db/client").db;
  let schema: typeof import("./db/schema");
  let drizzle: typeof import("drizzle-orm");

  const august: SessionUser = {
    id: `test-user-${crypto.randomUUID()}`,
    name: "August",
    email: `august-${crypto.randomUUID()}@example.invalid`,
  };
  const anna: SessionUser = {
    id: `test-user-${crypto.randomUUID()}`,
    name: "Anna",
    email: `anna-${crypto.randomUUID()}@example.invalid`,
  };
  const stranger: SessionUser = {
    id: `test-user-${crypto.randomUUID()}`,
    name: "Stranger",
    email: `stranger-${crypto.randomUUID()}@example.invalid`,
  };

  beforeAll(async () => {
    actions = await import("./matchActions");
    matches = await import("./matches");
    db = (await import("./db/client")).db;
    schema = await import("./db/schema");
    drizzle = await import("drizzle-orm");

    await db.insert(schema.user).values(
      [august, anna, stranger].map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        emailVerified: false,
      })),
    );
  });

  afterAll(async () => {
    if (!configured) return;
    await db
      .delete(schema.user)
      .where(
        drizzle.inArray(schema.user.id, [august.id, anna.id, stranger.id]),
      );
  });

  /** An invitation from August to Anna, accepted, so a game exists. */
  async function startedMatch() {
    const created = await actions.createMatch({
      user: august,
      opponentEmail: anna.email,
      configuration: CONFIGURATION,
    });
    if (created.outcome !== "OK") throw new Error(created.outcome);

    const accepted = await actions.acceptInvitation(anna, created.matchId);
    if (accepted.outcome !== "OK") throw new Error(accepted.outcome);

    return { matchId: created.matchId, accepted };
  }

  /** Whoever the engine decided starts, and the one who must wait. */
  async function turnHolders(matchId: string) {
    const record = await matches.loadMatchForUser(matchId, august.id);
    const actorId = record!.currentActorUserId;
    return {
      record: record!,
      actor: actorId === august.id ? august : anna,
      waiting: actorId === august.id ? anna : august,
    };
  }

  describe("creating a match", () => {
    it("invites an opponent by email, and starts no game yet", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("OK");
      if (created.outcome !== "OK") return;

      const record = await matches.loadMatchForUser(created.matchId, anna.id);
      expect(record?.status).toBe("INVITED");
      expect(record?.gameState).toBeUndefined();
    });

    it("reports an opponent who has no account", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: "nobody@example.invalid",
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("OPPONENT_NOT_FOUND");
    });

    it("refuses a match against oneself", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: august.email,
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("CANNOT_PLAY_ALONE");
    });
  });

  describe("accepting an invitation", () => {
    it("starts the game and returns the accepter's own view", async () => {
      const { accepted, matchId } = await startedMatch();
      if (accepted.outcome !== "OK") return;

      expect(accepted.view.ownRack.tileIds).toHaveLength(7);
      const record = await matches.loadMatchForUser(matchId, anna.id);
      expect(record?.status).toBe("ACTIVE");
      expect(record?.gameState?.status).toBe("ACTIVE");
    });

    it("seats each account as the player it was invited as", async () => {
      const { matchId } = await startedMatch();

      const record = await matches.loadMatchForUser(matchId, august.id);
      const playerIds = record!.gameState!.players.map((player) => player.id);
      for (const seat of record!.players) {
        expect(playerIds).toContain(seat.playerId);
      }
    });

    it("does not let the inviter accept on the opponent's behalf", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const result = await actions.acceptInvitation(august, created.matchId);

      expect(result.outcome).toBe("WRONG_MATCH_STATUS");
      const record = await matches.loadMatchForUser(created.matchId, anna.id);
      expect(record?.status).toBe("INVITED");
    });

    it("is invisible to a stranger", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      expect(
        (await actions.acceptInvitation(stranger, created.matchId)).outcome,
      ).toBe("NOT_FOUND");
    });
  });

  describe("declining an invitation", () => {
    it("cancels the match rather than deleting it", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      expect(
        (await actions.declineInvitation(anna, created.matchId)).outcome,
      ).toBe("OK");

      const record = await matches.loadMatchForUser(created.matchId, august.id);
      expect(record?.status).toBe("CANCELLED");
    });

    it("cannot be used on a match that has already started", async () => {
      const { matchId } = await startedMatch();

      const result = await actions.declineInvitation(anna, matchId);

      expect(result.outcome).toBe("WRONG_MATCH_STATUS");
    });

    it("is not something the inviter can do to their own invitation", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const result = await actions.declineInvitation(august, created.matchId);

      expect(result.outcome).toBe("WRONG_MATCH_STATUS");
    });
  });

  describe("reading a match", () => {
    it("shows a player their own rack and only a count of the opponent's", async () => {
      const { matchId } = await startedMatch();

      const result = await actions.matchViewFor(august, matchId);
      expect(result.outcome).toBe("OK");
      if (result.outcome !== "OK") return;

      expect(result.view.ownRack.tileIds).toHaveLength(7);
      expect(result.view.opponentRackCount).toBe(7);
      expect(result.view).not.toHaveProperty("tileBag");
      expect(JSON.stringify(result.view)).not.toContain("tileBag");
    });

    it("tells a stranger nothing", async () => {
      const { matchId } = await startedMatch();

      expect((await actions.matchViewFor(stranger, matchId)).outcome).toBe(
        "NOT_FOUND",
      );
    });
  });

  describe("taking a turn", () => {
    it("passes, and hands the turn to the opponent", async () => {
      const { matchId } = await startedMatch();
      const { record, actor, waiting } = await turnHolders(matchId);

      const result = await actions.performTurn({
        user: actor,
        matchId,
        expectedRevision: record.revision,
        action: { type: "PASS" },
      });

      expect(result.outcome).toBe("OK");
      const after = await matches.loadMatchForUser(matchId, august.id);
      expect(after?.currentActorUserId).toBe(waiting.id);
      expect(after?.revision).toBe(record.revision + 1);
    });

    /*
     * Section 37's example, made concrete: acting out of turn is refused by the engine, and the
     * caller never had a way to claim to be the other player in the first place.
     */
    it("refuses a player acting out of turn, and writes nothing", async () => {
      const { matchId } = await startedMatch();
      const { record, waiting } = await turnHolders(matchId);

      const result = await actions.performTurn({
        user: waiting,
        matchId,
        expectedRevision: record.revision,
        action: { type: "PASS" },
      });

      expect(result.outcome).toBe("RULE_REJECTED");
      const after = await matches.loadMatchForUser(matchId, august.id);
      expect(after?.revision).toBe(record.revision);
    });

    it("refuses a stranger entirely", async () => {
      const { matchId } = await startedMatch();
      const { record } = await turnHolders(matchId);

      const result = await actions.performTurn({
        user: stranger,
        matchId,
        expectedRevision: record.revision,
        action: { type: "PASS" },
      });

      expect(result.outcome).toBe("NOT_FOUND");
    });

    /* Section 32: the double-click must not advance two turns. */
    it("applies a repeated submission once", async () => {
      const { matchId } = await startedMatch();
      const { record, actor } = await turnHolders(matchId);

      const first = await actions.performTurn({
        user: actor,
        matchId,
        expectedRevision: record.revision,
        action: { type: "PASS" },
      });
      const second = await actions.performTurn({
        user: actor,
        matchId,
        expectedRevision: record.revision,
        action: { type: "PASS" },
      });

      expect(first.outcome).toBe("OK");
      expect(second).toEqual({
        outcome: "STALE_REVISION",
        currentRevision: record.revision + 1,
      });

      const after = await matches.loadMatchForUser(matchId, august.id);
      expect(after?.revision).toBe(record.revision + 1);
      expect(after?.gameState?.consecutivePasses).toBe(1);
    });

    it("exchanges tiles, keeping the rack the size it was", async () => {
      const { matchId } = await startedMatch();
      const { record, actor } = await turnHolders(matchId);

      const state = record.gameState!;
      const actorSeat = record.players.find(
        (seat) => seat.userId === actor.id,
      )!;
      const rack = state.players.find(
        (player) => player.id === actorSeat.playerId,
      )!.rack.tileIds;

      const result = await actions.performTurn({
        user: actor,
        matchId,
        expectedRevision: record.revision,
        action: { type: "EXCHANGE_TILES", tileIds: rack.slice(0, 2) },
      });

      expect(result.outcome).toBe("OK");
      if (result.outcome !== "OK") return;
      expect(result.view.ownRack.tileIds).toHaveLength(7);
    });

    /*
     * Section 19: editing stays on the player's device and only the finished placement is sent,
     * so the server must independently validate that the tiles are the player's own. A tile from
     * the opponent's rack is exactly the case that check exists for.
     */
    it("refuses a placement of a tile the player does not hold", async () => {
      const { matchId } = await startedMatch();
      const { record, actor, waiting } = await turnHolders(matchId);

      const waitingSeat = record.players.find(
        (seat) => seat.userId === waiting.id,
      )!;
      const opponentTile = record.gameState!.players.find(
        (player) => player.id === waitingSeat.playerId,
      )!.rack.tileIds[0] as TileId;

      const result = await actions.performTurn({
        user: actor,
        matchId,
        expectedRevision: record.revision,
        action: {
          type: "SUBMIT_MOVE",
          placements: [
            { tileId: opponentTile, coordinate: { row: 7, column: 7 } },
          ],
        },
      });

      expect(result.outcome).toBe("RULE_REJECTED");
      const after = await matches.loadMatchForUser(matchId, august.id);
      expect(after?.revision).toBe(record.revision);
      expect(after?.gameState?.board.occupiedCells).toHaveLength(0);
    });

    it("refuses a turn on a match that has not started", async () => {
      const created = await actions.createMatch({
        user: august,
        opponentEmail: anna.email,
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const result = await actions.performTurn({
        user: august,
        matchId: created.matchId,
        expectedRevision: 1,
        action: { type: "PASS" },
      });

      expect(result.outcome).toBe("WRONG_MATCH_STATUS");
    });
  });
});
