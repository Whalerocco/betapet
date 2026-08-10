import { coordinateKey } from "./coordinate";
import type { BoardState } from "./board";
import type { GameId, PlayerId, TileId } from "./ids";
import type { Player } from "./player";
import type { Tile } from "./tile";
import type { TileBag } from "./tileBag";
import type { PendingMove } from "./pendingMove";
import type { TurnState } from "./turnState";
import type { GameHistory } from "./history";
import type { GameResult } from "./gameResult";

export type GameStatus = "SETUP" | "ACTIVE" | "FINISHED";

interface GameStateBase {
  readonly id: GameId;
  readonly version: number;
  readonly configurationId: string;
  readonly players: readonly [Player, Player];
  readonly board: BoardState;
  readonly tileBag: TileBag;
  readonly tiles: Readonly<Record<TileId, Tile>>;
  readonly currentPlayerId: PlayerId;
  readonly turnState: TurnState;
  readonly pendingMove?: PendingMove;
  readonly acceptedVocabulary: readonly string[];
  readonly history: GameHistory;
  readonly consecutivePasses: number;
}

export type GameState =
  | (GameStateBase & { readonly status: "SETUP" })
  | (GameStateBase & { readonly status: "ACTIVE" })
  | (GameStateBase & {
      readonly status: "FINISHED";
      readonly result: GameResult;
    });

export function assertValidGameState(state: GameState): void {
  const [playerOne, playerTwo] = state.players;
  if (playerOne.id === playerTwo.id) {
    throw new Error("Player IDs must be unique within a game");
  }
  const validPlayerIds = new Set<PlayerId>([playerOne.id, playerTwo.id]);
  if (!validPlayerIds.has(state.currentPlayerId)) {
    throw new Error("currentPlayerId must reference one of the game's players");
  }

  if (!Number.isInteger(state.version) || state.version < 1) {
    throw new Error(
      `version must be a positive integer, received ${state.version}`,
    );
  }
  if (
    !Number.isInteger(state.consecutivePasses) ||
    state.consecutivePasses < 0
  ) {
    throw new Error(
      `consecutivePasses must be a non-negative integer, received ${state.consecutivePasses}`,
    );
  }

  const registeredTileIds = new Set(Object.keys(state.tiles) as TileId[]);

  const locationCounts = new Map<TileId, number>();
  const countLocation = (tileId: TileId): void => {
    locationCounts.set(tileId, (locationCounts.get(tileId) ?? 0) + 1);
  };

  for (const tileId of state.tileBag.tileIds) countLocation(tileId);
  for (const player of state.players) {
    for (const tileId of player.rack.tileIds) countLocation(tileId);
  }
  for (const cell of state.board.occupiedCells) countLocation(cell.tileId);
  if (state.pendingMove) {
    for (const placed of state.pendingMove.placedTiles)
      countLocation(placed.tileId);
  }

  for (const [tileId, count] of locationCounts) {
    if (!registeredTileIds.has(tileId)) {
      throw new Error(
        `Tile ${tileId} is referenced but not present in state.tiles`,
      );
    }
    if (count > 1) {
      throw new Error(
        `Tile ${tileId} exists in more than one location at once`,
      );
    }
  }

  const seenCoordinates = new Set<string>();
  for (const cell of state.board.occupiedCells) {
    const key = coordinateKey(cell.coordinate);
    if (seenCoordinates.has(key)) {
      throw new Error(
        `Board cell ${key} contains more than one committed tile`,
      );
    }
    seenCoordinates.add(key);
  }

  if (state.pendingMove && !validPlayerIds.has(state.pendingMove.playerId)) {
    throw new Error("Pending move must belong to one of the game's players");
  }

  const uniqueAcceptedWords = new Set(state.acceptedVocabulary);
  if (uniqueAcceptedWords.size !== state.acceptedVocabulary.length) {
    throw new Error("Accepted vocabulary must not contain duplicate entries");
  }

  const isFinished = state.status === "FINISHED";
  const hasFinishedTurnState = state.turnState.type === "FINISHED";
  if (isFinished !== hasFinishedTurnState) {
    throw new Error(
      "Game status FINISHED and a FINISHED turn state must agree",
    );
  }
}

export function createGameState(state: GameState): GameState {
  assertValidGameState(state);
  return state;
}
