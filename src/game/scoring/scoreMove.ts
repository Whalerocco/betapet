import { getAllTilesBonus } from "../configuration/allTilesBonus";
import {
  getMultiplierAt,
  type BoardDefinition,
  type Multiplier,
} from "../model/board";
import type { FormedWord } from "../model/formedWord";
import type { RackSize } from "../model/gameConfiguration";
import type { TileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import type { LetterScore, ScoreResult, WordScore } from "../model/scoreResult";
import type { Tile } from "../model/tile";

function letterMultiplierFactor(multiplier: Multiplier): number | undefined {
  switch (multiplier) {
    case "LETTER_X2":
      return 2;
    case "LETTER_X3":
      return 3;
    case "LETTER_X4":
      return 4;
    default:
      return undefined;
  }
}

function wordMultiplierFactor(multiplier: Multiplier): number | undefined {
  switch (multiplier) {
    case "WORD_X2":
      return 2;
    case "WORD_X3":
      return 3;
    case "WORD_X4":
      return 4;
    default:
      return undefined;
  }
}

/**
 * Scores one formed word. A tile only activates its square's multiplier if it was newly
 * placed this move (game-rules.md section 22): a pre-existing tile contributes its raw
 * points, even if it happens to sit on a multiplier square from an earlier move.
 *
 * A word that this move merely re-lettered, without making it longer, scores nothing
 * (game-modifiers.md section 7, DEC-016). Its `letterScores` are still reported, so a UI can
 * show what the word would otherwise have been worth, but its `total` is 0.
 */
export function scoreWord(
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
  tiles: Readonly<Record<TileId, Tile>>,
  word: FormedWord,
): WordScore {
  const placedByTileId = new Map(placedTiles.map((p) => [p.tileId, p]));

  /**
   * Whether this tile covers a cell that was empty before the move. `replacedTileId` is set only
   * for a Replace-mode placement (game-modifiers.md section 7), which lands on a cell that was
   * already covered; every other placement can only ever target an empty cell.
   *
   * Two separate rules key off this same fact. A multiplier activates only the first time its
   * cell is ever covered (game-rules.md section 22), so a replace must not reactivate one. And a
   * word scores only if the move lengthened it or created it (DEC-016) — since a move never
   * empties a cell, a word covering no previously-empty cell must be the identical span that was
   * already there, with a letter swapped.
   */
  function coversPreviouslyEmptyCell(tileId: TileId): boolean {
    const placed = placedByTileId.get(tileId);
    return placed !== undefined && placed.replacedTileId === undefined;
  }

  const activatesMultiplier = coversPreviouslyEmptyCell;
  const scoresPoints = word.tileIds.some(coversPreviouslyEmptyCell);

  const letterScores: LetterScore[] = word.coordinates.map(
    (coordinate, index) => {
      const tileId = word.tileIds[index];
      const basePoints = tiles[tileId].points;
      const multiplier: Multiplier = activatesMultiplier(tileId)
        ? getMultiplierAt(boardDefinition, coordinate)
        : "NONE";

      const letterFactor = letterMultiplierFactor(multiplier);
      let contributedPoints = basePoints;
      if (letterFactor !== undefined) {
        contributedPoints = basePoints * letterFactor;
      } else if (multiplier === "LETTER_MINUS_X2") {
        contributedPoints = -(basePoints * 2);
      }

      return { tileId, coordinate, basePoints, multiplier, contributedPoints };
    },
  );

  let wordMultiplier = 1;
  word.coordinates.forEach((coordinate, index) => {
    if (!activatesMultiplier(word.tileIds[index])) return;
    const factor = wordMultiplierFactor(
      getMultiplierAt(boardDefinition, coordinate),
    );
    if (factor !== undefined) {
      wordMultiplier *= factor;
    }
  });

  const preMultiplierTotal = letterScores.reduce(
    (sum, l) => sum + l.contributedPoints,
    0,
  );

  return {
    word: word.text,
    letterScores,
    wordMultiplier,
    scoresPoints,
    total: scoresPoints ? preMultiplierTotal * wordMultiplier : 0,
  };
}

/**
 * Scores a complete move: every newly formed word independently (a tile shared by two words
 * counts, multiplier and all, in both), plus the all-tiles bonus.
 *
 * The bonus is earned by putting your whole hand on the board in one word move (game-rules.md
 * section 25, DEC-018), which takes two conditions rather than one:
 *
 * - the rack is empty afterwards, and
 * - at least a full rack's worth of tiles was placed, so that emptying a *depleted* rack near the
 *   end of a game does not qualify — section 25's own example.
 *
 * Both are needed because Replace mode lets a hand exceed the configured rack size: a displaced
 * tile lands in the same rack, so a player can hold eight tiles with a rack size of seven. Keying
 * the bonus on the placed count alone paid out for a move that left a tile in hand, and withheld
 * it from one that emptied a hand of eight.
 *
 * The bonus is about emptying the rack, so DEC-016 does not touch it: a rack-emptying move earns
 * it even if every word it touched was only re-lettered and therefore scored nothing.
 */
export function scoreMove(
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
  tiles: Readonly<Record<TileId, Tile>>,
  formedWords: readonly FormedWord[],
  configuredRackSize: RackSize,
  /** Tiles still in the player's rack once this move's tiles have left it. */
  tilesLeftInRack: number,
): ScoreResult {
  const wordScores = formedWords.map((word) =>
    scoreWord(boardDefinition, placedTiles, tiles, word),
  );
  const wordsTotal = wordScores.reduce((sum, w) => sum + w.total, 0);
  const emptiedTheRack =
    tilesLeftInRack === 0 && placedTiles.length >= configuredRackSize;
  const allTilesBonus = emptiedTheRack
    ? getAllTilesBonus(configuredRackSize)
    : 0;

  return { wordScores, allTilesBonus, total: wordsTotal + allTilesBonus };
}
