"use client";

import { useEffect, useRef, useState } from "react";

import type { TurnAction } from "../../application/online/matchApi";
import type { MatchSnapshot } from "../../application/online/matchApi";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import type { Coordinate } from "../../game/model/coordinate";
import { coordinatesEqual } from "../../game/model/coordinate";
import type { TileId } from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { tileLetter } from "../../game/model/tile";
import { Board } from "../board/Board";
import { Dialog } from "../common/Dialog";
import { GameHistory } from "../game/GameHistory";
import { GameOverScreen } from "../game/GameOverScreen";
import { BlankLetterPicker } from "../game/BlankLetterPicker";
import { OpponentReview } from "../game/OpponentReview";
import { ScoreBoard } from "../game/ScoreBoard";
import { TurnActions } from "../game/TurnActions";
import { UnknownWordNotice } from "../game/UnknownWordNotice";
import { Rack, type RackTileView } from "../rack/Rack";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";

import styles from "./OnlineGameScreen.module.css";

export interface OnlineGameScreenProps {
  readonly snapshot: MatchSnapshot;
  readonly onAction: (action: TurnAction) => void;
  readonly onRefresh: () => void;
  readonly onExit: () => void;
  readonly busy?: boolean;
  readonly error?: string;
}

/**
 * One online match, rendered from a `PlayerGameView` rather than from a `GameState`.
 *
 * That is the whole difference from the hot-seat screen, and it is not a small one: this client
 * does not hold the game. It cannot ask the engine whether a placement is legal, because it has
 * neither the opponent's rack nor the bag — nor should it (`online-multiplayer.md` section 17).
 * So arranging tiles is local and unjudged, and the server decides when the move is submitted,
 * which is exactly what section 19 recommends.
 *
 * The presentation is the same components the local game uses. They were already written against
 * plain data — a board, some tiles, a rack — rather than against engine state, so both games can
 * look identical while disagreeing entirely about who is deciding the rules.
 */
