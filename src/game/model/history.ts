import type { HistoryEventId, PlayerId } from "./ids";
import type { PendingPlacedTile } from "./pendingMove";
import type { GameResult } from "./gameResult";

type EmptyPayload = Record<string, never>;

export interface WordMoveCommittedPayload {
  readonly placedTiles: readonly PendingPlacedTile[];
  readonly words: readonly string[];
  readonly scoreAwarded: number;
  readonly usedUnknownWordApproval: boolean;
}

export interface UnknownWordProposedPayload {
  readonly words: readonly string[];
}

export interface UnknownWordAcceptedPayload {
  readonly words: readonly string[];
}

export interface UnknownWordRejectedPayload {
  readonly proposingPlayerId: PlayerId;
  readonly reviewingPlayerId: PlayerId;
  readonly words: readonly string[];
}

export interface TilesExchangedPayload {
  readonly tileCount: number;
}

export interface GameFinishedPayload {
  readonly result: GameResult;
}

interface HistoryEventBase {
  readonly id: HistoryEventId;
  readonly sequence: number;
}

export type HistoryEvent =
  | (HistoryEventBase & {
      readonly type: "GAME_STARTED";
      readonly payload: EmptyPayload;
    })
  | (HistoryEventBase & {
      readonly type: "WORD_MOVE_COMMITTED";
      readonly playerId: PlayerId;
      readonly payload: WordMoveCommittedPayload;
    })
  | (HistoryEventBase & {
      readonly type: "UNKNOWN_WORD_PROPOSED";
      readonly playerId: PlayerId;
      readonly payload: UnknownWordProposedPayload;
    })
  | (HistoryEventBase & {
      readonly type: "UNKNOWN_WORD_ACCEPTED";
      readonly playerId: PlayerId;
      readonly payload: UnknownWordAcceptedPayload;
    })
  | (HistoryEventBase & {
      readonly type: "UNKNOWN_WORD_REJECTED";
      readonly playerId: PlayerId;
      readonly payload: UnknownWordRejectedPayload;
    })
  | (HistoryEventBase & {
      readonly type: "PASS";
      readonly playerId: PlayerId;
      readonly payload: EmptyPayload;
    })
  | (HistoryEventBase & {
      readonly type: "TILES_EXCHANGED";
      readonly playerId: PlayerId;
      readonly payload: TilesExchangedPayload;
    })
  | (HistoryEventBase & {
      readonly type: "GAME_FINISHED";
      readonly payload: GameFinishedPayload;
    });

export interface GameHistory {
  readonly events: readonly HistoryEvent[];
}

export function createGameHistory(): GameHistory {
  return { events: [] };
}

export function nextSequence(history: GameHistory): number {
  return history.events.length;
}

export function addHistoryEvent(
  history: GameHistory,
  event: HistoryEvent,
): GameHistory {
  if (event.sequence !== nextSequence(history)) {
    throw new Error(
      `History event sequence must be ${nextSequence(history)}, received ${event.sequence}`,
    );
  }
  return { events: [...history.events, event] };
}
