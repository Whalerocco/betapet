import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";

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
});
