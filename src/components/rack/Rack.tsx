import { Tile } from "../common/Tile";
import styles from "./Rack.module.css";
import type { TileId } from "../../game/model/ids";

export interface RackTileView {
  readonly id: TileId;
  readonly letter: string;
  readonly points: number;
  readonly isBlank: boolean;
}

export interface RackProps {
  readonly tiles: readonly RackTileView[];
  readonly selectedTileId?: TileId;
  readonly exchangeSelection?: ReadonlySet<TileId>;
  readonly onSelectTile: (tileId: TileId) => void;
}

/**
 * Renders the current player's rack only (local-multiplayer.md section 7: the rack component
 * never receives the opponent's tile data, so there is nothing here to accidentally leak).
 */
export function Rack({
  tiles,
  selectedTileId,
  exchangeSelection,
  onSelectTile,
}: RackProps) {
  return (
    <div className={styles.rack} role="group" aria-label="Din hand">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          letter={tile.isBlank ? "☐" : tile.letter}
          points={tile.points}
          variant="rack"
          selected={
            tile.id === selectedTileId || exchangeSelection?.has(tile.id)
          }
          onClick={() => onSelectTile(tile.id)}
          ariaLabel={
            tile.isBlank
              ? "Blank bricka"
              : `Bricka ${tile.letter}, ${tile.points} poäng`
          }
        />
      ))}
    </div>
  );
}
