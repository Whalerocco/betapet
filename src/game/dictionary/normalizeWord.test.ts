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

  it("applies Unicode NFC normalization to Ä and Ö as well", () => {
    const decomposedA = String.fromCodePoint(0x0061, 0x0308); // "a" + combining diaeresis
    const precomposedA = String.fromCodePoint(0x00e4); // precomposed "ä"
    const decomposedO = String.fromCodePoint(0x006f, 0x0308); // "o" + combining diaeresis
    const precomposedO = String.fromCodePoint(0x00f6); // precomposed "ö"
    expect(normalizeWord(decomposedA)).toBe(normalizeWord(precomposedA));
    expect(normalizeWord(decomposedO)).toBe(normalizeWord(precomposedO));
  });

  it("treats different equivalent input forms identically end to end", () => {
    const forms = ["skog", "Skog", "SKOG", " skog ", "\tskog\n"];
    const results = new Set(forms.map(normalizeWord));
    expect(results.size).toBe(1);
    expect(results.has("SKOG")).toBe(true);
  });
});
