"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { ChatMessage } from "../../application/online/chatApi";
import { localArrangement } from "../../application/online/localArrangement";
import { describeBadge } from "../../application/online/notificationCopy";
import {
  formatBadgeCount,
  matchesWaitingCount,
  type Notification,
} from "../../application/online/notificationsApi";
import type { TurnAction } from "../../application/online/matchApi";
import type { MatchSnapshot } from "../../application/online/matchApi";
import {
  pendingMoveScorePreview,
  type ScorePreview,
} from "../../application/game-controller/scorePreview";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import type { Coordinate } from "../../game/model/coordinate";
import type { RackSize } from "../../game/model/gameConfiguration";
import { coordinatesEqual } from "../../game/model/coordinate";
import { activeWildLanguageIndex } from "../../game/engine/wildRotation";
import type { TileId } from "../../game/model/ids";
import type { LanguageCode } from "../../game/model/language";
import type { ModifierId } from "../../game/model/modifiers";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { tileLetter } from "../../game/model/tile";
import { Board } from "../board/Board";
import { Dialog } from "../common/Dialog";
import { Tile } from "../common/Tile";
import { rackDropIndex, resolveDropTarget } from "../common/tileDropTargets";
import type { DragPointerPosition } from "../common/useTileDrag";
import { useTileDrag } from "../common/useTileDrag";
import { GameHistory } from "../game/GameHistory";
import { useHistoryDrawer } from "../game/useHistoryDrawer";
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
import { MatchChat } from "./MatchChat";

import styles from "./OnlineGameScreen.module.css";

export interface OnlineGameScreenProps {
  readonly snapshot: MatchSnapshot;
  readonly onAction: (action: TurnAction) => void;
  readonly onRefresh: () => void;
  readonly onExit: () => void;
  /**
   * Play the same opponent again (T34.2): opens match creation with them already chosen, named
   * by the handle the match carries (DEC-036). Optional, since a caller that cannot offer it —
   * or a match whose opponent has no identity to pass on — simply shows `Tillbaka` alone.
   */
  readonly onRematch?: (opponent: {
    readonly name: string;
    readonly handle: string;
  }) => void;
  readonly busy?: boolean;
  readonly error?: string;

  /*
   * The match's conversation (T29.1). It arrives beside the game rather than inside it, because
   * it is stored beside the game (`online-multiplayer.md` section 39) — the screen is where the
   * two are put next to each other, and that is the only place they meet.
   */
  /**
   * What is waiting elsewhere (T30.1), so the way back says how much. The count is taken here
   * rather than passed as a number because this screen is the only place that knows which match
   * to leave out of it — its own.
   */
  readonly notifications?: readonly Notification[];

