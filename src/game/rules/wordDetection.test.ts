import { describe, expect, it } from "vitest";
import {
  createBoardState,
  placeCommittedTile,
  type BoardState,
} from "../model/board";
import type { Coordinate } from "../model/coordinate";
import { createTileId, type TileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { detectFormedWords } from "./wordDetection";

function committed(
  board: BoardState,
  tiles: Record<TileId, Tile>,
  coordinate: Coordinate,
  letter: string,
): BoardState {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, 1);
  return placeCommittedTile(board, coordinate, id);
}

function pendingLetter(
  tiles: Record<TileId, Tile>,
  coordinate: Coordinate,
  letter: string,
): PendingPlacedTile {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, 1);
  return { tileId: id, coordinate };
}

function pendingBlank(
  tiles: Record<TileId, Tile>,
  coordinate: Coordinate,
  representedLetter: string,
): PendingPlacedTile {
  const id = createTileId();
  tiles[id] = createBlankTile(id);
  return { tileId: id, coordinate, representedLetter };
}

describe("detectFormedWords", () => {
  it("detects a single main word with no crossing words", () => {
    const tiles: Record<TileId, Tile> = {};
    const board = createBoardState();
    const placedTiles = [
      pendingLetter(tiles, { row: 7, column: 7 }, "K"),
      pendingLetter(tiles, { row: 7, column: 8 }, "A"),
      pendingLetter(tiles, { row: 7, column: 9 }, "T"),
    ];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toHaveLength(1);
    expect(words[0].text).toBe("KAT");
    expect(words[0].orientation).toBe("HORIZONTAL");
    expect(words[0].coordinates).toEqual([
      { row: 7, column: 7 },
      { row: 7, column: 8 },
      { row: 7, column: 9 },
    ]);
    expect(words[0].tileIds).toEqual(placedTiles.map((p) => p.tileId));
  });

  it("detects a main word plus one crossing word", () => {
    const tiles: Record<TileId, Tile> = {};
    let board = createBoardState();
    board = committed(board, tiles, { row: 8, column: 8 }, "O");

    const placedTiles = [
      pendingLetter(tiles, { row: 7, column: 7 }, "K"),
      pendingLetter(tiles, { row: 7, column: 8 }, "A"),
      pendingLetter(tiles, { row: 7, column: 9 }, "T"),
    ];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toHaveLength(2);
    expect(words.map((w) => w.text).sort()).toEqual(["AO", "KAT"]);
    const crossing = words.find((w) => w.text === "AO")!;
    expect(crossing.orientation).toBe("VERTICAL");
    expect(crossing.coordinates).toEqual([
      { row: 7, column: 8 },
      { row: 8, column: 8 },
    ]);
  });

  it("detects a main word plus several crossing words", () => {
    const tiles: Record<TileId, Tile> = {};
    let board = createBoardState();
    board = committed(board, tiles, { row: 8, column: 7 }, "X");
    board = committed(board, tiles, { row: 8, column: 8 }, "O");
    board = committed(board, tiles, { row: 8, column: 9 }, "Y");

    const placedTiles = [
      pendingLetter(tiles, { row: 7, column: 7 }, "K"),
      pendingLetter(tiles, { row: 7, column: 8 }, "A"),
      pendingLetter(tiles, { row: 7, column: 9 }, "T"),
    ];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words.map((w) => w.text).sort()).toEqual(["AO", "KAT", "KX", "TY"]);
  });

  it("extends an existing word (KABEL -> ELKABEL)", () => {
    const tiles: Record<TileId, Tile> = {};
    let board = createBoardState();
    const kabelLetters: [Coordinate, string][] = [
      [{ row: 5, column: 5 }, "K"],
      [{ row: 5, column: 6 }, "A"],
      [{ row: 5, column: 7 }, "B"],
      [{ row: 5, column: 8 }, "E"],
      [{ row: 5, column: 9 }, "L"],
    ];
    for (const [coordinate, letter] of kabelLetters) {
      board = committed(board, tiles, coordinate, letter);
    }

    const placedTiles = [
      pendingLetter(tiles, { row: 5, column: 3 }, "E"),
      pendingLetter(tiles, { row: 5, column: 4 }, "L"),
    ];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toHaveLength(1);
    expect(words[0].text).toBe("ELKABEL");
    expect(words[0].coordinates[0]).toEqual({ row: 5, column: 3 });
    expect(words[0].coordinates.at(-1)).toEqual({ row: 5, column: 9 });
  });

  it("detects words in both directions from a single placed tile", () => {
    const tiles: Record<TileId, Tile> = {};
    let board = createBoardState();
    board = committed(board, tiles, { row: 7, column: 6 }, "K");
    board = committed(board, tiles, { row: 8, column: 7 }, "T");

    const placedTiles = [pendingLetter(tiles, { row: 7, column: 7 }, "A")];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words.map((w) => w.text).sort()).toEqual(["AT", "KA"]);
  });

  it("returns no words for an isolated single tile with no neighbours", () => {
    const tiles: Record<TileId, Tile> = {};
    const board = createBoardState();
    const placedTiles = [pendingLetter(tiles, { row: 7, column: 7 }, "A")];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toEqual([]);
  });

  it("uses a pending blank tile's represented letter", () => {
    const tiles: Record<TileId, Tile> = {};
    const board = createBoardState();
    const placedTiles = [
      pendingLetter(tiles, { row: 7, column: 7 }, "K"),
      pendingBlank(tiles, { row: 7, column: 8 }, "Ö"),
    ];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toHaveLength(1);
    expect(words[0].text).toBe("KÖ");
  });

  it("uses an already-committed blank tile's fixed represented letter", () => {
    const tiles: Record<TileId, Tile> = {};
    let board = createBoardState();
    const blankId = createTileId();
    tiles[blankId] = { ...createBlankTile(blankId), representedLetter: "Ö" };
    board = placeCommittedTile(board, { row: 7, column: 8 }, blankId);

    const placedTiles = [pendingLetter(tiles, { row: 7, column: 7 }, "K")];

    const words = detectFormedWords(board, tiles, placedTiles);

    expect(words).toHaveLength(1);
    expect(words[0].text).toBe("KÖ");
  });

  describe("Crisscross mode: multi-branch clusters of entirely new tiles", () => {
    it("detects two independent words from a T-shaped cluster sharing one tile", () => {
      const tiles: Record<TileId, Tile> = {};
      const board = createBoardState();
      // Horizontal "DOG" at row 7, columns 5-7. Vertical "OGRE" down column 6 from the shared O.
      const placedTiles = [
        pendingLetter(tiles, { row: 7, column: 5 }, "D"),
        pendingLetter(tiles, { row: 7, column: 6 }, "O"),
        pendingLetter(tiles, { row: 7, column: 7 }, "G"),
        pendingLetter(tiles, { row: 8, column: 6 }, "G"),
        pendingLetter(tiles, { row: 9, column: 6 }, "R"),
        pendingLetter(tiles, { row: 10, column: 6 }, "E"),
      ];

      const words = detectFormedWords(board, tiles, placedTiles);

      expect(words).toHaveLength(2);
      expect(words.map((w) => w.text).sort()).toEqual(["DOG", "OGRE"]);
    });

    it("does not double-count a shared line reached from more than one of its own tiles", () => {
      const tiles: Record<TileId, Tile> = {};
      const board = createBoardState();
      // A plus-shape: every arm's tiles would each independently rediscover the same two lines.
      const placedTiles = [
        pendingLetter(tiles, { row: 7, column: 6 }, "A"),
        pendingLetter(tiles, { row: 7, column: 7 }, "B"),
        pendingLetter(tiles, { row: 7, column: 8 }, "A"),
        pendingLetter(tiles, { row: 6, column: 7 }, "A"),
        pendingLetter(tiles, { row: 8, column: 7 }, "A"),
      ];

      const words = detectFormedWords(board, tiles, placedTiles);

      // Without dedup this would be 6 (each of the 5 tiles rediscovering whichever of the two
      // lines it belongs to); properly deduped, each line is counted exactly once.
      expect(words).toHaveLength(2);
      expect(words.map((w) => w.text)).toEqual(["ABA", "ABA"]);
      expect(words.map((w) => w.orientation).sort()).toEqual([
        "HORIZONTAL",
        "VERTICAL",
      ]);
    });
  });
});
