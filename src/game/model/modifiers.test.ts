import { describe, expect, it } from "vitest";
import {
  ALL_MODIFIER_IDS,
  compatibilityOf,
  validateModifierSelection,
} from "./modifiers";

describe("compatibilityOf", () => {
  it("is COMPATIBLE with itself", () => {
    for (const id of ALL_MODIFIER_IDS) {
      expect(compatibilityOf(id, id)).toBe("COMPATIBLE");
    }
  });

  it("is symmetric", () => {
    for (const a of ALL_MODIFIER_IDS) {
      for (const b of ALL_MODIFIER_IDS) {
        expect(compatibilityOf(a, b)).toBe(compatibilityOf(b, a));
      }
    }
  });

  it("flags Crisscross + Replace as needing interaction handling (game-modifiers.md section 5)", () => {
    expect(compatibilityOf("CRISSCROSS", "REPLACE")).toBe(
      "COMPATIBLE_WITH_INTERACTION",
    );
  });

  it("is plain COMPATIBLE for every other currently-implemented pair", () => {
    expect(compatibilityOf("CRISSCROSS", "ILLEGAL")).toBe("COMPATIBLE");
    expect(compatibilityOf("REPLACE", "ILLEGAL")).toBe("COMPATIBLE");
  });
});

describe("validateModifierSelection", () => {
  it("accepts an empty selection", () => {
    expect(validateModifierSelection([])).toEqual({ valid: true });
  });

  it("accepts a single modifier", () => {
    expect(validateModifierSelection(["ILLEGAL"])).toEqual({ valid: true });
  });

  it("accepts every currently-implemented modifier combined at once", () => {
    const result = validateModifierSelection(ALL_MODIFIER_IDS);
    expect(result.valid).toBe(true);
  });

  it("accepts a Set as well as an array", () => {
    expect(
      validateModifierSelection(new Set(["CRISSCROSS", "REPLACE"])),
    ).toEqual({ valid: true });
  });

  it("ignores duplicate entries", () => {
    expect(
      validateModifierSelection(["ILLEGAL", "ILLEGAL"]),
    ).toEqual({ valid: true });
  });
});