export function OnlineGameScreen({
  snapshot,
  onAction,
  onRefresh,
  onExit,
  busy,
  error,
}: OnlineGameScreenProps) {
  const { view } = snapshot;
  const viewer = view.viewerPlayerId;

  const [placements, setPlacements] = useState<readonly PendingPlacedTile[]>(
    [],
  );
  const [selectedTileId, setSelectedTileId] = useState<TileId | undefined>();
  const [blankTarget, setBlankTarget] = useState<
    { tileId: TileId; coordinate: Coordinate } | undefined
  >();
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<
    ReadonlySet<TileId>
  >(new Set());

  /*
   * The server's own pending move is the source of truth whenever it has one — most importantly
   * after a rejection, where section 26 says the placement comes back to the proposer as
   * something they can edit. Re-seeding on every new revision also discards local arranging that
   * the server has since overtaken, which is the safe direction to be wrong in.
   */
  const syncedRevision = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (syncedRevision.current === snapshot.revision) return;
    syncedRevision.current = snapshot.revision;

    const pending = view.pendingMove;
    setPlacements(
      pending && pending.playerId === viewer ? pending.placedTiles : [],
    );
    setSelectedTileId(undefined);
    setExchangeMode(false);
    setExchangeSelection(new Set());
  }, [snapshot.revision, view.pendingMove, viewer]);

  const turnState = view.turnState;
  const myTurn =
    turnState.type === "PLAYER_TURN" && turnState.playerId === viewer;
  const mustConfirm =
    turnState.type === "REQUIRES_PLAYER_CONFIRMATION" &&
    turnState.playerId === viewer;
  const mustReview =
    turnState.type === "WAITING_FOR_OPPONENT_APPROVAL" &&
    turnState.reviewingPlayerId === viewer;
  const awaitingOpponentReview =
    turnState.type === "WAITING_FOR_OPPONENT_APPROVAL" &&
    turnState.proposingPlayerId === viewer;

  const placedTileIds = new Set(placements.map((placed) => placed.tileId));
  const rackTiles: readonly RackTileView[] = view.ownRack.tileIds
    .filter((tileId) => !placedTileIds.has(tileId))
    .map((tileId) => {
      const tile = view.tiles[tileId];
      return {
        id: tileId,
        letter: tileLetter(tile) ?? "",
        points: tile.points,
        isBlank: tile.kind === "BLANK",
      };
    });

  const opponent = view.players.find((player) => player.id !== viewer);

  function place(tileId: TileId, coordinate: Coordinate) {
    setPlacements((current) => [...current, { tileId, coordinate }]);
    setSelectedTileId(undefined);
  }

  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId || !myTurn) return;
    if (
      placements.some((placed) =>
        coordinatesEqual(placed.coordinate, coordinate),
      )
    ) {
      return;
    }
    if (
      view.board.occupiedCells.some((cell) =>
        coordinatesEqual(cell.coordinate, coordinate),
      )
    ) {
      return;
    }

    const tile = view.tiles[selectedTileId];
    if (tile.kind === "BLANK") {
      // A blank's letter is chosen where it is placed, as in the local game.
      setBlankTarget({ tileId: selectedTileId, coordinate });
      return;
    }
    place(selectedTileId, coordinate);
  }

  function takeBack(tileId: TileId) {
    setPlacements((current) =>
      current.filter((placed) => placed.tileId !== tileId),
    );
  }

  function toggleExchangeTile(tileId: TileId) {
    setExchangeSelection((current) => {
      const next = new Set(current);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });
  }

  if (view.status === "FINISHED" && view.result) {
    return (
      <GameOverScreen
        players={view.players.map((player) => ({
          id: player.id,
          name: player.name,
        }))}
        result={view.result}
        history={view.history}
        boardDefinition={SCRABBLE_BOARD_DEFINITION}
        boardState={view.board}
        tiles={view.tiles}
        onNewGame={onExit}
      />
    );
  }

  function statusText(): string {
    if (mustReview)
      return "Motståndaren vill spela ett ord du inte känner igen.";
    if (awaitingOpponentReview) return "Väntar på motståndarens svar.";
    if (mustConfirm) return "Ordet finns inte i ordlistan.";
    if (myTurn) return "Din tur.";
    return "Väntar på motståndaren.";
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.button} onClick={onExit}>
          Mina matcher
        </button>
        <p className={`${styles.status} ${myTurn ? "" : styles.waiting}`}>
          {statusText()}
        </p>
        <button
          type="button"
          className={styles.button}
          onClick={onRefresh}
          disabled={busy}
        >
          Uppdatera
        </button>
      </div>

      <ScoreBoard
        players={view.players.map((player) => ({
          name: player.name,
          score: player.score,
          isCurrent: player.id === viewer,
        }))}
        tilesRemaining={view.tilesRemainingInBag}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Board
        boardDefinition={SCRABBLE_BOARD_DEFINITION}
        boardState={view.board}
        tiles={view.tiles}
        pendingPlacedTiles={placements}
        canPlaceSelectedTile={Boolean(selectedTileId) && myTurn}
        onPlaceAt={handlePlaceAt}
        onPendingTileClick={takeBack}
      />

      {mustReview ? (
        <OpponentReview
          proposingPlayerName={opponent?.name ?? "Motståndaren"}
          words={(view.pendingMove?.wordResults ?? [])
            .filter((result) => result.status === "UNKNOWN_WORD")
            .map((result) => result.normalizedWord)}
          scorePreview={view.pendingMove?.scorePreview?.total ?? 0}
          onAccept={() => onAction({ type: "ACCEPT_PROPOSED_MOVE" })}
          onReject={() => onAction({ type: "REJECT_PROPOSED_MOVE" })}
        />
      ) : (
        <>
          <Rack
            tiles={rackTiles}
            selectedTileId={selectedTileId}
            exchangeSelection={exchangeMode ? exchangeSelection : undefined}
            onSelectTile={(tileId) =>
              exchangeMode
                ? toggleExchangeTile(tileId)
                : setSelectedTileId(
                    tileId === selectedTileId ? undefined : tileId,
                  )
            }
          />

          <TurnActions
            canSubmit={myTurn && placements.length > 0 && !busy}
            canPass={myTurn && !busy}
            canClear={placements.length > 0}
            canEndGame={false}
            showEndGame={false}
            exchangeMode={exchangeMode}
            exchangeSelectionCount={exchangeSelection.size}
            canStartExchange={myTurn && !busy && placements.length === 0}
            onSubmit={() =>
              onAction({
                type: "SUBMIT_MOVE",
                placements: placements.map((placed) => ({
                  tileId: placed.tileId,
                  coordinate: placed.coordinate,
                  representedLetter: placed.representedLetter,
                })),
              })
            }
            onClear={() => setPlacements([])}
            onStartExchange={() => setExchangeMode(true)}
            onCancelExchange={() => {
              setExchangeMode(false);
              setExchangeSelection(new Set());
            }}
            onConfirmExchange={() =>
              onAction({
                type: "EXCHANGE_TILES",
                tileIds: [...exchangeSelection],
              })
            }
            onPass={() => onAction({ type: "PASS" })}
            onEndGame={() => undefined}
          />
        </>
      )}

      {mustConfirm && (
        <UnknownWordNotice
          words={(view.pendingMove?.wordResults ?? [])
            .filter((result) => result.status === "UNKNOWN_WORD")
            .map((result) => result.normalizedWord)}
          scorePreview={view.pendingMove?.scorePreview?.total ?? 0}
          onEdit={() => onAction({ type: "CANCEL_PROPOSAL" })}
          onConfirm={() => onAction({ type: "CONFIRM_PROPOSAL" })}
        />
      )}

      {blankTarget && (
        <Dialog
          titleText="Välj bokstav för den blanka brickan"
          onClose={() => setBlankTarget(undefined)}
        >
          <BlankLetterPicker
            label="Välj bokstav för den blanka brickan:"
            alphabet={SWEDISH_ALPHABET}
            onSelect={(letter) => {
              setPlacements((current) => [
                ...current,
                {
                  tileId: blankTarget.tileId,
                  coordinate: blankTarget.coordinate,
                  representedLetter: letter,
                },
              ]);
              setSelectedTileId(undefined);
              setBlankTarget(undefined);
            }}
          />
        </Dialog>
      )}

      <GameHistory
        history={view.history}
        playerNames={Object.fromEntries(
          view.players.map((player) => [player.id, player.name]),
        )}
      />
    </div>
  );
}
