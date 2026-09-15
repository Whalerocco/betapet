import { describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";

import {
  parseCreateMatch,
  parseFriendRequest,
  parseTurnAction,
} from "./requests";

/**
 * These need no database: they are about what the server accepts from a client that may send
 * anything at all (`online-multiplayer.md` section 50).
 */

describe("parsing a turn action", () => {
  it("accepts a pass", () => {
    expect(parseTurnAction({ type: "PASS" })).toEqual({ type: "PASS" });
  });

  it("accepts taking a placement back", () => {
    expect(parseTurnAction({ type: "CLEAR_PENDING_MOVE" })).toEqual({
      type: "CLEAR_PENDING_MOVE",
    });
  });

  it("accepts an exchange and a placement", () => {
    expect(
      parseTurnAction({ type: "EXCHANGE_TILES", tileIds: ["a", "b"] }),
    ).toEqual({
      type: "EXCHANGE_TILES",
      tileIds: ["a", "b"],
    });

    expect(
      parseTurnAction({
        type: "SUBMIT_MOVE",
        placements: [
          { tileId: "t1", coordinate: { row: 7, column: 7 } },
          {
            tileId: "t2",
            coordinate: { row: 7, column: 8 },
            representedLetter: "A",
          },
        ],
      }),
    ).toEqual({
      type: "SUBMIT_MOVE",
      placements: [
        {
          tileId: "t1",
          coordinate: { row: 7, column: 7 },
          representedLetter: undefined,
        },
        {
          tileId: "t2",
          coordinate: { row: 7, column: 8 },
          representedLetter: "A",
        },
      ],
    });
  });

  it("accepts the disputed-word actions, which carry nothing but a name", () => {
    for (const type of [
      "CONFIRM_PROPOSAL",
      "CANCEL_PROPOSAL",
      "ACCEPT_PROPOSED_MOVE",
      "REJECT_PROPOSED_MOVE",
    ] as const) {
      expect(parseTurnAction({ type })).toEqual({ type });
    }
  });

  it("rejects anything malformed", () => {
    expect(parseTurnAction(undefined)).toBeUndefined();
    expect(parseTurnAction({ type: "RESIGN" })).toBeUndefined();
    expect(
      parseTurnAction({ type: "EXCHANGE_TILES", tileIds: [1, 2] }),
    ).toBeUndefined();
    expect(
      parseTurnAction({ type: "SUBMIT_MOVE", placements: "all" }),
    ).toBeUndefined();
    expect(
      parseTurnAction({
        type: "SUBMIT_MOVE",
        placements: [{ tileId: "t1", coordinate: { row: 7.5, column: 7 } }],
      }),
    ).toBeUndefined();
  });

  /*
   * A player id is never read from a request: the server derives it from the session and the
   * match's seats (section 37). Sending one changes nothing.
   */
  it("ignores a player id a client tries to supply", () => {
    const action = parseTurnAction({ type: "PASS", playerId: "somebody-else" });

    expect(action).toEqual({ type: "PASS" });
    expect(action).not.toHaveProperty("playerId");
  });
});

describe("parsing a match creation", () => {
  it("defaults to the standard Swedish rules", () => {
    const parsed = parseCreateMatch({ opponentEmail: "anna@example.com" });

    expect(parsed?.configuration).toEqual({
      configurationId: SWEDISH_CONFIGURATION_ID,
      rackSize: 7,
      modifiers: [],
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("takes the modifiers and rack size a client chose", () => {
    const parsed = parseCreateMatch({
      opponentEmail: "anna@example.com",
      configuration: {
        rackSize: 8,
        modifiers: ["CRISSCROSS"],
        polyglotLanguages: [],
        wildLanguages: [],
      },
    });

    expect(parsed?.configuration.rackSize).toBe(8);
    expect(parsed?.configuration.modifiers).toEqual(["CRISSCROSS"]);
  });

  /*
   * Section 49: a match keeps the rules it was created with. The field exists to record them, not
   * to let a client ask for a ruleset the release does not offer.
   */
  it("does not let a client choose another ruleset", () => {
    const parsed = parseCreateMatch({
      opponentEmail: "anna@example.com",
      configuration: { configurationId: "made-up-rules" },
    });

    expect(parsed?.configuration.configurationId).toBe(
      SWEDISH_CONFIGURATION_ID,
    );
  });

  it("rejects a missing or nonsensical opponent, rack size or modifier", () => {
    expect(parseCreateMatch({})).toBeUndefined();
    expect(parseCreateMatch({ opponentEmail: "not-an-email" })).toBeUndefined();
    expect(
      parseCreateMatch({
        opponentEmail: "a@b.se",
        configuration: { rackSize: 12 },
      }),
    ).toBeUndefined();
    expect(
      parseCreateMatch({
        opponentEmail: "a@b.se",
        configuration: { modifiers: ["TELEPORT"] },
      }),
    ).toBeUndefined();
  });

  it("accepts a friend named by id instead of by email (T28.3)", () => {
    const parsed = parseCreateMatch({ opponentUserId: "user-123" });

    expect(parsed?.opponent).toEqual({ kind: "USER_ID", userId: "user-123" });
  });

  it("accepts an opponent named by handle, normalized (T32.1)", () => {
    expect(parseCreateMatch({ opponentHandle: " @Anna " })?.opponent).toEqual({
      kind: "HANDLE",
      handle: "anna",
    });
  });

  it("refuses a handle that is not one", () => {
    // `parseHandle` owns what a handle is (DEC-027); this only has to defer to it.
    expect(parseCreateMatch({ opponentHandle: "no" })).toBeUndefined();
    expect(parseCreateMatch({ opponentHandle: "1anna" })).toBeUndefined();
    expect(parseCreateMatch({ opponentHandle: "änna" })).toBeUndefined();
  });

  it("refuses a body naming more than one opponent, or none", () => {
    // Accepting several would leave the server choosing which one the client meant.
    expect(
      parseCreateMatch({
        opponentEmail: "anna@example.com",
        opponentUserId: "user-123",
      }),
    ).toBeUndefined();
    expect(
      parseCreateMatch({
        opponentEmail: "anna@example.com",
        opponentHandle: "anna",
      }),
    ).toBeUndefined();
    expect(
      parseCreateMatch({ opponentHandle: "anna", opponentUserId: "user-123" }),
    ).toBeUndefined();
    expect(parseCreateMatch({ opponentUserId: "  " })).toBeUndefined();
  });
});

describe("parsing a friend request", () => {
  it("normalizes the handle it accepts (DEC-027)", () => {
    expect(parseFriendRequest({ handle: " @Anna " })).toEqual({
      handle: "anna",
    });
  });

  it("rejects a handle the rules do not allow", () => {
    expect(parseFriendRequest({ handle: "anna lindqvist" })).toBeUndefined();
    expect(parseFriendRequest({ handle: "an" })).toBeUndefined();
    expect(parseFriendRequest({})).toBeUndefined();
    expect(parseFriendRequest(undefined)).toBeUndefined();
  });
});
