import { describe, expect, it } from "vitest";
import { SWEDISH_ALPHABET } from "./swedishAlphabet";

describe("SWEDISH_ALPHABET", () => {
  it("has 29 letters", () => {
    expect(SWEDISH_ALPHABET).toHaveLength(29);
  });

  it("includes Å, Ä, Ö", () => {
    expect(SWEDISH_ALPHABET).toContain("Å");
    expect(SWEDISH_ALPHABET).toContain("Ä");
    expect(SWEDISH_ALPHABET).toContain("Ö");
  });

  it("has no duplicates", () => {
    expect(new Set(SWEDISH_ALPHABET).size).toBe(SWEDISH_ALPHABET.length);
  });
});
