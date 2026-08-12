"use client";

import { useState, type PointerEvent } from "react";
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
  parseCoordinateKey,
  type Coordinate,
} from "../../game/model/coordinate";
import type { GameState } from "../../game/model/game";
import type { PlayerId, TileId } from "../../game/model/ids";
import { tileLetter } from "../../game/model/tile";
import { Board } from "../board/Board";
import { Tile } from "../common/Tile";
import type { DragPointerPosition } from "../common/useTileDrag";
import { useTileDrag } from "../common/useTileDrag";
import { Rack, type RackTileView } from "../rack/Rack";
import { BlankLetterPicker } from "./BlankLetterPicker";
import { GameHistory } from "./GameHistory";
import { GameOverScreen } from "./GameOverScreen";
import styles from "./GameScreen.module.css";
import { HandoffScreen } from "./HandoffScreen";
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
  const [pendingBlankLetter, setPendingBlankLetter] = useState<
    string | undefined
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
      saveLocalGame(result.state, deps.configuration.rackSize);
    } else {
      setErrorMessage(describeGameError(result.error));
    }
    return result;
  }

  const playerNames = Object.fromEntries(
    state.players.map((player) => [player.id, player.name]),
  ) as Record<PlayerId, string>;

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

          <GameHistory
            history={state.history}
            playerNames={playerNames}
            defaultOpen={false}
          />
        </div>
      </div>
    );
  }

  const currentPlayerId = state.turnState.playerId;
  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)!;

  const rackTiles: RackTileView[] = currentPlayer.rack.tileIds.map((tileId) => {
    const tile = state.tiles[tileId];
    return {
      id: tileId,
      letter: tileLetter(tile) ?? "",
      points: tile.points,
      isBlank: tile.kind === "BLANK",
    };
  });

  const selectedTile = selectedTileId ? state.tiles[selectedTileId] : undefined;
  const selectedIsUnresolvedBlank =
    selectedTile?.kind === "BLANK" && pendingBlankLetter === undefined;

  const editingPlacedTile = editingBlankTileId
    ? state.pendingMove?.placedTiles.find(
        (placed) => placed.tileId === editingBlankTileId,
      )
    : undefined;

  function clearSelection() {
    setSelectedTileId(undefined);
    setPendingBlankLetter(undefined);
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
    setSelectedTileId(tileId);
    setPendingBlankLetter(undefined);
  }

  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId || selectedIsUnresolvedBlank) return;
    const result = dispatchTracked({
      type: "PLACE_TILE",
      playerId: currentPlayerId,
      tileId: selectedTileId,
      coordinate,
      representedLetter: pendingBlankLetter,
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

  /**
   * A rack tile can only start a drag once its represented letter is already decided — an
   * unresolved blank stays tap-only (select it, choose a letter, then place it), so this simply
   * never starts a drag for one rather than trying to fold letter-choosing into the gesture.
   */
  function handleRackTilePointerDown(
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (exchangeMode || state.turnState.type !== "PLAYER_TURN") return;
    if (state.tiles[tileId].kind === "BLANK") return;
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
      const result = dispatchTracked({
        type: "PLACE_TILE",
        playerId: currentPlayerId,
        tileId,
        coordinate: target.coordinate,
      });
      if (result.success && selectedTileId === tileId) {
        clearSelection();
      }
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
    dispatchTracked({ type: "SUBMIT_MOVE", playerId: currentPlayerId });
  }

  function handlePass() {
    dispatchTracked({ type: "PASS", playerId: currentPlayerId });
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
  const canSubmit =
    state.turnState.type === "PLAYER_TURN" &&
    hasPendingMove &&
    (state.pendingMove?.placedTiles.length ?? 0) > 0;
  const canPass = state.turnState.type === "PLAYER_TURN" && !hasPendingMove;
  const canStartExchange = canPass;
  const dragOverCoordinate = dragState
    ? resolveDropTarget(dragState.position).coordinate
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
        />
      )}

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            boardDefinition={deps.configuration.boardDefinition}
            boardState={state.board}
            tiles={state.tiles}
            pendingPlacedTiles={state.pendingMove?.placedTiles ?? []}
            canPlaceSelectedTile={
              state.turnState.type === "PLAYER_TURN" &&
              selectedTileId !== undefined &&
              !selectedIsUnresolvedBlank
            }
            onPlaceAt={handlePlaceAt}
            onPendingTileClick={handlePendingTileClick}
            onPendingTilePointerDown={handleBoardTilePointerDown}
            draggingTileId={dragState?.item}
            dragOverCoordinate={dragOverCoordinate}
          />

          {editingPlacedTile && (
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
          )}
        </div>

        <GameHistory
          history={state.history}
          playerNames={playerNames}
          defaultOpen={false}
        />
      </div>

      {state.turnState.type === "PLAYER_TURN" && (
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
            >
              Blanda brickor
            </button>
          </div>

          {selectedIsUnresolvedBlank && (
            <BlankLetterPicker
              label="Vilken bokstav ska den blanka brickan vara?"
              alphabet={deps.alphabet}
              value={pendingBlankLetter}
              onSelect={setPendingBlankLetter}
            />
          )}

          <TurnActions
            canSubmit={canSubmit}
            canPass={canPass}
            exchangeMode={exchangeMode}
            exchangeSelectionCount={exchangeSelection.size}
            canStartExchange={canStartExchange}
            onSubmit={handleSubmit}
            onStartExchange={handleStartExchange}
            onCancelExchange={handleCancelExchange}
            onConfirmExchange={handleConfirmExchange}
            onPass={handlePass}
          />
        </div>
      )}

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
