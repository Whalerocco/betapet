import { describe, expect, it } from "vitest";
import { createTileId } from "./ids";
import {
  createBlankTile,
  createLetterTile,
  tileLetter,
  withRepresentedLetter,
} from "./tile";

describe("createLetterTile", () => {
  it("creates a normal letter tile", () => {
    const tile = createLetterTile(createTileId(), "K", 3);
    expect(tile.kind).toBe("LETTER");
    expect(tile.letter).toBe("K");
    expect(tile.points).toBe(3);
  });

  it("rejects a multi-character letter", () => {
    expect(() => createLetterTile(createTileId(), "KO", 3)).toThrow();
  });

  it("rejects negative points", () => {
    expect(() => createLetterTile(createTileId(), "K", -1)).toThrow();
  });
});

describe("createBlankTile", () => {
  it("always has zero points", () => {
    const tile = createBlankTile(createTileId());
    expect(tile.points).toBe(0);
  });

  it("can be created without a represented letter", () => {
    const tile = createBlankTile(createTileId());
    expect(tile.representedLetter).toBeUndefined();
  });

  it("keeps represented letter separate from physical identity", () => {
    const id = createTileId();
    const tile = createBlankTile(id, "Ö");
    expect(tile.id).toBe(id);
    expect(tile.representedLetter).toBe("Ö");
  });

  it("can have its represented letter assigned later", () => {
    const tile = createBlankTile(createTileId());
    const withLetter = withRepresentedLetter(tile, "Å");
    expect(withLetter.representedLetter).toBe("Å");
    expect(withLetter.points).toBe(0);
  });
});

describe("tileLetter", () => {
  it("returns the base letter for a normal tile", () => {
    const tile = createLetterTile(createTileId(), "A", 1);
    expect(tileLetter(tile)).toBe("A");
  });

  it("returns the represented letter for a blank", () => {
    const tile = createBlankTile(createTileId(), "Ä");
    expect(tileLetter(tile)).toBe("Ä");
  });

  it("returns undefined for an unassigned blank", () => {
    const tile = createBlankTile(createTileId());
    expect(tileLetter(tile)).toBeUndefined();
  });
});
