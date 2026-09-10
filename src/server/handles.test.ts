import { describe, expect, it } from "vitest";

import { isValidHandle, normalizeHandle, parseHandle } from "./handles";

/**
 * Handle rules are pure string rules (DEC-027), so they are tested without a database — the
 * uniqueness half lives in the schema and is exercised in `friends.test.ts` against real
 * Postgres.
 */

describe("normalizing a handle", () => {
  it("lowercases, so a handle cannot be typed wrongly by case", () => {
    expect(normalizeHandle("Anna")).toBe("anna");
  });

  it("drops a leading @, which is decoration rather than part of the handle", () => {
    expect(normalizeHandle("@anna")).toBe("anna");
  });

  it("trims surrounding whitespace, which pasting tends to bring along", () => {
    expect(normalizeHandle("  anna  ")).toBe("anna");
  });

  it("normalizes an unusable handle rather than rejecting it", () => {
    // Normalizing and validating are separate steps: this one is now invalid, not an error.
    expect(normalizeHandle(" @ANNA! ")).toBe("anna!");
  });
});

describe("validating a handle", () => {
  it("accepts letters, digits and underscores", () => {
    expect(isValidHandle("anna_92")).toBe(true);
  });

  it("requires a letter first, so a handle cannot look like a numeric id", () => {
    expect(isValidHandle("92anna")).toBe(false);
    expect(isValidHandle("_anna")).toBe(false);
  });

  it("rejects uppercase, since a valid handle is already normalized", () => {
    expect(isValidHandle("Anna")).toBe(false);
  });

  it("rejects the Swedish letters, which not every keyboard can produce", () => {
    // The exclusion is about the person typing it in, not about the language of the game.
    expect(isValidHandle("måns")).toBe(false);
  });

  it("rejects punctuation and spaces", () => {
    expect(isValidHandle("anna.lindqvist")).toBe(false);
    expect(isValidHandle("anna lindqvist")).toBe(false);
    expect(isValidHandle("anna@example.com")).toBe(false);
  });

  it("enforces the length bounds", () => {
    expect(isValidHandle("an")).toBe(false);
    expect(isValidHandle("ann")).toBe(true);
    expect(isValidHandle("a".repeat(20))).toBe(true);
    expect(isValidHandle("a".repeat(21))).toBe(false);
  });
});

describe("parsing a handle from a request", () => {
  it("normalizes before validating, so @Anna is accepted", () => {
    expect(parseHandle("@Anna")).toBe("anna");
  });

  it("rejects a value that is not a string at all", () => {
    expect(parseHandle(undefined)).toBeUndefined();
    expect(parseHandle(42)).toBeUndefined();
  });

  it("rejects a handle that normalization cannot rescue", () => {
    expect(parseHandle("anna lindqvist")).toBeUndefined();
  });
});
