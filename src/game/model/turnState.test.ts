import { describe, expect, it } from "vitest";
import { createPlayerId } from "./ids";
import {
  finishedTurnState,
  playerTurn,
  requiresPlayerConfirmation,
  waitingForOpponentApproval,
} from "./turnState";

describe("TurnState", () => {
  it("represents an ordinary player turn", () => {
    const playerId = createPlayerId();
    const state = playerTurn(playerId);
    expect(state).toEqual({ type: "PLAYER_TURN", playerId });
  });

  it("represents a proposer who must confirm an unknown-word move", () => {
    const playerId = createPlayerId();
    const state = requiresPlayerConfirmation(playerId);
    expect(state).toEqual({ type: "REQUIRES_PLAYER_CONFIRMATION", playerId });
  });

  it("represents proposer and reviewer separately while awaiting approval", () => {
    const proposingPlayerId = createPlayerId();
    const reviewingPlayerId = createPlayerId();
    const state = waitingForOpponentApproval(
      proposingPlayerId,
      reviewingPlayerId,
    );
    expect(state).toEqual({
      type: "WAITING_FOR_OPPONENT_APPROVAL",
      proposingPlayerId,
      reviewingPlayerId,
    });
  });

  it("rejects a proposer reviewing their own move", () => {
    const playerId = createPlayerId();
    expect(() => waitingForOpponentApproval(playerId, playerId)).toThrow();
  });

  it("represents a finished game with no responsible player", () => {
    expect(finishedTurnState()).toEqual({ type: "FINISHED" });
  });
});
