import type { Multiplier } from "./board";
import type { Coordinate } from "./coordinate";
import type { TileId } from "./ids";

export interface LetterScore {
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
  readonly basePoints: number;
  /** The covering square's multiplier if this tile was newly placed this move, else "NONE". */
  readonly multiplier: Multiplier;
  /** Signed: negative for a Letter x-2 square (game-rules.md section 22). */
  readonly contributedPoints: number;
}

export interface WordScore {
  readonly word: string;
  readonly letterScores: readonly LetterScore[];
  /** Product of every newly-placed Word x2/x3/x4 square covered by this word; 1 if none. */
  readonly wordMultiplier: number;
  /**
   * False when a Replace-mode move only swapped letters inside this word without lengthening it
   * (DEC-016): the word still has to be valid, but awards nothing, and `total` is 0 regardless of
   * what `letterScores` add up to. Always true outside Replace mode, where every formed word
   * necessarily covers at least one previously empty cell.
   */
  readonly scoresPoints: boolean;
  readonly total: number;
}

export interface ScoreResult {
  readonly wordScores: readonly WordScore[];
  readonly allTilesBonus: number;
  readonly total: number;
}
