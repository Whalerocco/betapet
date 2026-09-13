"use client";

import { useEffect, useRef, useState } from "react";

import type { TurnAction } from "../../application/online/matchApi";
import type { MatchSnapshot } from "../../application/online/matchApi";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import type { Coordinate } from "../../game/model/coordinate";
import { coordinatesEqual } from "../../game/model/coordinate";
import { activeWildLanguageIndex } from "../../game/engine/wildRotation";
import type { TileId } from "../../game/model/ids";
import type { LanguageCode } from "../../game/model/language";
import type { ModifierId } from "../../game/model/modifiers";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { tileLetter } from "../../game/model/tile";
import { Board } from "../board/Board";
import { Dialog } from "../common/Dialog";
import { GameHistory } from "../game/GameHistory";
import { LANGUAGE_NAMES } from "../game/languageNames";
import { MODIFIER_COPY } from "../game/modifierCopy";
import { GameOverScreen } from "../game/GameOverScreen";
import { BlankLetterPicker } from "../game/BlankLetterPicker";
import { OpponentReview } from "../game/OpponentReview";
import { ScoreBoard } from "../game/ScoreBoard";
import { TurnActions } from "../game/TurnActions";
import { UnknownWordNotice } from "../game/UnknownWordNotice";
import { Rack, type RackTileView } from "../rack/Rack";
import { ShuffleButton } from "../rack/ShuffleButton";
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
  /*
   * The order this player wants their own tiles in (T28.5).
   *
   * Shuffling is kept local rather than sent to the server, which is the same division DEC-026
   * already draws: the client arranges tiles, the server decides rules. Two things follow from
   * it. The opponent is unaffected — a rack shuffle cannot bump the match revision and so cannot
   * bounce a move they have in flight as `STALE_REVISION` — and the order is not remembered when
   * the match is reopened, since the server's rack order is the one that was stored.
   */
  const [rackOrder, setRackOrder] = useState<readonly TileId[]>([]);
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

  /*
   * The server's rack, in this player's chosen order: the tiles they have arranged, still in that
   * arrangement, followed by anything they have drawn since. Reconciled rather than stored, so a
   * poll that brings new tiles cannot leave the rack showing a stale hand.
   */
  const held = new Set(view.ownRack.tileIds);
  const arranged = rackOrder.filter((tileId) => held.has(tileId));
  const orderedRackIds: readonly TileId[] = [
    ...arranged,
    ...view.ownRack.tileIds.filter((tileId) => !arranged.includes(tileId)),
  ];

  const rackTiles: readonly RackTileView[] = orderedRackIds
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

  /*
   * What this match is played by (T28.6). The game view carries a `configurationId` and nothing
   * more about the rules, so without this the screen could not tell that Replace mode was on and
   * never offered a committed tile as a target.
   */
  const modifiers = snapshot.configuration.modifiers;
  const replaceModeActive = modifiers.includes("REPLACE");
  const activeModifierLabels = modifiers.map(
    (id) => MODIFIER_COPY[id as ModifierId]?.label ?? id,
  );
  /*
   * Wild mode's active language, derived from history exactly as `submitMove` derives it, so the
   * indicator names the language the next move would actually be validated against
   * (`game-modifiers.md` section 10).
   */
  const wildLanguages = snapshot.configuration.wildLanguages ?? [];
  const activeLanguageLabel =
    modifiers.includes("WILD") && wildLanguages.length > 0
      ? (LANGUAGE_NAMES[
          wildLanguages[
            activeWildLanguageIndex(view.history, wildLanguages.length)
          ] as LanguageCode
        ] ?? undefined)
      : undefined;

  function handleShuffleRack() {
    const shuffled = [...orderedRackIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRackOrder(shuffled);
  }

  /**
   * Puts the tile on the square, taking over from whatever this move had put there before.
   *
   * Replacing an earlier placement is how a swap works (DEC-017): the tile that was there is no
   * longer placed, so it is back in the hand by the same rule that put it on the board — the rack
   * is the tiles the server says you hold, less the ones you have placed.
   */
  function place(tileId: TileId, coordinate: Coordinate) {
    setPlacements((current) => [
      ...current.filter(
        (placed) => !coordinatesEqual(placed.coordinate, coordinate),
      ),
      { tileId, coordinate },
    ]);
    setSelectedTileId(undefined);
  }

  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId || !myTurn) return;

    /*
     * An occupied square is a legitimate target in two cases, and refusing both outright is what
     * made Replace mode do nothing at all online (T28.6): a committed tile can be replaced when
     * Replace mode is on (`game-modifiers.md` section 7), and one of this move's own tiles can be
     * swapped for another in any mode (DEC-017). The board already offers exactly those squares.
     *
     * Whether a particular replace is *allowed* — the same letter, or a chain — stays the
     * engine's judgment, made on the server against the authoritative state. This client has
     * never decided a rule and does not start here.
     */
    const holdsCommittedTile = view.board.occupiedCells.some((cell) =>
      coordinatesEqual(cell.coordinate, coordinate),
    );
    if (holdsCommittedTile && !replaceModeActive) return;

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
        activeModifierLabels={activeModifierLabels}
        activeLanguageLabel={activeLanguageLabel}
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
        replaceModeActive={replaceModeActive}
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
          <div className={styles.rackRow}>
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
            <ShuffleButton onClick={handleShuffleRack} />
          </div>

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
