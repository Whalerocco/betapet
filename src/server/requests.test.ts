import { describe, expect, it } from "vitest";

import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";

import { parseCreateMatch } from "./requests";

/**
 * These need no database: they are about what the server accepts from a client that may send
 * anything at all (`online-multiplayer.md` section 50).
 */

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
});
