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
  readonly onPlaceAt: (coordinate: Coordinate) => void;
  readonly onPendingTileClick: (tileId: TileId) => void;
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
  onPlaceAt,
  onPendingTileClick,
}: BoardProps) {
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
            };
          }

          const isPlaceable =
            !tile && canPlaceSelectedTile && !committedTileId && !pendingTile;

          return (
            <BoardCell
              key={key}
              testId={`cell-${key}`}
              multiplier={multiplier}
              tile={tile}
              isPlaceable={isPlaceable}
              onPlace={() => onPlaceAt(coordinate)}
              onPendingTileClick={
                pendingTile
                  ? () => onPendingTileClick(pendingTile.tileId)
                  : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}
