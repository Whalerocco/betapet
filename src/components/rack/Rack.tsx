import type { PointerEvent } from "react";
import { Tile } from "../common/Tile";
import styles from "./Rack.module.css";
import type { TileId } from "../../game/model/ids";

export interface RackTileView {
  readonly id: TileId;
  readonly letter: string;
  readonly points: number;
  readonly isBlank: boolean;
  /**
   * Replace mode (game-modifiers.md section 7): this tile was displaced from the board by the
   * move in progress, so it is marked out from the tiles that were already in the hand and
   * cannot displace another tile until the turn ends.
   */
  readonly isDisplaced?: boolean;
}

export interface RackProps {
  readonly tiles: readonly RackTileView[];
  readonly selectedTileId?: TileId;
  readonly exchangeSelection?: ReadonlySet<TileId>;
  readonly onSelectTile: (tileId: TileId) => void;
  /** Starts a drag gesture for a rack tile (roadmap.md Milestone 4.1); the caller decides
   * whether that tile is actually draggable (e.g. an unresolved blank is not). */
  readonly onTilePointerDown?: (
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  /** The tile currently being dragged out of this rack, so its origin spot can dim. */
  readonly draggingTileId?: TileId;
}

/**
 * Renders the current player's rack only (local-multiplayer.md section 7: the rack component
 * never receives the opponent's tile data, so there is nothing here to accidentally leak).
 *
 * `data-rack-dropzone` marks this element for the drag-and-drop hit-testing in GameScreen: a
 * pending board tile dropped anywhere inside it is returned to the rack.
 */
export function Rack({
  tiles,
  selectedTileId,
  exchangeSelection,
  onSelectTile,
  onTilePointerDown,
  draggingTileId,
}: RackProps) {
  return (
    <div
      className={styles.rack}
      role="group"
      aria-label="Din hand"
      data-rack-dropzone
    >
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          // Read by GameScreen to work out which gap a drop landed in (rackDropIndex).
          dataRackTileId={tile.id}
          letter={tile.isBlank ? "☐" : tile.letter}
          points={tile.points}
          variant="rack"
          isBlank={tile.isBlank}
          selected={
            tile.id === selectedTileId || exchangeSelection?.has(tile.id)
          }
          isDragSource={tile.id === draggingTileId}
          isDisplaced={tile.isDisplaced}
          onClick={() => onSelectTile(tile.id)}
          onPointerDown={
            onTilePointerDown
              ? (event) => onTilePointerDown(tile.id, event)
              : undefined
          }
          ariaLabel={
            (tile.isBlank
              ? "Blank bricka"
              : `Bricka ${tile.letter}, ${tile.points} poäng`) +
            (tile.isDisplaced ? ", ersatt bricka" : "")
          }
        />
      ))}
    </div>
  );
}