  readonly chatMessages?: readonly ChatMessage[];
  readonly chatMaxLength?: number;
  /** Which messages are the viewer's own; a user id, not the engine's player id. */
  readonly viewerUserId?: string;
  readonly onSendMessage?: (text: string) => void;
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
  onRematch,
  busy,
  error,
  notifications = [],
  chatMessages,
  chatMaxLength,
  viewerUserId,
  onSendMessage,
}: OnlineGameScreenProps) {
  const { view } = snapshot;
  const viewer = view.viewerPlayerId;

  const [placements, setPlacements] = useState<readonly PendingPlacedTile[]>(
    [],
  );
  const [selectedTileId, setSelectedTileId] = useState<TileId | undefined>();
  const historyDrawer = useHistoryDrawer();
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

  /*
   * Dragging tiles, the same gesture the hot-seat screen has always had and this one never did
   * (`known-bugs.md` item 21). The hook and the hit-testing are shared; what a drop *means* is
   * the middle layer `architecture.md` section 24 is about, so it is written here against the
   * local arrangement rather than dispatched into an engine this client does not have.
   *
   * Wired among the hooks, before the early returns, even though `handleTileDrop` is a hoisted
   * function declaration whose body only makes sense further down — a drag can only be *started*
   * from the rack or the board, which are rendered past that point, so the bindings it closes
   * over are always initialised by the time it runs. `GameScreen` does the same.
   */
  const { dragState, startDrag } = useTileDrag<TileId>({
    onDrop: handleTileDrop,
  });

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
  const moveUnderReview = mustReview || awaitingOpponentReview;

  /*
   * What the board draws: the pending move itself while one is under review, and otherwise this
   * client's own local arrangement.
   *
   * The distinction matters only for the reviewer, and that is where it was missing (item 17 in
   * `known-bugs.md`). `placements` is seeded from the server's pending move only when the move is
   * the viewer's own, so the reviewer's board was empty of exactly the tiles they were being
   * asked to judge — a decision about a word that was nowhere on screen. The view already carries
   * the opponent's pending move once it has been proposed to them, and no earlier
   * (`isPendingMoveVisibleTo`), so this needs nothing new from the server.
   */
  const renderedPlacements: readonly PendingPlacedTile[] = moveUnderReview
    ? (view.pendingMove?.placedTiles ?? [])
    : placements;

  /** The pending move the server is holding for this player, if any (never the opponent's). */
  const ownServerPending: readonly PendingPlacedTile[] =
    view.pendingMove && view.pendingMove.playerId === viewer
      ? view.pendingMove.placedTiles
      : [];

  /*
   * Replace mode, worked out locally (`game-modifiers.md` section 7, `known-bugs.md` item 20).
   *
   * A placement onto a committed tile displaces it into this player's hand at once, exactly as
   * the engine does at placement time. The screen used to track placements without modelling
   * that, and so drew a board contradicting the move it was about to send — the played tile
   * seemingly vanishing behind the committed one, the displaced tile arriving nowhere, and the
   * hand a tile short until `Spela` revealed the placement had been real all along.
   *
   * `localArrangement` is the whole model, kept out here where it can be tested against the
   * engine's own `placeTile` rather than through the screen. It judges nothing: whether a
   * particular replace is allowed stays the server's call, refused after `Spela`.
   */
  const arrangement = localArrangement({
    board: view.board,
    ownRackTileIds: view.ownRack.tileIds,
    serverPending: ownServerPending,
    placements: renderedPlacements,
    tiles: view.tiles,
  });
  const boardPlacements = arrangement.placements;
  const localBoard = arrangement.board;
  /*
   * While the *opponent's* move is the one being drawn, none of it is the viewer's: not the
   * placements, and not whatever they displaced. The hand is then exactly the rack the server
   * sent — and is not on screen at all, the review replacing it (ui-design.md section 27).
   */
  const displacedTileIds = mustReview
    ? new Set<TileId>()
    : arrangement.displacedTileIds;

  const placedTileIds = new Set(placements.map((placed) => placed.tileId));

  /*
   * The tiles this player is holding, which is not the same as the rack the server reports.
   *
   * While the server has a pending move of theirs — after "Ändra" on an unknown word, or after
   * the opponent rejected one — those tiles are *on the board*, not in `ownRack`. Taking one back
   * off the board is a local act, so a rack built from `ownRack` alone left the tile in neither
   * place: gone from the board and never arriving in the hand (`known-bugs.md` item 15).
   */
  const serverPendingTileIds: readonly TileId[] = ownServerPending.map(
    (placed) => placed.tileId,
  );
  const heldTileIds = mustReview
    ? view.ownRack.tileIds
    : arrangement.heldTileIds;

  /*
   * In this player's chosen order: the tiles they have arranged, still in that arrangement,
   * followed by anything they have drawn since. Reconciled rather than stored, so a poll that
   * brings new tiles cannot leave the rack showing a stale hand.
   */
  const held = new Set(heldTileIds);
  const arranged = rackOrder.filter((tileId) => held.has(tileId));
  const orderedRackIds: readonly TileId[] = [
    ...arranged,
    ...heldTileIds.filter((tileId) => !arranged.includes(tileId)),
  ];

  const rackTiles: readonly RackTileView[] = orderedRackIds
    .filter((tileId) => !placedTileIds.has(tileId))
    .map((tileId) => {
      const tile = view.tiles[tileId];
      return {
        id: tileId,
        letter: tileLetter(tile) ?? "",
        points: tile.points,
        isDisplaced: displacedTileIds.has(tileId),
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

  /*
   * What the placement in progress would score (T34.1, DEC-035).
   *
   * Computed here on the client, from the same engine function the hot-seat screen uses. Nothing
   * in it is hidden information: the board, the multiplier layout, the point values of the tiles
   * being placed, and the size of this player's own hand. DEC-026 left this out on the grounds
   * that an online client cannot run the engine, which is true of *judging* a move — that needs
   * the bag and the opponent's rack — and not true of scoring one.
   *
   * Two limits follow from arranging tiles locally, both of them honest rather than hidden. A
   * placement that replaces a committed tile (Replace mode) shows no preview, because this client
   * does not model the displacement and so cannot say what the board would look like; and the
   * preview is silent about word validity, exactly as it is in the hot-seat game — a word that
   * does not exist still previews its score, and the dictionary has its say after `Spela`.
   *
   * The rack size comes from the match's configuration, which the server validated when the match
   * was created (`requests.ts` RACK_SIZES), so it is narrowed here rather than re-checked.
   */
  const preview: ScorePreview = moveUnderReview
    ? {}
    : pendingMoveScorePreview({
        boardState: localBoard,
        boardDefinition: SCRABBLE_BOARD_DEFINITION,
        tiles: view.tiles,
        placedTiles: boardPlacements,
        rackSize: snapshot.configuration.rackSize as RackSize,
        tilesLeftInRack: rackTiles.length,
        crisscrossMode: modifiers.includes("CRISSCROSS"),
        history: view.history,
      });

  /**
   * The tile under the finger, drawn as it should look while it is being carried: a blank shows
   * the letter it was placed as, and an unplaced one its empty face.
   */
  const dragged = dragState ? view.tiles[dragState.item] : undefined;
  const draggedPlacement = dragState
    ? boardPlacements.find((placed) => placed.tileId === dragState.item)
    : undefined;
  const draggedTile = dragged
    ? {
        letter:
          draggedPlacement?.representedLetter ??
          tileLetter(dragged) ??
          (dragged.kind === "BLANK" ? "☐" : ""),
        points: dragged.points,
        isBlank: dragged.kind === "BLANK",
      }
    : undefined;

  /** The square a drag is hovering over, so it lights up before the tile is let go of. */
  const dragOverCoordinate = dragState
    ? resolveDropTarget(dragState.position).coordinate
    : undefined;

  /** Tiles are placed, here or on the server, so this turn is in the middle of something. */
  const hasMoveInProgress =
    placements.length > 0 || serverPendingTileIds.length > 0;

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
  function place(
    tileId: TileId,
    coordinate: Coordinate,
    representedLetter?: string,
  ) {
    setPlacements((current) => [
      ...current.filter(
        (placed) => !coordinatesEqual(placed.coordinate, coordinate),
      ),
      { tileId, coordinate, representedLetter },
    ]);
    setSelectedTileId(undefined);
  }

  /**
   * Puts a tile the player is holding on a square, however it got there — tapped onto it or
   * dragged. Both gestures are meant to be the same act (`ui-design.md` section 11), so they go
   * through one function rather than two that could come to disagree.
   */
  function placeFromHand(tileId: TileId, coordinate: Coordinate) {
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
    const holdsCommittedTile = localBoard.occupiedCells.some((cell) =>
      coordinatesEqual(cell.coordinate, coordinate),
    );
    if (holdsCommittedTile && !replaceModeActive) return;

    const tile = view.tiles[tileId];
    if (tile.kind === "BLANK") {
      // A blank's letter is chosen where it is placed, as in the local game.
      setBlankTarget({ tileId, coordinate });
      return;
    }
    place(tileId, coordinate);
  }

  function handlePlaceAt(coordinate: Coordinate) {
    if (!selectedTileId || !myTurn) return;
    placeFromHand(selectedTileId, coordinate);
  }

  /**
   * Takes one placed tile back into the hand.
   *
   * A replacement takes its consequences back with it: the committed tile it displaced returns to
   * its square (`boardBeforeMove` above), and if the player had already played that displaced
   * tile somewhere else this move, that placement is undone too — one tile cannot be in both
   * places. This is `removePendingTile`'s rule, which the hot-seat game gets from the engine and
   * this screen has to arrange for itself; without it the tile appeared twice on the board and
   * the move was refused at `Spela` with a puzzling `TILE_NOT_IN_RACK`.
   */
  function takeBack(tileId: TileId) {
    const removed = boardPlacements.find((placed) => placed.tileId === tileId);
    const returningTileId = removed?.replacedTileId;
    setPlacements((current) =>
      current.filter(
        (placed) =>
          placed.tileId !== tileId && placed.tileId !== returningTileId,
      ),
    );
  }

  /**
   * Moves a tile this move has already placed to another square — what `MOVE_TILE` is in the
   * hot-seat game, and a gesture with no tap equivalent.
   *
   * It takes the tile off its old square first, so a tile moved off a square it had replaced puts
   * the committed tile back exactly as picking it up would (`takeBack`): a move is never a
   * placement that forgot where it came from.
   */
  function moveTo(placed: PendingPlacedTile, coordinate: Coordinate) {
    if (coordinatesEqual(placed.coordinate, coordinate)) return;
    const holdsCommittedTile = localBoard.occupiedCells.some((cell) =>
      coordinatesEqual(cell.coordinate, coordinate),
    );
    if (holdsCommittedTile && !replaceModeActive) return;
    takeBack(placed.tileId);
    place(placed.tileId, coordinate, placed.representedLetter);
  }

  /**
   * Where a tile sits in this player's own hand (T28.5), moved by dragging it between two others.
   *
   * `toIndex` counts the tiles actually drawn in the rack, which is the hand less whatever is on
   * the board; `rackOrder` is the whole hand, so the drop is anchored to the tile it landed
   * before rather than to a raw index. That keeps a placed tile's own position in the order when
   * it comes back.
   */
  function moveRackTile(tileId: TileId, toIndex: number) {
    const visible = rackTiles
      .map((tile) => tile.id)
      .filter((id) => id !== tileId);
    const anchor = visible[toIndex];
    const without = orderedRackIds.filter((id) => id !== tileId);
    const at = anchor === undefined ? without.length : without.indexOf(anchor);
    setRackOrder([...without.slice(0, at), tileId, ...without.slice(at)]);
  }

  /** Two tiles exchange places in the hand — the hot-seat `SWAP_RACK_TILES`, done locally. */
  function swapRackTiles(first: TileId, second: TileId) {
    const next = [...orderedRackIds];
    const from = next.indexOf(first);
    const to = next.indexOf(second);
    if (from === -1 || to === -1) return;
    [next[from], next[to]] = [next[to], next[from]];
    setRackOrder(next);
  }

  function handleSelectRackTile(tileId: TileId) {
    if (exchangeMode) {
      toggleExchangeTile(tileId);
      return;
    }
    if (selectedTileId === tileId) {
      setSelectedTileId(undefined);
      return;
    }
    if (selectedTileId !== undefined) {
      // A tile is already picked up, so tapping another one in the rack rearranges the hand
      // rather than changing which tile is selected: the two exchange places, and the tile stays
      // selected so it can be walked along with repeated taps. Tapping it again lets go of it.
      // Identical to the hot-seat screen, which reaches the same rule through the engine.
      swapRackTiles(selectedTileId, tileId);
      return;
    }
    setSelectedTileId(tileId);
  }

  function handleRackTilePointerDown(
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (exchangeMode || moveUnderReview) return;
    startDrag(tileId, event);
  }

  function handleBoardTilePointerDown(
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (!myTurn || moveUnderReview) return;
    startDrag(tileId, event);
  }

  /**
   * Fires once a drag ends with real movement (`useTileDrag.ts`). What is under the pointer is
   * resolved by the same hit-testing the hot-seat screen uses, and every outcome then goes
   * through the functions the tap flow already uses — dragging is another way to reach them,
   * never a second path that could arrange the board differently.
   *
   * Arranging the hand is allowed whether or not it is this player's turn: it asks nothing of the
   * server and tells the opponent nothing. Putting a tile on the board is not.
   */
  function handleTileDrop(tileId: TileId, position: DragPointerPosition) {
    if (moveUnderReview || exchangeMode) return;
    const target = resolveDropTarget(position);
    const placed = boardPlacements.find((each) => each.tileId === tileId);

    if (placed) {
      if (!myTurn) return;
      if (target.coordinate) {
        moveTo(placed, target.coordinate);
      } else if (target.overRack) {
        takeBack(tileId);
      }
      return;
    }

    if (target.coordinate) {
      if (myTurn) placeFromHand(tileId, target.coordinate);
      return;
    }

    if (target.overRack) {
      moveRackTile(tileId, rackDropIndex(tileId, position.x));
    }
  }

  /**
   * "Rensa": take the whole placement back.
   *
   * When the server is holding a pending move of this player's, clearing has to reach it — the
   * engine's own `clearPendingMove` is what puts those tiles back in the rack and undoes any
   * Replace-mode displacement. Clearing only the local copy would leave the server still holding
   * them, so the next pass or exchange would be refused and reopening the match would bring the
   * placement back.
   */
  function handleClear() {
    setPlacements([]);
    setSelectedTileId(undefined);
    if (serverPendingTileIds.length > 0) {
      onAction({ type: "CLEAR_PENDING_MOVE" });
    }
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
        /*
         * Two ways off a finished match, and neither of them was here (`known-bugs.md` item 19):
         * `Nytt spel` led back to the match list, which is neither what it said nor a way to
         * play the same opponent again. `Revansch` needs an opponent the server will accept, so
         * it appears only when the match carried one (DEC-036, T34.2).
         */
        actions={{
          kind: "ONLINE",
          onRematch:
            onRematch && snapshot.opponent
              ? () => onRematch(snapshot.opponent!)
              : undefined,
          onBack: onExit,
        }}
      />
    );
  }

  /*
   * Other matches needing this player — this one excluded, since the button leads away from it
   * (T30.1). A finished match is not counted: it asks nothing of anybody.
   */
  const waitingElsewhere = matchesWaitingCount(notifications, snapshot.matchId);

  function statusText(): string {
    if (mustReview)
      return "Motståndaren vill spela ett ord du inte känner igen.";
    if (awaitingOpponentReview) return "Väntar på motståndarens svar.";
    if (mustConfirm) return "Ordet finns inte i ordlistan.";
    if (myTurn) return "Din tur.";
    return "Väntar på motståndaren.";
  }

  return (
    /* Pinned only while the history drawer is closed, exactly as the hot-seat screen is. */
    <div
      className={`${styles.screen} ${historyDrawer.open ? "" : styles.screenFixed}`}
    >
      <div className={styles.header}>
        <button type="button" className={styles.button} onClick={onExit}>
          Mina matcher
          {waitingElsewhere > 0 && (
            <>
              <span className={styles.badge} aria-hidden="true">
                {formatBadgeCount(waitingElsewhere)}
              </span>
              <span className={styles.badgeLabel}>
                {describeBadge(
                  waitingElsewhere,
                  "annan match väntar på dig",
                  "andra matcher väntar på dig",
                )}
              </span>
            </>
          )}
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

      {/* The one thing that scrolls, so the document never does — see the note in the
          stylesheet. */}
      <div className={styles.body}>
        <Board
          boardDefinition={SCRABBLE_BOARD_DEFINITION}
          boardState={localBoard}
          tiles={view.tiles}
          pendingPlacedTiles={boardPlacements}
          canPlaceSelectedTile={Boolean(selectedTileId) && myTurn}
          replaceModeActive={replaceModeActive}
          /* Greyed out and inert while the decision is pending, for both players. */
          pendingMoveUnderReview={moveUnderReview}
          scoreBadgeCoordinate={preview.badgeCoordinate}
          scoreBadgeValue={preview.total}
          onPlaceAt={handlePlaceAt}
          onPendingTileClick={takeBack}
          onPendingTilePointerDown={handleBoardTilePointerDown}
          draggingTileId={dragState?.item}
          dragOverCoordinate={dragOverCoordinate}
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
                onSelectTile={handleSelectRackTile}
                onTilePointerDown={handleRackTilePointerDown}
                draggingTileId={dragState?.item}
              />
              <ShuffleButton onClick={handleShuffleRack} />
            </div>

            <TurnActions
              canSubmit={myTurn && placements.length > 0 && !busy}
              /*
               * A move in progress has to be cleared before the turn can be given away: the engine
               * refuses a pass or an exchange while a pending move exists, so offering them would
               * only produce a rule error. The hot-seat screen gates them the same way.
               */
              canPass={myTurn && !busy && !hasMoveInProgress}
              canClear={hasMoveInProgress && !busy}
              canEndGame={false}
              showEndGame={false}
              exchangeMode={exchangeMode}
              exchangeSelectionCount={exchangeSelection.size}
              canStartExchange={myTurn && !busy && !hasMoveInProgress}
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
              onClear={handleClear}
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
                /*
                 * Through `place`, so a blank dropped onto a square this move had already used
                 * swaps like any other tile (DEC-017). Appending straight to the list left two
                 * placements on one square, with the tile that was there lost from both the
                 * board and the hand.
                 */
                place(blankTarget.tileId, blankTarget.coordinate, letter);
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
          open={historyDrawer.open}
          onOpenChange={historyDrawer.setOpen}
        />

        {onSendMessage && viewerUserId && (
          <MatchChat
            messages={chatMessages ?? []}
            viewerUserId={viewerUserId}
            maxLength={chatMaxLength ?? 500}
            onSend={onSendMessage}
            busy={busy}
          />
        )}
      </div>

      {dragState && draggedTile && (
        <div
          className={styles.dragPreview}
          style={{ left: dragState.position.x, top: dragState.position.y }}
          aria-hidden="true"
        >
          <Tile
            letter={draggedTile.letter}
            points={draggedTile.points}
            isBlank={draggedTile.isBlank}
            variant="pending"
          />
        </div>
      )}
    </div>
  );
}
