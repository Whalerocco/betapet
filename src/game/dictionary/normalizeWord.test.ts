import { describe, expect, it } from "vitest";
import { normalizeWord } from "./normalizeWord";

describe("normalizeWord", () => {
  it("uppercases", () => {
    expect(normalizeWord("skog")).toBe("SKOG");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeWord(" Skog ")).toBe("SKOG");
  });

  it("leaves an already-canonical word unchanged", () => {
    expect(normalizeWord("SKOG")).toBe("SKOG");
  });

  it("keeps Swedish letters distinct from their nearest ASCII letter", () => {
    const aWithRing = String.fromCodePoint(0x00e5).toUpperCase();
    const aWithDiaeresis = String.fromCodePoint(0x00e4).toUpperCase();
    const oWithDiaeresis = String.fromCodePoint(0x00f6).toUpperCase();
    expect(normalizeWord(String.fromCodePoint(0x00e5))).toBe(aWithRing);
    expect(normalizeWord(String.fromCodePoint(0x00e4))).toBe(aWithDiaeresis);
    expect(normalizeWord(String.fromCodePoint(0x00f6))).toBe(oWithDiaeresis);
    expect(aWithRing).not.toBe("A");
    expect(oWithDiaeresis).not.toBe("O");
  });

  it("applies Unicode NFC normalization", () => {
    // Built from explicit code points, not a literal character in source: an editor/tool could
    // silently re-normalize a typed character, which would quietly defeat this test.
    const decomposed = String.fromCodePoint(0x0061, 0x030a); // "a" + combining ring above
    const precomposed = String.fromCodePoint(0x00e5); // precomposed "å"
    expect(decomposed).not.toBe(precomposed);
    expect(normalizeWord(decomposed)).toBe(normalizeWord(precomposed));
    expect(normalizeWord(decomposed)).toBe(precomposed.toUpperCase());
  });
});
