import type { BoardState } from "../model/board";
import type {
  AcceptedVocabularyEntry,
  GameState,
  GameStatus,
} from "../model/game";
import type { GameResult } from "../model/gameResult";
import type { GameHistory } from "../model/history";
import type { GameId, PlayerId, TileId } from "../model/ids";
import type { PendingMove } from "../model/pendingMove";
import type { Rack } from "../model/player";
import type { Tile } from "../model/tile";
import type { TurnState } from "../model/turnState";

/** What one player may know about a game: public information plus their own hand. */
export interface PlayerGameViewPlayer {
  readonly id: PlayerId;
  readonly name: string;
  readonly score: number;
}

export interface PlayerGameView {
  readonly gameId: GameId;
  readonly version: number;
  readonly configurationId: string;
  readonly status: GameStatus;
  /** Whose view this is; a client should refuse a view addressed to anyone else. */
  readonly viewerPlayerId: PlayerId;
  readonly players: readonly [PlayerGameViewPlayer, PlayerGameViewPlayer];
  readonly board: BoardState;
  /**
   * Identities for the tiles this view actually exposes, and no others — the board, the viewer's
   * own hand, and any pending move they are allowed to see. Carrying the game's whole tile
   * registry would hand over the opponent's hand and the bag in the same breath.
   */
  readonly tiles: Readonly<Record<TileId, Tile>>;
  readonly ownRack: Rack;
  /** How many tiles the opponent holds — never which ones (online-multiplayer.md section 16). */
  readonly opponentRackCount: number;
  /** How many tiles are left to draw — never which, nor in what order (section 17). */
  readonly tilesRemainingInBag: number;
  readonly turnState: TurnState;
  /** Present only when this player is entitled to see it; see `isPendingMoveVisibleTo`. */
  readonly pendingMove?: PendingMove;
  readonly acceptedVocabulary: readonly AcceptedVocabularyEntry[];
  readonly history: GameHistory;
  readonly result?: GameResult;
}

/**
 * Whether a pending move may be shown to this player.
 *
 * Its owner always sees their own work in progress. The opponent sees it only once it has been
 * proposed *to them* for approval — until then a move being composed is private, or the opponent
 * would watch letters being tried out and know the hand before the move was ever played.
 */
export function isPendingMoveVisibleTo(
  state: GameState,
  viewerPlayerId: PlayerId,
): boolean {
  const pendingMove = state.pendingMove;
  if (!pendingMove) return false;
  if (pendingMove.playerId === viewerPlayerId) return true;
  return (
    state.turnState.type === "WAITING_FOR_OPPONENT_APPROVAL" &&
    state.turnState.reviewingPlayerId === viewerPlayerId
  );
}

/**
 * Derives what one player may be told about a game (online-multiplayer.md sections 16-17).
 *
 * Version 1 is hot-seat and hands the whole `GameState` to one browser, which is safe because
 * both players share the device and the UI hides a rack behind a handoff screen. Online, that
 * stops being an interface concern and becomes a security one: a client receiving the full state
 * could read the opponent's hand and the draw order regardless of what it chooses to render. The
 * server must therefore send a view derived per player, and this is that derivation — kept in the
 * engine, as pure and testable as the rules themselves, so a server never has to reimplement it.
 *
 * The safety property is *what is absent*: no opponent rack tile, no tile from the bag, and no
 * pending move the viewer is not party to. `playerGameView.test.ts` asserts that by sweeping the
 * serialized view for identifiers that should never appear in it.
 *
 * Throws for a player who is not in this game: that is a programming error at the call site, not
 * a state a game can legitimately be in.
 */
export function toPlayerGameView(
  state: GameState,
  viewerPlayerId: PlayerId,
): PlayerGameView {
  const viewer = state.players.find((player) => player.id === viewerPlayerId);
  const opponent = state.players.find((player) => player.id !== viewerPlayerId);
  if (!viewer || !opponent) {
    throw new Error(
      `Cannot build a player view for ${viewerPlayerId}: not a player in this game`,
    );
  }

  const pendingMove = isPendingMoveVisibleTo(state, viewerPlayerId)
    ? state.pendingMove
    : undefined;

  return {
    gameId: state.id,
    version: state.version,
    configurationId: state.configurationId,
    status: state.status,
    viewerPlayerId,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
    })) as [PlayerGameViewPlayer, PlayerGameViewPlayer],
    board: state.board,
    tiles: visibleTiles(state, viewer.rack, pendingMove),
    ownRack: viewer.rack,
    opponentRackCount: opponent.rack.tileIds.length,
    tilesRemainingInBag: state.tileBag.tileIds.length,
    turnState: state.turnState,
    pendingMove,
    acceptedVocabulary: state.acceptedVocabulary,
    history: state.history,
    ...(state.status === "FINISHED" ? { result: state.result } : {}),
  };
}

/**
 * The tiles a view is allowed to identify: everything committed to the board, the viewer's own
 * hand, and — when a pending move is visible — its tiles along with any tile it displaced, which
 * was on the board a moment ago and so is public knowledge already.
 */
function visibleTiles(
  state: GameState,
  ownRack: Rack,
  pendingMove: PendingMove | undefined,
): Readonly<Record<TileId, Tile>> {
  const visible = new Set<TileId>();
  for (const cell of state.board.occupiedCells) visible.add(cell.tileId);
  for (const tileId of ownRack.tileIds) visible.add(tileId);
  for (const placed of pendingMove?.placedTiles ?? []) {
    visible.add(placed.tileId);
    if (placed.replacedTileId) visible.add(placed.replacedTileId);
  }

  const tiles: Record<TileId, Tile> = {};
  for (const tileId of visible) {
    tiles[tileId] = state.tiles[tileId];
  }
  return tiles;
}
