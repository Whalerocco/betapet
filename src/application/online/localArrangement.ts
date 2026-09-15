import {
  isOccupied,
  placeCommittedTile,
  removeCommittedTile,
  type BoardState,
} from "../../game/model/board";
import { coordinateKey } from "../../game/model/coordinate";
import { tilesDisplacedThisMove } from "../../game/engine/placeTile";
import type { TileId } from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import type { Tile } from "../../game/model/tile";

export interface LocalArrangementInput {
  /** The board as the server sent it, with any pending move of this player's already applied. */
  readonly board: BoardState;
  /** The rack as the server sent it. */
  readonly ownRackTileIds: readonly TileId[];
  /** A pending move the server is holding for *this* player, or empty. */
  readonly serverPending: readonly PendingPlacedTile[];
  /** What this client has arranged: where tiles have been put, with no displacement worked out. */
  readonly placements: readonly PendingPlacedTile[];
  /** The tiles this view can identify; anything outside it cannot be held or drawn. */
  readonly tiles: Readonly<Record<TileId, Tile>>;
}

export interface LocalArrangement {
  /** The board as these placements leave it — the displaced tiles off it. */
  readonly board: BoardState;
  /** The placements, each carrying the committed tile it displaces (`replacedTileId`). */
  readonly placements: readonly PendingPlacedTile[];
  /** Tiles this arrangement took off the board: in hand, and restricted until the turn ends. */
  readonly displacedTileIds: ReadonlySet<TileId>;
  /**
   * Every tile the player holds: the rack, the tiles the server is holding in a pending move of
   * theirs, and the tiles this arrangement displaced. Placed tiles are included — what is on the
   * board is subtracted where the hand is drawn, since a placement is not a commitment.
   */
  readonly heldTileIds: readonly TileId[];
}

/**
 * What an online client's own arrangement does to the board and the hand.
 *
 * An online client cannot run the engine — it has neither the bag nor the opponent's rack, and
 * `online-multiplayer.md` section 17 means it never to. It can nonetheless say what a placement
 * *displaces*, because that is a tile on the board in plain sight, and it has to: under Replace
 * mode (`game-modifiers.md` section 7) a placement onto a committed tile moves that tile into the
 * player's hand at once, and a screen that does not model this draws a board contradicting the
 * move it is about to send. That was `known-bugs.md` item 20 — the played tile appearing to
 * vanish behind the committed one, the displaced tile reaching neither board nor hand, and the
 * whole thing revealed as real only by pressing `Spela`.
 *
 * The derivation is in two steps, and the order matters. Any arrangement the *server* is holding
 * for this player (after `Ändra`, or after the opponent rejected a proposal) is undone first, so
 * everything after it depends on the local placements alone. That is what makes taking a
 * replacement back put the committed tile straight back where it was, as `removePendingTile` does
 * in the hot-seat game.
 *
 * This decides nothing. Whether a particular replace is *allowed* — the same letter (DEC-015), a
 * chain (DEC-033) — is the engine's judgment, made on the server and refused after `Spela` like
 * every other rule. `localArrangement.test.ts` checks the model against `placeTile` itself, so
 * the two cannot drift apart silently.
 */
export function localArrangement(
  input: LocalArrangementInput,
): LocalArrangement {
  /** The board as it stood before this player began arranging: nothing of theirs on it. */
  const boardBeforeMove = input.serverPending.reduce(
    (board, placed) =>
      placed.replacedTileId === undefined ||
      isOccupied(board, placed.coordinate)
        ? board
        : placeCommittedTile(board, placed.coordinate, placed.replacedTileId),
    input.board,
  );

  const committedTileByKey = new Map(
    boardBeforeMove.occupiedCells.map((cell) => [
      coordinateKey(cell.coordinate),
      cell.tileId,
    ]),
  );
  const placements = input.placements.map((placed) => {
    const replacedTileId = committedTileByKey.get(
      coordinateKey(placed.coordinate),
    );
    return replacedTileId === undefined
      ? placed
      : { ...placed, replacedTileId };
  });

  const board = placements.reduce(
    (current, placed) =>
      placed.replacedTileId !== undefined &&
      isOccupied(current, placed.coordinate)
        ? removeCommittedTile(current, placed.coordinate)
        : current,
    boardBeforeMove,
  );

  const displacedTileIds = tilesDisplacedThisMove(placements);

  /*
   * A tile the *server* displaced is in the rack it sent, but it is back on `boardBeforeMove`
   * here — so it is held only if the local placements displace it again. Subtracted before the
   * local displacements are added, or a tile put back on the board would still be in the hand.
   */
  const serverDisplacedTileIds = tilesDisplacedThisMove(input.serverPending);
  const candidates = [
    ...input.ownRackTileIds.filter(
      (tileId) => !serverDisplacedTileIds.has(tileId),
    ),
    ...input.serverPending.map((placed) => placed.tileId),
    ...displacedTileIds,
  ];
  const heldTileIds = candidates.filter(
    (tileId, index) =>
      candidates.indexOf(tileId) === index && input.tiles[tileId] !== undefined,
  );

  return { board, placements, displacedTileIds, heldTileIds };
}
