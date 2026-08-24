"use client";

import { useRef, useState, type PointerEvent } from "react";
import { describeGameError } from "../../application/game-controller/errorMessages";
import type {
  GameAction,
  GameControllerDependencies,
} from "../../application/game-controller/gameController";
import {
  deriveLocalSessionAfterAction,
  describeHandoff,
  initialLocalSession,
  resumeLocalSession,
  type LocalSessionState,
} from "../../application/game-controller/localSession";
import { useGameController } from "../../application/game-controller/useGameController";
import { saveLocalGame } from "../../application/persistence/localGameStorage";
import {
  activeWildLanguageIndex,
  hasCommittedMove,
} from "../../game/engine/wildRotation";
import {
  parseCoordinateKey,
  type Coordinate,
} from "../../game/model/coordinate";
import type { GameState } from "../../game/model/game";
import type { PlayerId, TileId } from "../../game/model/ids";
import { tileLetter } from "../../game/model/tile";
import { previewMoveScore } from "../../game/scoring/previewMoveScore";
import { Board } from "../board/Board";
import { Dialog } from "../common/Dialog";
import { Tile } from "../common/Tile";
import type { DragPointerPosition } from "../common/useTileDrag";
import { useTileDrag } from "../common/useTileDrag";
import { tilesDisplacedThisMove } from "../../game/engine/placeTile";
import { Rack, type RackTileView } from "../rack/Rack";
import { BlankLetterPicker } from "./BlankLetterPicker";
import { GameHistory } from "./GameHistory";
import { GameOverScreen } from "./GameOverScreen";
import styles from "./GameScreen.module.css";
import { HandoffScreen } from "./HandoffScreen";
import { LANGUAGE_NAMES } from "./languageNames";
import { MODIFIER_COPY } from "./modifierCopy";
import { OpponentReview } from "./OpponentReview";
import { ScoreBoard } from "./ScoreBoard";
import { TurnActions } from "./TurnActions";
import { UnknownWordNotice } from "./UnknownWordNotice";

interface DropTarget {
  readonly coordinate?: Coordinate;
  readonly overRack: boolean;
}

/**
 * Resolves what a drag ended over, purely by DOM hit-testing the data attributes Board/Rack
 * already expose (`data-coordinate`, `data-rack-dropzone`). Kept outside the component since it
 * has no dependency on game state — it only answers "what's under this point", not "is that a
 * legal move" (ui-design.md section 52-53 keeps that decision in the engine).
 */
function resolveDropTarget(position: DragPointerPosition): DropTarget {
  const element = document.elementFromPoint(position.x, position.y);
  if (!element) return { overRack: false };
  const cell = element.closest<HTMLElement>("[data-coordinate]");
  if (cell?.dataset.coordinate) {
    return {
      coordinate: parseCoordinateKey(cell.dataset.coordinate),
      overRack: false,
    };
  }
  return { overRack: element.closest("[data-rack-dropzone]") !== null };
}

/**
 * The shuffle action is an icon rather than the words "Blanda brickor": beside the rack the label
 * was wider than several tiles, and that space is what the tiles themselves need on a phone. The
 * button keeps its Swedish accessible name, so nothing is lost to a screen reader.
 */
/**
 * Which gap in the rack a drop at `pointerX` fell into, counted after the dragged tile has been
 * lifted out of the order. Read from where the tiles actually are on screen rather than from a
 * model of the layout, so it stays correct however the rack wraps or resizes.
 */
function rackDropIndex(draggedTileId: TileId, pointerX: number): number {
  const tiles = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-rack-dropzone] [data-rack-tile-id]",
    ),
  ).filter((element) => element.dataset.rackTileId !== draggedTileId);

  const index = tiles.findIndex((element) => {
    const rect = element.getBoundingClientRect();
    return pointerX < rect.left + rect.width / 2;
  });
  return index === -1 ? tiles.length : index;
}

function ShuffleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.35em"
      height="1.35em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </svg>
  );
}

export interface GameScreenProps {
  readonly initialState: GameState;
  readonly deps: GameControllerDependencies;
  readonly onExit: () => void;
  /** True when initialState came from localStorage rather than a fresh createGame() call. */
  readonly isResumed?: boolean;
}

