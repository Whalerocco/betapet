import type { PointerEvent } from "react";
import { BoardCell } from "./BoardCell";
import styles from "./Board.module.css";
import type { BoardDefinition, BoardState } from "../../game/model/board";
import { coordinateKey, type Coordinate } from "../../game/model/coordinate";
import type { TileId } from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { tileLetter, type Tile as EngineTile } from "../../game/model/tile";

export interface BoardProps {
  readonly boardDefinition: BoardDefinition;
  readonly boardState: BoardState;
  readonly tiles: Readonly<Record<TileId, EngineTile>>;
  readonly pendingPlacedTiles: readonly PendingPlacedTile[];
  readonly canPlaceSelectedTile: boolean;
  /**
   * True when this game has Replace mode enabled (game-modifiers.md section 7), which makes
   * committed tiles legitimate placement targets as well as empty squares. Presentation only:
   * it decides what the board offers, never whether a particular replace is allowed — the engine
   * still rejects a same-letter or chained replace and the error surfaces as usual.
   */
  readonly replaceModeActive?: boolean;
  readonly onPlaceAt: (coordinate: Coordinate) => void;
  readonly onPendingTileClick: (tileId: TileId) => void;
  /** Starts a drag gesture for a pending tile already on the board (roadmap.md Milestone 4.1). */
  readonly onPendingTilePointerDown?: (
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  /** The pending tile currently being dragged off the board, so its origin square dims. */
  readonly draggingTileId?: TileId;
  /** The square a drag is currently hovering over, highlighted if it's a valid empty target. */
  readonly dragOverCoordinate?: Coordinate;
  /** The pending move's first (reading-order) tile, where the live score-preview badge renders. */
  readonly scoreBadgeCoordinate?: Coordinate;
  /** The pending move's total score, shown on `scoreBadgeCoordinate`'s cell when defined. */
  readonly scoreBadgeValue?: number;
}

/**
 * Renders the board grid. Owns no rule logic (ui-design.md section 52): it only shows what the
 * engine state contains and reports where the user clicked.
 */
export function Board({
  boardDefinition,
  boardState,
  tiles,
  pendingPlacedTiles,
  canPlaceSelectedTile,
  replaceModeActive = false,
  onPlaceAt,
  onPendingTileClick,
  onPendingTilePointerDown,
  draggingTileId,
  dragOverCoordinate,
  scoreBadgeCoordinate,
  scoreBadgeValue,
}: BoardProps) {
  const scoreBadgeKey = scoreBadgeCoordinate
    ? coordinateKey(scoreBadgeCoordinate)
    : undefined;
  const committedByKey = new Map(
    boardState.occupiedCells.map((cell) => [
      coordinateKey(cell.coordinate),
      cell.tileId,
    ]),
  );
  const pendingByKey = new Map(
    pendingPlacedTiles.map((placed) => [
      coordinateKey(placed.coordinate),
      placed,
    ]),
  );

  const rows = Array.from({ length: boardDefinition.height }, (_, row) => row);
  const columns = Array.from(
    { length: boardDefinition.width },
    (_, column) => column,
  );

  return (
    <div
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${boardDefinition.width}, var(--tile-size))`,
        gridTemplateRows: `repeat(${boardDefinition.height}, var(--tile-size))`,
      }}
      role="grid"
      aria-label="Spelplan"
    >
      {rows.map((row) =>
        columns.map((column) => {
          const coordinate = { row, column };
          const key = coordinateKey(coordinate);
          const cellDefinition = boardDefinition.cells.find(
            (c) => coordinateKey(c.coordinate) === key,
          );
          const multiplier = cellDefinition?.multiplier ?? "NONE";

          const committedTileId = committedByKey.get(key);
          const pendingTile = pendingByKey.get(key);

          let tile:
            | {
                letter: string;
                points: number;
                isPending: boolean;
                isBlank: boolean;
                isDragSource?: boolean;
              }
            | undefined;
          if (committedTileId) {
            const engineTile = tiles[committedTileId];
            tile = {
              letter: tileLetter(engineTile) ?? "",
              points: engineTile.points,
              isPending: false,
              isBlank: engineTile.kind === "BLANK",
            };
          } else if (pendingTile) {
            const engineTile = tiles[pendingTile.tileId];
            tile = {
              letter:
                pendingTile.representedLetter ?? tileLetter(engineTile) ?? "",
              points: engineTile.points,
              isPending: true,
              isBlank: engineTile.kind === "BLANK",
              isDragSource: pendingTile.tileId === draggingTileId,
            };
          }

          const isPlaceable =
            !tile && canPlaceSelectedTile && !committedTileId && !pendingTile;
          // A committed tile can be replaced, a pending one cannot (the pending tile's own click
          // picks it back up instead, and the engine rejects targeting your own pending move).
          const isReplaceTarget =
            replaceModeActive && committedTileId !== undefined && !pendingTile;

          return (
            <BoardCell
              key={key}
              testId={`cell-${key}`}
              coordinateKey={key}
              multiplier={multiplier}
              tile={tile}
              isPlaceable={isPlaceable}
              scoreBadge={key === scoreBadgeKey ? scoreBadgeValue : undefined}
              isDragOver={
                (!tile || isReplaceTarget) &&
                dragOverCoordinate !== undefined &&
                coordinateKey(dragOverCoordinate) === key
              }
              onPlace={() => onPlaceAt(coordinate)}
              onReplace={
                isReplaceTarget && canPlaceSelectedTile
                  ? () => onPlaceAt(coordinate)
                  : undefined
              }
              onPendingTileClick={
                pendingTile
                  ? () => onPendingTileClick(pendingTile.tileId)
                  : undefined
              }
              onPendingTilePointerDown={
                pendingTile && onPendingTilePointerDown
                  ? (event) =>
                      onPendingTilePointerDown(pendingTile.tileId, event)
                  : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}
