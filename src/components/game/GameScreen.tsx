"use client";

import { useState } from "react";
import { describeGameError } from "../../application/game-controller/errorMessages";
import type { GameControllerDependencies } from "../../application/game-controller/gameController";
import { useGameController } from "../../application/game-controller/useGameController";
import type { Coordinate } from "../../game/model/coordinate";
import type { GameState } from "../../game/model/game";
import type { TileId } from "../../game/model/ids";
import { tileLetter } from "../../game/model/tile";
import { Board } from "../board/Board";
import { Rack, type RackTileView } from "../rack/Rack";
import styles from "./GameScreen.module.css";
import { ScoreBoard } from "./ScoreBoard";
import { TurnActions } from "./TurnActions";

export interface GameScreenProps {
  readonly initialState: GameState;
  readonly deps: GameControllerDependencies;
  readonly onExit: () => void;
}

/**
 * The main game screen (roadmap.md Milestone 3). Hot-seat privacy handoffs (Milestone 3.3),
 * the full unknown-word proposal/review flow (Milestone 3.2), and blank-tile polish
 * (Milestone 3.1) are intentionally minimal placeholders here and are completed in their own
 * milestones; this screen only needs to support ordinary dictionary-valid turns end to end.
 */
export function GameScreen({ initialState, deps, onExit }: GameScreenProps) {
  const { state, dispatch } = useGameController(initialState, deps);
  const [selectedTileId, setSelectedTileId] = useState<TileId | undefined>();
  const [pendingBlankLetter, setPendingBlankLetter] = useState<
    string | undefined
  >();
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<Set<TileId>>(
    new Set(),
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  if (state.status === "FINISHED") {
    return (
      <div className={styles.gameScreen}>
        <h1>Spelet är slut</h1>
        {state.players.map((player) => (
          <p key={player.id}>
            {player.name}: {state.result.finalScores[player.id]}
            {state.result.winnerPlayerIds.includes(player.id) ? " 🏆" : ""}
          </p>
        ))}
        {state.result.winnerPlayerIds.length === 0 && <p>Oavgjort.</p>}
        <button type="button" onClick={onExit}>
          Till startsidan
        </button>
      </div>
    );
  }

  if (
    state.turnState.type !== "PLAYER_TURN" &&
    state.turnState.type !== "REQUIRES_PLAYER_CONFIRMATION"
  ) {
    return (
      <div className={styles.gameScreen}>
        <p>Det här läget stöds inte ännu i gränssnittet.</p>
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
    if (selectedTileId === tileId) {
      clearSelection();
      return;
    }
    setSelectedTileId(tileId);
    setPendingBlankLetter(undefined);
  }

  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId || selectedIsUnresolvedBlank) return;
    const result = dispatch({
      type: "PLACE_TILE",
      playerId: currentPlayerId,
      tileId: selectedTileId,
      coordinate,
      representedLetter: pendingBlankLetter,
    });
    if (result.success) {
      clearSelection();
      setErrorMessage(undefined);
    } else {
      setErrorMessage(describeGameError(result.error));
    }
  }

  function handlePickUpPending(tileId: TileId) {
    const result = dispatch({
      type: "REMOVE_TILE",
      playerId: currentPlayerId,
      tileId,
    });
    setErrorMessage(
      result.success ? undefined : describeGameError(result.error),
    );
  }

  function handleSubmit() {
    const result = dispatch({
      type: "SUBMIT_MOVE",
      playerId: currentPlayerId,
    });
    setErrorMessage(
      result.success ? undefined : describeGameError(result.error),
    );
  }

  function handlePass() {
    const result = dispatch({ type: "PASS", playerId: currentPlayerId });
    setErrorMessage(
      result.success ? undefined : describeGameError(result.error),
    );
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
    const result = dispatch({
      type: "EXCHANGE_TILES",
      playerId: currentPlayerId,
      tileIds: [...exchangeSelection],
    });
    if (result.success) {
      setExchangeMode(false);
      setExchangeSelection(new Set());
      setErrorMessage(undefined);
    } else {
      setErrorMessage(describeGameError(result.error));
    }
  }

  function handleCancelProposal() {
    const result = dispatch({
      type: "CANCEL_PROPOSAL",
      playerId: currentPlayerId,
    });
    setErrorMessage(
      result.success ? undefined : describeGameError(result.error),
    );
  }

  const hasPendingMove = state.pendingMove !== undefined;
  const canSubmit =
    state.turnState.type === "PLAYER_TURN" &&
    hasPendingMove &&
    (state.pendingMove?.placedTiles.length ?? 0) > 0;
  const canPass = state.turnState.type === "PLAYER_TURN" && !hasPendingMove;
  const canStartExchange = canPass;

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

      <p className={styles.turnIndicator}>Din tur: {currentPlayer.name}</p>

      {errorMessage && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}

      {state.turnState.type === "REQUIRES_PLAYER_CONFIRMATION" && (
        <div className={styles.unknownWordNotice}>
          <p>
            {(state.pendingMove?.wordResults ?? [])
              .filter((result) => result.status === "UNKNOWN_WORD")
              .map((result) => `"${result.word}"`)
              .join(", ")}{" "}
            finns inte i ordlistan.
          </p>
          <p>
            Att föreslå ordet till motståndaren stöds inte ännu i den här
            versionen. Tryck Ändra för att redigera din läggning.
          </p>
          <button type="button" onClick={handleCancelProposal}>
            Ändra
          </button>
        </div>
      )}

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
        onPickUpPending={handlePickUpPending}
      />

      {state.turnState.type === "PLAYER_TURN" && (
        <>
          <Rack
            tiles={rackTiles}
            selectedTileId={selectedTileId}
            exchangeSelection={exchangeMode ? exchangeSelection : undefined}
            onSelectTile={handleSelectTile}
          />

          {selectedIsUnresolvedBlank && (
            <label className={styles.blankPicker}>
              Vilken bokstav ska den blanka brickan vara?
              <select
                value=""
                onChange={(event) => setPendingBlankLetter(event.target.value)}
              >
                <option value="" disabled>
                  Välj bokstav
                </option>
                {deps.alphabet.map((letter) => (
                  <option key={letter} value={letter}>
                    {letter}
                  </option>
                ))}
              </select>
            </label>
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
        </>
      )}
    </div>
  );
}
