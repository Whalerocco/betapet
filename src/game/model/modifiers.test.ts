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

  it("flags Illegal + Polyglot and Illegal + Wild as needing interaction handling", () => {
    expect(compatibilityOf("ILLEGAL", "POLYGLOT")).toBe(
      "COMPATIBLE_WITH_INTERACTION",
    );
    expect(compatibilityOf("ILLEGAL", "WILD")).toBe(
      "COMPATIBLE_WITH_INTERACTION",
    );
  });

  it("flags Polyglot + Wild as UNDECIDED, per DEC-010", () => {
    expect(compatibilityOf("POLYGLOT", "WILD")).toBe("UNDECIDED");
  });

  it("is plain COMPATIBLE for every other pair", () => {
    expect(compatibilityOf("CRISSCROSS", "ILLEGAL")).toBe("COMPATIBLE");
    expect(compatibilityOf("REPLACE", "ILLEGAL")).toBe("COMPATIBLE");
    expect(compatibilityOf("CRISSCROSS", "POLYGLOT")).toBe("COMPATIBLE");
    expect(compatibilityOf("CRISSCROSS", "WILD")).toBe("COMPATIBLE");
    expect(compatibilityOf("REPLACE", "POLYGLOT")).toBe("COMPATIBLE");
    expect(compatibilityOf("REPLACE", "WILD")).toBe("COMPATIBLE");
  });
});

describe("validateModifierSelection", () => {
  it("accepts an empty selection", () => {
    expect(validateModifierSelection([])).toEqual({ valid: true });
  });

  it("accepts a single modifier", () => {
    expect(validateModifierSelection(["ILLEGAL"])).toEqual({ valid: true });
  });

  it("accepts every modifier except the UNDECIDED Polyglot/Wild pair combined at once", () => {
    const withoutWild = ALL_MODIFIER_IDS.filter((id) => id !== "WILD");
    expect(validateModifierSelection(withoutWild)).toEqual({ valid: true });
  });

  it("rejects Polyglot and Wild combined, per DEC-010", () => {
    const result = validateModifierSelection(ALL_MODIFIER_IDS);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.conflicts).toContainEqual({ a: "POLYGLOT", b: "WILD" });
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
