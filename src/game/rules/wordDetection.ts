import { getTileIdAt, type BoardState } from "../model/board";
import type { Coordinate, Orientation } from "../model/coordinate";
import { coordinateKey, coordinatesEqual } from "../model/coordinate";
import type { FormedWord } from "../model/formedWord";
import type { TileId } from "../model/ids";
import {
  determinePlacementOrientation,
  type PendingPlacedTile,
} from "../model/pendingMove";
import { tileLetter, type Tile } from "../model/tile";

interface LetterAt {
  readonly letter: string;
  readonly tileId: TileId;
}

/**
 * The letter occupying a coordinate, whether from the pending placement (using its proposed
 * represented letter for a blank) or an already-committed board tile. Undefined if the
 * coordinate is empty, or a blank tile there has no represented letter yet.
 */
function letterAt(
  boardState: BoardState,
  tiles: Readonly<Record<TileId, Tile>>,
  placedTiles: readonly PendingPlacedTile[],
  coordinate: Coordinate,
): LetterAt | undefined {
  const placed = placedTiles.find((p) =>
    coordinatesEqual(p.coordinate, coordinate),
  );
  if (placed) {
    const tile = tiles[placed.tileId];
    const letter =
      tile.kind === "LETTER" ? tile.letter : placed.representedLetter;
    return letter ? { letter, tileId: placed.tileId } : undefined;
  }

  const committedTileId = getTileIdAt(boardState, coordinate);
  if (committedTileId) {
    const letter = tileLetter(tiles[committedTileId]);
    return letter ? { letter, tileId: committedTileId } : undefined;
  }

  return undefined;
}

function step(orientation: Orientation): Coordinate {
  return orientation === "HORIZONTAL"
    ? { row: 0, column: 1 }
    : { row: 1, column: 0 };
}

/** Walks outward from `coordinate` along `orientation`, collecting the full contiguous run. */
function collectLine(
  boardState: BoardState,
  tiles: Readonly<Record<TileId, Tile>>,
  placedTiles: readonly PendingPlacedTile[],
  coordinate: Coordinate,
  orientation: Orientation,
): FormedWord | undefined {
  const delta = step(orientation);

  let start = coordinate;
  for (;;) {
    const previous = {
      row: start.row - delta.row,
      column: start.column - delta.column,
    };
    if (!letterAt(boardState, tiles, placedTiles, previous)) break;
    start = previous;
  }

  const coordinates: Coordinate[] = [];
  const tileIds: TileId[] = [];
  const letters: string[] = [];
  let current = start;
  for (;;) {
    const found = letterAt(boardState, tiles, placedTiles, current);
    if (!found) break;
    coordinates.push(current);
    tileIds.push(found.tileId);
    letters.push(found.letter);
    current = {
      row: current.row + delta.row,
      column: current.column + delta.column,
    };
  }

  if (coordinates.length < 2) {
    return undefined;
  }
  return { text: letters.join(""), orientation, coordinates, tileIds };
}

/**
 * Derives every word newly formed by a placement, from the board itself rather than any
 * client-supplied word string (game-rules.md sections 8-9). Expects `placedTiles` to already
 * be physically valid (see rules/physicalValidation.ts) and non-empty.
 */
export function detectFormedWords(
  boardState: BoardState,
  tiles: Readonly<Record<TileId, Tile>>,
  placedTiles: readonly PendingPlacedTile[],
): readonly FormedWord[] {
  const words: FormedWord[] = [];
  const addWord = (word: FormedWord | undefined): void => {
    if (word) words.push(word);
  };

  const orientation = determinePlacementOrientation(placedTiles);

  if (orientation) {
    addWord(
      collectLine(
        boardState,
        tiles,
        placedTiles,
        placedTiles[0].coordinate,
        orientation,
      ),
    );
    const crossOrientation: Orientation =
      orientation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";
    for (const placed of placedTiles) {
      addWord(
        collectLine(
          boardState,
          tiles,
          placedTiles,
          placed.coordinate,
          crossOrientation,
        ),
      );
    }
  } else {
    // Reached both for an ordinary single-tile placement and, under Crisscross mode
    // (game-modifiers.md section 6), for a genuinely non-collinear multi-branch cluster — in
    // that case every newly placed tile needs its own two-direction check, not just the first,
    // since a branch's own line may not pass through any other branch's tiles at all. Two
    // branches that do share a line (e.g. both touch the shared intersection tile) would
    // otherwise each rediscover the same word; the seen-set dedupes by exact coordinate list.
    const seen = new Set<string>();
    for (const placed of placedTiles) {
      for (const lineOrientation of ["HORIZONTAL", "VERTICAL"] as const) {
        const word = collectLine(
          boardState,
          tiles,
          placedTiles,
          placed.coordinate,
          lineOrientation,
        );
        if (!word) continue;
        const key = `${lineOrientation}:${word.coordinates.map(coordinateKey).join(";")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        addWord(word);
      }
    }
  }

  return words;
}
