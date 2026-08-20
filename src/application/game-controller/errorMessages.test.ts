import { describe, expect, it } from "vitest";
import { createGameError } from "../../game/model/gameError";
import { describeGameError } from "./errorMessages";

describe("describeGameError", () => {
  it("names the forbidden word when the engine reports one (T16.2)", () => {
    const error = createGameError("FORBIDDEN_WORD", "forbiddenWord", {
      word: "X",
      reason: "ONE_LETTER_WORD",
    });

    expect(describeGameError(error)).toBe('Ordet "X" är inte tillåtet.');
  });

  it("falls back to the generic forbidden-word message when no word is reported", () => {
    const error = createGameError("FORBIDDEN_WORD", "forbiddenWord");

    expect(describeGameError(error)).toBe("Det här ordet är inte tillåtet.");
  });

  it("uses the plain per-code message for errors without a word", () => {
    const error = createGameError("NOT_YOUR_TURN", "notYourTurn");

    expect(describeGameError(error)).toBe("Det är inte din tur.");
  });
});
