import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import { createGame } from "@/game/engine/createGame";
import type { GameState } from "@/game/model/game";
import { playerTurn } from "@/game/model/turnState";
import { createPlayerId, type PlayerId, type TileId } from "@/game/model/ids";

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
    handle: `august${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
  };
  const anna: SessionUser = {
    id: `test-user-${crypto.randomUUID()}`,
    name: "Anna",
    email: `anna-${crypto.randomUUID()}@example.invalid`,
    handle: `anna${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
  };
  const stranger: SessionUser = {
    id: `test-user-${crypto.randomUUID()}`,
    name: "Stranger",
    email: `stranger-${crypto.randomUUID()}@example.invalid`,
    handle: `stranger${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
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
        handle: person.handle,
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
      opponent: { kind: "EMAIL", email: anna.email },
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

  /**
   * A game where one player holds exactly the letters a test needs, and it is their turn.
   *
   * Racks are dealt at random, so a test that needs to spell something has to arrange for it.
   * The wanted tiles are taken from wherever they happen to be — the bag or either rack, since
   * some letters exist only once in the Swedish set — and both racks are then refilled from what
   * is left. Every tile still exists in exactly one place, which is the invariant each engine
   * action relies on.
   */
  function gameWithRack(
    playerIndex: 0 | 1,
    letters: readonly string[],
    seats: readonly { userId: string; playerId: PlayerId }[],
  ): GameState {
    const base = createGame({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      playerOneId: seats[0]!.playerId,
      playerTwoId: seats[1]!.playerId,
    });

    // The board is empty at this point, so every tile is in the bag or on a rack.
    const pool = [
      ...base.tileBag.tileIds,
      ...base.players[0].rack.tileIds,
      ...base.players[1].rack.tileIds,
    ];

    const chosen: TileId[] = [];
    for (const letter of letters) {
      const index = pool.findIndex((tileId) => {
        const tile = base.tiles[tileId];
        return tile.kind === "LETTER" && tile.letter === letter;
      });
      if (index < 0) throw new Error(`No ${letter} in this tile set`);
      chosen.push(pool.splice(index, 1)[0]!);
    }

    const wanted = [...chosen, ...pool.splice(0, 7 - chosen.length)];
    const other = pool.splice(0, 7);

    const players: GameState["players"] = [
      {
        ...base.players[0],
        rack: { tileIds: playerIndex === 0 ? wanted : other },
      },
      {
        ...base.players[1],
        rack: { tileIds: playerIndex === 1 ? wanted : other },
      },
    ];

    return {
      ...base,
      players,
      tileBag: { tileIds: pool },
      currentPlayerId: players[playerIndex].id,
      turnState: playerTurn(players[playerIndex].id),
    };
  }

  /** A started match in which August holds XZB and it is his turn. */
  async function matchAwaitingNonsense() {
    const seats = [
      { userId: august.id, playerId: createPlayerId() },
      { userId: anna.id, playerId: createPlayerId() },
    ] as const;

    const state = gameWithRack(0, ["X", "Z", "B"], seats);
    const record = await matches.createMatch({
      createdByUserId: august.id,
      configuration: CONFIGURATION,
      players: [seats[0], seats[1]],
      gameState: state,
    });

    return { record, state, augustPlayerId: seats[0].playerId };
  }

  /** Submits XZB across the centre — three letters that are not a Swedish word. */
  async function submitNonsense(
    matchId: string,
    revision: number,
    state: GameState,
  ) {
    const [x, z, b] = state.players[0].rack.tileIds;
    return actions.performTurn({
      user: august,
      matchId,
      expectedRevision: revision,
      action: {
        type: "SUBMIT_MOVE",
        placements: [
          { tileId: x!, coordinate: { row: 7, column: 7 } },
          { tileId: z!, coordinate: { row: 7, column: 8 } },
          { tileId: b!, coordinate: { row: 7, column: 9 } },
        ],
      },
    });
  }

  describe("creating a match", () => {
    it("invites an opponent by email, and starts no game yet", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
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
        opponent: { kind: "EMAIL", email: "nobody@example.invalid" },
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("OPPONENT_NOT_FOUND");
    });

    it("refuses a match against oneself", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: august.email },
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("CANNOT_PLAY_ALONE");
    });

    /*
     * Naming a friend by id rather than by email (T28.3). The id is only accepted from somebody
     * the opponent has accepted as a friend, so these two tests are the whole of that rule.
     */
    it("invites a friend by id", async () => {
      const friends = await import("./friends");
      const sent = await friends.sendFriendRequest({
        userId: august.id,
        handle: anna.handle,
      });
      if (sent.outcome !== "OK") throw new Error(sent.outcome);
      const { incoming } = await friends.listSocialGraph(anna.id);
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId: incoming[0].requestId,
        response: "ACCEPT",
      });

      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "USER_ID", userId: anna.id },
        configuration: CONFIGURATION,
      });

      expect(created.outcome).toBe("OK");
      if (created.outcome !== "OK") return;
      expect(
        (await matches.loadMatchForUser(created.matchId, anna.id))?.status,
      ).toBe("INVITED");

      await db
        .delete(schema.friendship)
        .where(drizzle.eq(schema.friendship.id, incoming[0].requestId));
    });

    /*
     * `game-modifiers.md` section 5 requires the compatibility check to be made when a game is
     * created rather than trusted to a UI — and an online client is not even the same program.
     * Without this the match was stored and only refused when the opponent accepted it, leaving
     * an invitation that could never become a game (T28.4).
     */
    it("refuses rules the engine cannot build a game from", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
        // Polyglot and Wild are UNDECIDED together (DEC-010).
        configuration: {
          ...CONFIGURATION,
          modifiers: ["POLYGLOT", "WILD"],
          polyglotLanguages: ["sv", "en"],
          wildLanguages: ["sv", "en"],
        },
      });

      expect(created.outcome).toBe("INVALID_CONFIGURATION");
    });

    it("refuses a multi-language mode with only one language", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
        configuration: {
          ...CONFIGURATION,
          modifiers: ["POLYGLOT"],
          polyglotLanguages: ["sv"],
        },
      });

      expect(created.outcome).toBe("INVALID_CONFIGURATION");
    });

    it("keeps the rules a match was created with, for the list to show", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
        configuration: {
          ...CONFIGURATION,
          rackSize: 8,
          modifiers: ["CRISSCROSS"],
        },
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const [invitation] = (await matches.listMatchesForUser(anna.id)).filter(
        (entry) => entry.id === created.matchId,
      );

      expect(invitation.configuration).toMatchObject({
        rackSize: 8,
        modifiers: ["CRISSCROSS"],
      });
    });

    it("gives a stranger's id the same answer as an id that does not exist", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "USER_ID", userId: stranger.id },
        configuration: CONFIGURATION,
      });

      // Not a 403: a different answer would confirm the account exists (section 38).
      expect(created.outcome).toBe("OPPONENT_NOT_FOUND");
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
        opponent: { kind: "EMAIL", email: anna.email },
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
        opponent: { kind: "EMAIL", email: anna.email },
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
        opponent: { kind: "EMAIL", email: anna.email },
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
        opponent: { kind: "EMAIL", email: anna.email },
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const result = await actions.declineInvitation(august, created.matchId);

      expect(result.outcome).toBe("WRONG_MATCH_STATUS");
    });
  });

  describe("the match list", () => {
    it("separates an invitation received from one sent", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);

      const forAnna = await matches.listMatchesForUser(anna.id);
      const forAugust = await matches.listMatchesForUser(august.id);

      expect(forAnna.find((row) => row.id === created.matchId)?.category).toBe(
        "INVITATION_RECEIVED",
      );
      expect(
        forAugust.find((row) => row.id === created.matchId)?.category,
      ).toBe("INVITATION_SENT");
    });

    it("names the opponent, which is what a list is read by", async () => {
      const { matchId } = await startedMatch();

      const forAugust = await matches.listMatchesForUser(august.id);

      expect(forAugust.find((row) => row.id === matchId)?.opponentName).toBe(
        "Anna",
      );
    });

    it("files a declined invitation as cancelled", async () => {
      const created = await actions.createMatch({
        user: august,
        opponent: { kind: "EMAIL", email: anna.email },
        configuration: CONFIGURATION,
      });
      if (created.outcome !== "OK") throw new Error(created.outcome);
      await actions.declineInvitation(anna, created.matchId);

      const forAugust = await matches.listMatchesForUser(august.id);

      expect(
        forAugust.find((row) => row.id === created.matchId)?.category,
      ).toBe("CANCELLED");
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

  describe("the disputed-word flow", () => {
    it("asks the proposer before it asks the opponent", async () => {
      const { record, state } = await matchAwaitingNonsense();

      const result = await submitNonsense(record.id, record.revision, state);

      expect(result.outcome).toBe("OK");
      if (result.outcome !== "OK") return;

      /*
       * `online-multiplayer.md` section 21: an unknown word must not become the opponent's
       * problem merely because validation found one. The proposer is asked first.
       */
      expect(result.view.pendingMove?.status).toBe(
        "REQUIRES_PLAYER_CONFIRMATION",
      );
      const opponentView = await actions.matchViewFor(anna, record.id);
      if (opponentView.outcome !== "OK") throw new Error(opponentView.outcome);
      expect(opponentView.view.pendingMove).toBeUndefined();
    });

    it("shows the opponent the proposal only once it is confirmed", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);

      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });

      expect(confirmed.outcome).toBe("OK");
      const opponentView = await actions.matchViewFor(anna, record.id);
      if (opponentView.outcome !== "OK") throw new Error(opponentView.outcome);

      expect(opponentView.view.pendingMove?.status).toBe(
        "WAITING_FOR_OPPONENT",
      );
      // Section 23: Anna sees the placement and the words, but never August's remaining rack.
      expect(opponentView.view.pendingMove?.placedTiles).toHaveLength(3);
      expect(opponentView.view.opponentRackCount).toBe(4);
      expect(JSON.stringify(opponentView.view)).not.toContain("tileBag");
    });

    it("does not let the proposer review their own proposal", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);

      const result = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: confirmed.revision,
        action: { type: "ACCEPT_PROPOSED_MOVE" },
      });

      expect(result.outcome).toBe("RULE_REJECTED");
    });

    it("commits the move and the word when the opponent accepts", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);

      const accepted = await actions.performTurn({
        user: anna,
        matchId: record.id,
        expectedRevision: confirmed.revision,
        action: { type: "ACCEPT_PROPOSED_MOVE" },
      });

      expect(accepted.outcome).toBe("OK");
      if (accepted.outcome !== "OK") return;

      const stored = await matches.loadMatchForUser(record.id, august.id);
      const game = stored!.gameState!;
      expect(game.board.occupiedCells).toHaveLength(3);
      expect(game.pendingMove).toBeUndefined();
      // Section 24: score applied, tiles redrawn, turn advanced to the reviewer.
      const proposer = game.players.find(
        (p) => p.id === state.currentPlayerId,
      )!;
      expect(proposer.score).toBeGreaterThan(0);
      expect(proposer.rack.tileIds).toHaveLength(7);
      expect(game.currentPlayerId).not.toBe(state.currentPlayerId);
      // Section 27: the word is now this match's vocabulary.
      expect(game.acceptedVocabulary.map((entry) => entry.word)).toContain(
        "XZB",
      );
    });

    it("keeps an accepted word inside the match that accepted it", async () => {
      const first = await matchAwaitingNonsense();
      const submitted = await submitNonsense(
        first.record.id,
        first.record.revision,
        first.state,
      );
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: first.record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);
      const accepted = await actions.performTurn({
        user: anna,
        matchId: first.record.id,
        expectedRevision: confirmed.revision,
        action: { type: "ACCEPT_PROPOSED_MOVE" },
      });
      if (accepted.outcome !== "OK") throw new Error(accepted.outcome);

      // A different match, same word: still unknown (section 27).
      const second = await matchAwaitingNonsense();
      const again = await submitNonsense(
        second.record.id,
        second.record.revision,
        second.state,
      );

      expect(again.outcome).toBe("OK");
      if (again.outcome !== "OK") return;
      expect(again.view.pendingMove?.status).toBe(
        "REQUIRES_PLAYER_CONFIRMATION",
      );
    });

    it("returns control and the placement to the proposer when rejected", async () => {
      const { record, state, augustPlayerId } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);

      const rejected = await actions.performTurn({
        user: anna,
        matchId: record.id,
        expectedRevision: confirmed.revision,
        action: { type: "REJECT_PROPOSED_MOVE" },
      });

      expect(rejected.outcome).toBe("OK");
      const stored = await matches.loadMatchForUser(record.id, august.id);
      const game = stored!.gameState!;

      // Section 25: no score, no draw, no vocabulary, and the turn is August's again.
      expect(game.players.every((player) => player.score === 0)).toBe(true);
      expect(game.acceptedVocabulary).toHaveLength(0);
      expect(game.currentPlayerId).toBe(augustPlayerId);
      /*
       * Section 26: the placement is still there and is editable again — the engine puts it
       * straight back to EDITING rather than through an unlock step — and it is emphatically not
       * board occupancy.
       */
      expect(game.board.occupiedCells).toHaveLength(0);
      expect(game.pendingMove?.status).toBe("EDITING");
      expect(game.pendingMove?.placedTiles).toHaveLength(3);
    });

    /*
     * Section 26 again, from the other side: a rejected placement is the proposer's to change.
     * The client sends its whole intended placement, so the server clears what is pending before
     * replaying it — otherwise a second attempt could never be made.
     */
    it("lets the proposer submit a different placement after a rejection", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);
      const rejected = await actions.performTurn({
        user: anna,
        matchId: record.id,
        expectedRevision: confirmed.revision,
        action: { type: "REJECT_PROPOSED_MOVE" },
      });
      if (rejected.outcome !== "OK") throw new Error(rejected.outcome);

      const [x, z] = state.players[0].rack.tileIds;
      const retried = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: rejected.revision,
        action: {
          type: "SUBMIT_MOVE",
          placements: [
            { tileId: x!, coordinate: { row: 7, column: 7 } },
            { tileId: z!, coordinate: { row: 7, column: 8 } },
          ],
        },
      });

      expect(retried.outcome).toBe("OK");
      if (retried.outcome !== "OK") return;
      expect(retried.view.pendingMove?.placedTiles).toHaveLength(2);
    });

    it("does not let the opponent review a proposal the proposer has not confirmed", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);

      const result = await actions.performTurn({
        user: anna,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "ACCEPT_PROPOSED_MOVE" },
      });

      expect(result.outcome).toBe("RULE_REJECTED");
    });

    /*
     * The match list has to put this match in front of the reviewer, not leave it looking like
     * the proposer's turn. While a proposal waits, `currentPlayerId` is still the proposer's, so
     * a list built from that would tell both players they were waiting for each other.
     */
    it("puts a waiting proposal in the reviewer's list, not the proposer's", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);

      const forAnna = await matches.listMatchesForUser(anna.id);
      const forAugust = await matches.listMatchesForUser(august.id);

      expect(forAnna.find((row) => row.id === record.id)?.category).toBe(
        "AWAITING_YOUR_REVIEW",
      );
      expect(forAugust.find((row) => row.id === record.id)?.category).toBe(
        "WAITING_FOR_OPPONENT",
      );
    });

    /*
     * T26.4: nothing about the flow lives in a browser. Every read above already comes from the
     * database, so a reload is only another read — which is what this asserts explicitly.
     */
    it("survives a reload, because the proposal is in the database", async () => {
      const { record, state } = await matchAwaitingNonsense();
      const submitted = await submitNonsense(record.id, record.revision, state);
      if (submitted.outcome !== "OK") throw new Error(submitted.outcome);
      const confirmed = await actions.performTurn({
        user: august,
        matchId: record.id,
        expectedRevision: submitted.revision,
        action: { type: "CONFIRM_PROPOSAL" },
      });
      if (confirmed.outcome !== "OK") throw new Error(confirmed.outcome);

      const reopened = await actions.matchViewFor(anna, record.id);

      expect(reopened.outcome).toBe("OK");
      if (reopened.outcome !== "OK") return;
      expect(reopened.view.pendingMove?.status).toBe("WAITING_FOR_OPPONENT");
      expect(reopened.revision).toBe(confirmed.revision);
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
        opponent: { kind: "EMAIL", email: anna.email },
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
