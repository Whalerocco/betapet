import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { BoardCell } from "./BoardCell";
import { useBoardZoom } from "./useBoardZoom";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomState = useBoardZoom();

  /*
   * Stops the *page* zooming, so a pinch means the board and nothing else.
   *
   * A ctrl+wheel (trackpad pinch) would otherwise zoom the whole page, and React's onWheel is
   * passive so it cannot preventDefault — that one is bound to the board's own viewport.
   *
   * WebKit, which every browser on an iPhone uses, ignores `touch-action` for pinch-zoom
   * entirely and offers its own gesture events instead; preventing those is the only way to
   * decline. They are bound to the *document*, not to the board: a gesture event targets the
   * common ancestor of both fingers, and with a board narrower than a spread hand one finger is
   * regularly outside it, so an element-level listener simply never fires. That was why an
   * earlier attempt at this changed nothing.
   *
   * Pinch is redirected rather than taken away — the board zooms on its own, which is the
   * gesture's only real purpose here — and only while a board is on screen.
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    const blockWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const blockGestureZoom = (event: Event) => event.preventDefault();
    const gestures = ["gesturestart", "gesturechange", "gestureend"];

    viewport?.addEventListener("wheel", blockWheelZoom, { passive: false });
    for (const name of gestures) {
      document.addEventListener(name, blockGestureZoom, { passive: false });
    }
    return () => {
      viewport?.removeEventListener("wheel", blockWheelZoom);
      for (const name of gestures) {
        document.removeEventListener(name, blockGestureZoom);
      }
    };
  }, []);

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

  const grid = (
    <div
      className={styles.board}
      style={
        {
          // Zoom scales the tiles themselves, so the grid genuinely lays out larger and the
          // viewport below gets a real scrollable area to pan around (useBoardZoom.ts).
          "--board-zoom": zoomState.zoom,
          "--tile-size": `calc(var(--tile-base) * ${zoomState.zoom})`,
          gridTemplateColumns: `repeat(${boardDefinition.width}, var(--tile-size))`,
          gridTemplateRows: `repeat(${boardDefinition.height}, var(--tile-size))`,
        } as CSSProperties
      }
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
          // A committed tile is a target only under Replace mode; one of the player's own
          // not-yet-played tiles is always a target, since dropping a tile onto it just swaps the
          // two (DEC-017). Either way it only becomes tappable once a rack tile is selected —
          // without one, a pending tile keeps its "pick it back up" tap.
          const isReplaceTarget =
            replaceModeActive && committedTileId !== undefined && !pendingTile;
          const isSwapTarget = pendingTile !== undefined;
          const isTapTarget =
            canPlaceSelectedTile && (isReplaceTarget || isSwapTarget);

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
                (!tile || isReplaceTarget || isSwapTarget) &&
                dragOverCoordinate !== undefined &&
                coordinateKey(dragOverCoordinate) === key
              }
              onPlace={() => onPlaceAt(coordinate)}
              onReplace={isTapTarget ? () => onPlaceAt(coordinate) : undefined}
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

  return (
    <div className={styles.boardArea}>
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${
          zoomState.isZoomed ? styles.viewportZoomed : ""
        }`}
        onPointerDown={zoomState.onPointerDown}
        onPointerMove={zoomState.onPointerMove}
        onPointerUp={zoomState.onPointerUp}
        onPointerCancel={zoomState.onPointerUp}
        onWheel={zoomState.onWheel}
      >
        {grid}
      </div>
      {zoomState.isZoomed && (
        <button
          type="button"
          className={styles.resetZoom}
          onClick={() => {
            viewportRef.current?.scrollTo({ left: 0, top: 0 });
            zoomState.resetZoom();
          }}
        >
          Visa hela brädet
        </button>
      )}
    </div>
  );
}
