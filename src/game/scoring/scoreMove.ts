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
 */
export function scoreWord(
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
  tiles: Readonly<Record<TileId, Tile>>,
  word: FormedWord,
): WordScore {
  const placedByTileId = new Map(placedTiles.map((p) => [p.tileId, p]));

  /**
   * A multiplier only activates the first time its cell is ever covered (game-rules.md section
   * 22). Ordinarily that's exactly "was this tile newly placed", since a normal placement can
   * only ever target an empty cell — but a Replace-mode placement (game-modifiers.md section 7)
   * is newly placed on a cell that was already covered before, so its own multiplier must not
   * reactivate. `replacedTileId` (set only for a replace) is what tells the two cases apart.
   */
  function activatesMultiplier(tileId: TileId): boolean {
    const placed = placedByTileId.get(tileId);
    return placed !== undefined && placed.replacedTileId === undefined;
  }

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
    total: preMultiplierTotal * wordMultiplier,
  };
}

/**
 * Scores a complete move: every newly formed word independently (a tile shared by two words
 * counts, multiplier and all, in both), plus the all-tiles bonus. The bonus is keyed on the
 * game's configured rack size, not how many tiles the player happened to have this turn
 * (game-rules.md section 25): placing every remaining tile from a depleted rack does not
 * qualify unless that count equals the configured rack size.
 */
export function scoreMove(
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
  tiles: Readonly<Record<TileId, Tile>>,
  formedWords: readonly FormedWord[],
  configuredRackSize: RackSize,
): ScoreResult {
  const wordScores = formedWords.map((word) =>
    scoreWord(boardDefinition, placedTiles, tiles, word),
  );
  const wordsTotal = wordScores.reduce((sum, w) => sum + w.total, 0);
  const allTilesBonus =
    placedTiles.length === configuredRackSize
      ? getAllTilesBonus(configuredRackSize)
      : 0;

  return { wordScores, allTilesBonus, total: wordsTotal + allTilesBonus };
}