/** The main game screen (roadmap.md Milestones 3-3.4). */
export function GameScreen({
  initialState,
  deps,
  onExit,
  isResumed = false,
}: GameScreenProps) {
  const { state, dispatch } = useGameController(initialState, deps);
  const [session, setSession] = useState<LocalSessionState>(() =>
    isResumed
      ? resumeLocalSession(initialState)
      : initialLocalSession(initialState),
  );
  const [selectedTileId, setSelectedTileId] = useState<TileId | undefined>();
  /**
   * Set when a selected blank tile is tapped onto a board cell: the letter is chosen at
   * placement time (ui-design.md), so PLACE_TILE isn't dispatched until this resolves.
   */
  const [pendingPlacement, setPendingPlacement] = useState<
    { tileId: TileId; coordinate: Coordinate } | undefined
  >();
  const [editingBlankTileId, setEditingBlankTileId] = useState<
    TileId | undefined
  >();
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<Set<TileId>>(
    new Set(),
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  /**
   * Submitting a move that turns out unknown flips turnState.type away from PLAYER_TURN, which
   * unmounts the whole footer — including the "Spela" button that triggered it — before
   * UnknownWordNotice's Dialog ever mounts. Capturing it here, synchronously in the click
   * handler, is the only point where it's still the actually-focused element (Dialog.tsx
   * restoreFocusTo doc).
   */
  const submitTriggerRef = useRef<Element | null>(null);
  /**
   * Hooks must run unconditionally before any of the early returns below (Rules of Hooks), so
   * this is wired here even though `handleTileDrop` — a plain hoisted function declaration — is
   * only meaningfully defined further down, in the branch reached once there's an active player
   * turn. Dragging can only ever be *started* from that same branch's rack/board pointer
   * handlers, so by the time this callback actually fires, that branch's closures are valid.
   */
  const { dragState, startDrag } = useTileDrag<TileId>({
    onDrop: handleTileDrop,
  });

  /**
   * Every game action goes through here so local session/handoff state is always derived from
   * the actual resulting GameState transition (local-multiplayer.md section 43), never guessed
   * independently by a click handler, and so every authoritative transition is persisted
   * (local-multiplayer.md section 27) without having to special-case which actions count.
   */
  function dispatchTracked(action: GameAction) {
    const result = dispatch(action);
    if (result.success) {
      setSession(deriveLocalSessionAfterAction(action.type, result.state));
      setErrorMessage(undefined);
      saveLocalGame(
        result.state,
        deps.configuration.rackSize,
        deps.configuration.modifiers,
        deps.configuration.polyglotLanguages,
        deps.configuration.wildLanguages,
      );
    } else {
      setErrorMessage(describeGameError(result.error));
    }
    return result;
  }

  const playerNames = Object.fromEntries(
    state.players.map((player) => [player.id, player.name]),
  ) as Record<PlayerId, string>;

  const activeModifierLabels = Array.from(deps.configuration.modifiers).map(
    (id) => MODIFIER_COPY[id].label,
  );
  /**
   * Wild mode's active language (game-modifiers.md section 10) is derived the same way
   * submitMove.ts derives it — from history as it stands right now — so this indicator always
   * matches whichever language the next submitted move would actually be validated against.
   */
  const activeLanguageLabel = deps.configuration.modifiers.has("WILD")
    ? LANGUAGE_NAMES[
        deps.configuration.wildLanguages[
          activeWildLanguageIndex(
            state.history,
            deps.configuration.wildLanguages.length,
          )
        ]
      ]
    : undefined;

  if (state.status === "FINISHED") {
    return (
      <div className={styles.gameScreen}>
        <GameOverScreen
          players={state.players}
          result={state.result}
          history={state.history}
          onNewGame={onExit}
        />
      </div>
    );
  }

  if (state.turnState.type === "FINISHED") {
    // Unreachable in practice: assertValidGameState keeps status and turnState.type in sync.
    // TypeScript can't see that correlation, so this narrows the type for the code below.
    return null;
  }

  if (session.mode !== "PLAYING") {
    const { message, continueLabel } = describeHandoff(session, state);
    return (
      <HandoffScreen
        message={message}
        continueLabel={continueLabel}
        onContinue={() => setSession({ mode: "PLAYING" })}
      />
    );
  }

  if (state.turnState.type === "WAITING_FOR_OPPONENT_APPROVAL") {
    const { proposingPlayerId, reviewingPlayerId } = state.turnState;
    const proposingPlayer = state.players.find(
      (p) => p.id === proposingPlayerId,
    )!;
    const pendingMove = state.pendingMove;
    const unknownWords = (pendingMove?.wordResults ?? [])
      .filter((result) => result.status === "UNKNOWN_WORD")
      .map((result) => result.word);
    const scorePreview = pendingMove?.scorePreview?.total ?? 0;

    function handleAccept() {
      dispatchTracked({ type: "ACCEPT_PROPOSED_MOVE", reviewingPlayerId });
    }

    function handleReject() {
      dispatchTracked({ type: "REJECT_PROPOSED_MOVE", reviewingPlayerId });
    }

    return (
      <div className={styles.gameScreen}>
        <ScoreBoard
          players={state.players.map((player) => ({
            name: player.name,
            score: player.score,
            isCurrent: false,
          }))}
          tilesRemaining={state.tileBag.tileIds.length}
          activeModifierLabels={activeModifierLabels}
          activeLanguageLabel={activeLanguageLabel}
        />

        {errorMessage && (
          <p role="alert" className={styles.error}>
            {errorMessage}
          </p>
        )}

        <OpponentReview
          proposingPlayerName={proposingPlayer.name}
          words={unknownWords}
          scorePreview={scorePreview}
          onAccept={handleAccept}
          onReject={handleReject}
        />

        <div className={styles.layout}>
          <div className={styles.boardColumn}>
            <Board
              boardDefinition={deps.configuration.boardDefinition}
              boardState={state.board}
              tiles={state.tiles}
              pendingPlacedTiles={pendingMove?.placedTiles ?? []}
              canPlaceSelectedTile={false}
              onPlaceAt={() => {}}
              onPendingTileClick={() => {}}
            />
          </div>

          <div className={styles.historyColumn}>
            <GameHistory history={state.history} playerNames={playerNames} />
          </div>
        </div>
      </div>
    );
  }

  const currentPlayerId = state.turnState.playerId;
  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)!;

  // Tiles this move displaced off the board, which are in the rack but still restricted for the
  // rest of the turn (game-modifiers.md section 7). Derived from the same engine helper the
  // placement rules use, so the highlight can never disagree with what the engine will allow.
  const displacedTileIds = tilesDisplacedThisMove(
    state.pendingMove?.placedTiles ?? [],
  );

  const rackTiles: RackTileView[] = currentPlayer.rack.tileIds.map((tileId) => {
    const tile = state.tiles[tileId];
    return {
      id: tileId,
      letter: tileLetter(tile) ?? "",
      points: tile.points,
      isBlank: tile.kind === "BLANK",
      isDisplaced: displacedTileIds.has(tileId),
    };
  });

  const editingPlacedTile = editingBlankTileId
    ? state.pendingMove?.placedTiles.find(
        (placed) => placed.tileId === editingBlankTileId,
      )
    : undefined;

  function clearSelection() {
    setSelectedTileId(undefined);
    setPendingPlacement(undefined);
  }

  function handleSelectTile(tileId: TileId) {
    if (exchangeMode) {
      setExchangeSelection((current) => {
        const next = new Set(current);
        if (next.has(tileId)) {
          next.delete(tileId);
        } else {
          next.add(tileId);
        }
        return next;
      });
      return;
    }
    setEditingBlankTileId(undefined);
    if (selectedTileId === tileId) {
      clearSelection();
      return;
    }
    if (selectedTileId !== undefined) {
      // A tile is already picked up, so tapping another one in the rack rearranges the hand
      // rather than changing which tile is selected: the two exchange places, and the tile stays
      // selected so it can be walked along with repeated taps. Tapping it again lets go of it.
      dispatchTracked({
        type: "SWAP_RACK_TILES",
        playerId: currentPlayerId,
        firstTileId: selectedTileId,
        secondTileId: tileId,
      });
      return;
    }
    setSelectedTileId(tileId);
    setPendingPlacement(undefined);
  }

  /**
   * A selected blank tile doesn't place immediately: its letter is chosen after targeting a
   * board cell, not before (ui-design.md), so this only opens the picker via `pendingPlacement`
   * and defers the actual PLACE_TILE dispatch to `handleChoosePlacementLetter`.
   */
  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId) return;
    if (state.tiles[selectedTileId].kind === "BLANK") {
      setPendingPlacement({ tileId: selectedTileId, coordinate });
      return;
    }
    const result = dispatchTracked({
      type: "PLACE_TILE",
      playerId: currentPlayerId,
      tileId: selectedTileId,
      coordinate,
    });
    if (result.success) {
      clearSelection();
    }
  }

  function handleChoosePlacementLetter(letter: string) {
    if (!pendingPlacement) return;
    const result = dispatchTracked({
      type: "PLACE_TILE",
      playerId: currentPlayerId,
      tileId: pendingPlacement.tileId,
      coordinate: pendingPlacement.coordinate,
      representedLetter: letter,
    });
    if (result.success) {
      clearSelection();
    }
  }

  function handlePendingTileClick(tileId: TileId) {
    clearSelection();
    const tile = state.tiles[tileId];
    if (tile.kind === "BLANK") {
      setEditingBlankTileId(tileId);
      return;
    }
    dispatchTracked({
      type: "REMOVE_TILE",
      playerId: currentPlayerId,
      tileId,
    });
  }

  function tileView(tileId: TileId) {
    const tile = state.tiles[tileId];
    const pending = state.pendingMove?.placedTiles.find(
      (placed) => placed.tileId === tileId,
    );
    const letter =
      pending?.representedLetter ??
      tileLetter(tile) ??
      (tile.kind === "BLANK" ? "☐" : "");
    return { letter, points: tile.points, isBlank: tile.kind === "BLANK" };
  }

  function handleRackTilePointerDown(
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (exchangeMode || state.turnState.type !== "PLAYER_TURN") return;
    startDrag(tileId, event);
  }

  function handleBoardTilePointerDown(
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (state.turnState.type !== "PLAYER_TURN") return;
    startDrag(tileId, event);
  }

  /**
   * Fires once a drag ends with real movement (useTileDrag.ts). Resolves what's under the
   * pointer, then reuses the exact same actions the click flow already dispatches — dragging is
   * only a different way to trigger PLACE_TILE/MOVE_TILE/REMOVE_TILE, never a parallel path that
   * could disagree with the engine about what's legal.
   */
  function handleTileDrop(tileId: TileId, position: DragPointerPosition) {
    if (state.turnState.type !== "PLAYER_TURN") return;
    const target = resolveDropTarget(position);
    const pendingTile = state.pendingMove?.placedTiles.find(
      (placed) => placed.tileId === tileId,
    );

    if (pendingTile) {
      if (target.coordinate) {
        dispatchTracked({
          type: "MOVE_TILE",
          playerId: currentPlayerId,
          tileId,
          coordinate: target.coordinate,
        });
      } else if (target.overRack) {
        if (editingBlankTileId === tileId) setEditingBlankTileId(undefined);
        dispatchTracked({
          type: "REMOVE_TILE",
          playerId: currentPlayerId,
          tileId,
        });
      }
      return;
    }

    if (target.coordinate) {
      if (state.tiles[tileId].kind === "BLANK") {
        setPendingPlacement({ tileId, coordinate: target.coordinate });
        return;
      }
      const result = dispatchTracked({
        type: "PLACE_TILE",
        playerId: currentPlayerId,
        tileId,
        coordinate: target.coordinate,
      });
      if (result.success && selectedTileId === tileId) {
        clearSelection();
      }
      return;
    }

    if (target.overRack) {
      dispatchTracked({
        type: "MOVE_RACK_TILE",
        playerId: currentPlayerId,
        tileId,
        toIndex: rackDropIndex(tileId, position.x),
      });
    }
  }

  function handleChangeEditingBlankLetter(letter: string) {
    if (!editingBlankTileId) return;
    const result = dispatchTracked({
      type: "CHANGE_BLANK_LETTER",
      playerId: currentPlayerId,
      tileId: editingBlankTileId,
      representedLetter: letter,
    });
    if (result.success) {
      setEditingBlankTileId(undefined);
    }
  }

  function handleRemoveEditingTile() {
    if (!editingBlankTileId) return;
    const result = dispatchTracked({
      type: "REMOVE_TILE",
      playerId: currentPlayerId,
      tileId: editingBlankTileId,
    });
    if (result.success) {
      setEditingBlankTileId(undefined);
    }
  }

  function handleSubmit() {
    submitTriggerRef.current = document.activeElement;
    dispatchTracked({ type: "SUBMIT_MOVE", playerId: currentPlayerId });
  }

  /** "Rensa": returns every pending tile to the rack in one step (ui-design.md section 18). */
  function handleClear() {
    const result = dispatchTracked({
      type: "CLEAR_PENDING_MOVE",
      playerId: currentPlayerId,
    });
    if (result.success) {
      clearSelection();
      setEditingBlankTileId(undefined);
    }
  }

  function handlePass() {
    dispatchTracked({ type: "PASS", playerId: currentPlayerId });
  }

  function handleEndGame() {
    dispatchTracked({ type: "END_GAME", playerId: currentPlayerId });
  }

  function handleStartExchange() {
    setExchangeMode(true);
    setExchangeSelection(new Set());
    clearSelection();
  }

  function handleCancelExchange() {
    setExchangeMode(false);
    setExchangeSelection(new Set());
  }

  function handleConfirmExchange() {
    const result = dispatchTracked({
      type: "EXCHANGE_TILES",
      playerId: currentPlayerId,
      tileIds: [...exchangeSelection],
    });
    if (result.success) {
      setExchangeMode(false);
      setExchangeSelection(new Set());
    }
  }

  function handleCancelProposal() {
    dispatchTracked({ type: "CANCEL_PROPOSAL", playerId: currentPlayerId });
  }

  function handleConfirmProposal() {
    dispatchTracked({ type: "CONFIRM_PROPOSAL", playerId: currentPlayerId });
  }

  function handleShuffleRack() {
    dispatchTracked({ type: "SHUFFLE_RACK", playerId: currentPlayerId });
  }

  const hasPendingMove = state.pendingMove !== undefined;
  /**
   * REQUIRES_PLAYER_CONFIRMATION keeps the footer mounted (not just PLAYER_TURN) so the "Spela"
   * button that opens UnknownWordNotice's dialog stays an attached, focusable DOM node — a
   * detached element can't receive focus back when the dialog closes (Dialog.tsx restoreFocusTo
   * doc). The dialog's native backdrop/inert behaviour already prevents any real interaction
   * with this footer while it's open, so leaving these enabled underneath is safe.
   */
  const footerActive =
    state.turnState.type === "PLAYER_TURN" ||
    state.turnState.type === "REQUIRES_PLAYER_CONFIRMATION";
  const canSubmit =
    footerActive &&
    hasPendingMove &&
    (state.pendingMove?.placedTiles.length ?? 0) > 0;
  const canPass = footerActive && !hasPendingMove;
  const canStartExchange = canPass;
  const canClear = footerActive && hasPendingMove;
  const canEndGame = footerActive;
  const dragOverCoordinate = dragState
    ? resolveDropTarget(dragState.position).coordinate
    : undefined;

  const pendingPlacedTiles = state.pendingMove?.placedTiles ?? [];
  const scorePreview =
    pendingPlacedTiles.length > 0
      ? previewMoveScore(
          state.board,
          deps.configuration.boardDefinition,
          state.tiles,
          pendingPlacedTiles,
          deps.configuration.rackSize,
          currentPlayer.rack.tileIds.length,
          {
            allowMultiBranch: deps.configuration.modifiers.has("CRISSCROSS"),
            isFirstMoveOverride: hasCommittedMove(state.history)
              ? false
              : undefined,
          },
        )
      : undefined;
  const scoreBadgeCoordinate =
    pendingPlacedTiles.length > 0
      ? [...pendingPlacedTiles].sort(
          (a, b) =>
            a.coordinate.row - b.coordinate.row ||
            a.coordinate.column - b.coordinate.column,
        )[0].coordinate
      : undefined;

  return (
    <div className={styles.gameScreen}>
      <ScoreBoard
        players={state.players.map((player) => ({
          name: player.name,
          score: player.score,
          isCurrent: player.id === currentPlayerId,
        }))}
        tilesRemaining={state.tileBag.tileIds.length}
        activeModifierLabels={activeModifierLabels}
        activeLanguageLabel={activeLanguageLabel}
      />

      <p className={styles.turnIndicator} aria-live="polite">
        Din tur: {currentPlayer.name}
      </p>

      {errorMessage && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}

      {state.turnState.type === "REQUIRES_PLAYER_CONFIRMATION" && (
        <UnknownWordNotice
          words={(state.pendingMove?.wordResults ?? [])
            .filter((result) => result.status === "UNKNOWN_WORD")
            .map((result) => result.word)}
          scorePreview={state.pendingMove?.scorePreview?.total ?? 0}
          onEdit={handleCancelProposal}
          onConfirm={handleConfirmProposal}
          restoreFocusTo={submitTriggerRef}
        />
      )}

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            boardDefinition={deps.configuration.boardDefinition}
            boardState={state.board}
            tiles={state.tiles}
            pendingPlacedTiles={pendingPlacedTiles}
            canPlaceSelectedTile={
              state.turnState.type === "PLAYER_TURN" &&
              selectedTileId !== undefined
            }
            replaceModeActive={deps.configuration.modifiers.has("REPLACE")}
            onPlaceAt={handlePlaceAt}
            onPendingTileClick={handlePendingTileClick}
            onPendingTilePointerDown={handleBoardTilePointerDown}
            draggingTileId={dragState?.item}
            dragOverCoordinate={dragOverCoordinate}
            scoreBadgeCoordinate={scoreBadgeCoordinate}
            scoreBadgeValue={scorePreview}
          />

          {editingPlacedTile && (
            <Dialog
              titleText="Ändra bokstav för den blanka brickan"
              onClose={() => setEditingBlankTileId(undefined)}
            >
              <div className={styles.blankPicker}>
                <BlankLetterPicker
                  label="Ändra bokstav för den blanka brickan:"
                  alphabet={deps.alphabet}
                  value={editingPlacedTile.representedLetter}
                  onSelect={handleChangeEditingBlankLetter}
                />
                <button type="button" onClick={handleRemoveEditingTile}>
                  Ta bort bricka
                </button>
              </div>
            </Dialog>
          )}

          {pendingPlacement && (
            <Dialog
              titleText="Välj bokstav för den blanka brickan"
              onClose={() => setPendingPlacement(undefined)}
            >
              <BlankLetterPicker
                label="Vilken bokstav ska den blanka brickan vara?"
                alphabet={deps.alphabet}
                onSelect={handleChoosePlacementLetter}
              />
            </Dialog>
          )}
        </div>

        {footerActive && (
          <div className={styles.footer}>
            <div className={styles.rackRow}>
              <Rack
                tiles={rackTiles}
                selectedTileId={selectedTileId}
                exchangeSelection={exchangeMode ? exchangeSelection : undefined}
                onSelectTile={handleSelectTile}
                onTilePointerDown={handleRackTilePointerDown}
                draggingTileId={dragState?.item}
              />
              <button
                type="button"
                className={styles.shuffleButton}
                onClick={handleShuffleRack}
                aria-label="Blanda brickorna i din hand"
                title="Blanda brickorna i din hand"
              >
                <ShuffleIcon />
              </button>
            </div>

            <TurnActions
              canSubmit={canSubmit}
              canPass={canPass}
              canClear={canClear}
              canEndGame={canEndGame}
              exchangeMode={exchangeMode}
              exchangeSelectionCount={exchangeSelection.size}
              canStartExchange={canStartExchange}
              onSubmit={handleSubmit}
              onClear={handleClear}
              onStartExchange={handleStartExchange}
              onCancelExchange={handleCancelExchange}
              onConfirmExchange={handleConfirmExchange}
              onPass={handlePass}
              onEndGame={handleEndGame}
            />
          </div>
        )}

        <div className={styles.historyColumn}>
          <GameHistory history={state.history} playerNames={playerNames} />
        </div>
      </div>

      {dragState && (
        <div
          className={styles.dragPreview}
          style={{ left: dragState.position.x, top: dragState.position.y }}
          aria-hidden="true"
        >
          <Tile
            letter={tileView(dragState.item).letter}
            points={tileView(dragState.item).points}
            isBlank={tileView(dragState.item).isBlank}
            variant="pending"
          />
        </div>
      )}
    </div>
  );
}
