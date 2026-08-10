import type { PlayerId } from "./ids";

export type TurnState =
  | { readonly type: "PLAYER_TURN"; readonly playerId: PlayerId }
  | {
      readonly type: "REQUIRES_PLAYER_CONFIRMATION";
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "WAITING_FOR_OPPONENT_APPROVAL";
      readonly proposingPlayerId: PlayerId;
      readonly reviewingPlayerId: PlayerId;
    }
  | { readonly type: "FINISHED" };

export function playerTurn(playerId: PlayerId): TurnState {
  return { type: "PLAYER_TURN", playerId };
}

export function requiresPlayerConfirmation(playerId: PlayerId): TurnState {
  return { type: "REQUIRES_PLAYER_CONFIRMATION", playerId };
}

export function waitingForOpponentApproval(
  proposingPlayerId: PlayerId,
  reviewingPlayerId: PlayerId,
): TurnState {
  if (proposingPlayerId === reviewingPlayerId) {
    throw new Error("Proposing player and reviewing player must be different");
  }
  return {
    type: "WAITING_FOR_OPPONENT_APPROVAL",
    proposingPlayerId,
    reviewingPlayerId,
  };
}

export function finishedTurnState(): TurnState {
  return { type: "FINISHED" };
}
