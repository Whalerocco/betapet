import type { GameHistory } from "../../game/model/history";
import type { PlayerId, TileId } from "../../game/model/ids";

export interface LastOpponentMove {
  readonly playerId: PlayerId;
  /** The tiles that move put on the board — not the older tiles its words ran through. */
  readonly tileIds: ReadonlySet<TileId>;
  readonly words: readonly string[];
  readonly scoreAwarded: number;
}

/**
 * The opponent's most recent committed move, as seen by one player (DEC-037).
 *
 * Returning `undefined` when the newest committed move is the viewer's own is the whole rule, and
 * everything the interface needs follows from it: the mark appears when the opponent plays, and
 * clears by itself the moment this player commits — no timer, no dismissal, nothing to reset. A
 * pass or an exchange in between changes no square, so the move stays marked across one.
 *
 * Tile *ids*, not coordinates. Under Replace mode a marked tile can be displaced off the board
 * later, and a coordinate would then mark whichever tile stands on that square now — someone
 * else's, and not from this move at all. An id marks the tile or nothing.
 *
 * Shared by both game screens, like `pendingMoveScorePreview`: it needs only the history, which
 * `PlayerGameView` carries in full, so the online client derives this for itself rather than
 * being told (`architecture.md` section 24).
 */
export function lastOpponentMove(
  history: GameHistory,
  viewerPlayerId: PlayerId,
): LastOpponentMove | undefined {
  for (let index = history.events.length - 1; index >= 0; index -= 1) {
    const event = history.events[index];
    if (event.type !== "WORD_MOVE_COMMITTED") continue;
    if (event.playerId === viewerPlayerId) return undefined;
    return {
      playerId: event.playerId,
      tileIds: new Set(
        event.payload.placedTiles.map((placed) => placed.tileId),
      ),
      words: event.payload.words,
      scoreAwarded: event.payload.scoreAwarded,
    };
  }
  return undefined;
}
