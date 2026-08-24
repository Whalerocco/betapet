import { describe, expect, it } from "vitest";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import {
  deriveLocalSessionAfterAction,
  describeHandoff,
  initialLocalSession,
} from "./localSession";

describe("initialLocalSession", () => {
  it("gates the starting player's rack behind a handoff screen", () => {
    const { state, playerOneId } = buildEngineTestGame();
    const session = initialLocalSession(state);
    expect(session).toEqual({
      mode: "HANDOFF_TO_TURN",
      expectedViewerPlayerId: playerOneId,
    });
  });
});

describe("deriveLocalSessionAfterAction", () => {
  it("hands off to the next player after a normal move commits", () => {
    const { state, playerTwoId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("SUBMIT_MOVE", {
      ...state,
      currentPlayerId: playerTwoId,
      turnState: { type: "PLAYER_TURN", playerId: playerTwoId },
    });
    expect(session).toEqual({
      mode: "HANDOFF_TO_TURN",
      expectedViewerPlayerId: playerTwoId,
    });
  });

  it("does not hand off when an unknown word keeps the same player editing", () => {
    const { state, playerOneId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("SUBMIT_MOVE", {
      ...state,
      turnState: {
        type: "REQUIRES_PLAYER_CONFIRMATION",
        playerId: playerOneId,
      },
    });
    expect(session).toEqual({ mode: "PLAYING" });
  });

  it("does not hand off after Ändra (cancel proposal)", () => {
    const { state, playerOneId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("CANCEL_PROPOSAL", {
      ...state,
      turnState: { type: "PLAYER_TURN", playerId: playerOneId },
    });
    expect(session).toEqual({ mode: "PLAYING" });
  });

  it("hands off to the reviewer after Spela ändå", () => {
    const { state, playerOneId, playerTwoId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("CONFIRM_PROPOSAL", {
      ...state,
      turnState: {
        type: "WAITING_FOR_OPPONENT_APPROVAL",
        proposingPlayerId: playerOneId,
        reviewingPlayerId: playerTwoId,
      },
    });
    expect(session).toEqual({
      mode: "HANDOFF_TO_REVIEW",
      expectedViewerPlayerId: playerTwoId,
    });
  });

  it("hands off back to the proposer after a rejection", () => {
    const { state, playerOneId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("REJECT_PROPOSED_MOVE", {
      ...state,
      turnState: { type: "PLAYER_TURN", playerId: playerOneId },
    });
    expect(session).toEqual({
      mode: "HANDOFF_BACK_AFTER_REJECTION",
      expectedViewerPlayerId: playerOneId,
    });
  });

  it("goes straight into the reviewer's own turn after acceptance (DEC-019)", () => {
    const { state, playerTwoId } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("ACCEPT_PROPOSED_MOVE", {
      ...state,
      turnState: { type: "PLAYER_TURN", playerId: playerTwoId },
    });
    // Accepting passes the turn to the reviewer, who is already holding the device: there is
    // nobody to hand it to, and the rack about to be revealed is their own.
    expect(session).toEqual({ mode: "PLAYING" });
  });

  it("does not gate anything once the game has finished", () => {
    const { state } = buildEngineTestGame();
    const session = deriveLocalSessionAfterAction("PASS", {
      ...state,
      status: "FINISHED",
      turnState: { type: "FINISHED" },
      result: {
        finalScores: {},
        winnerPlayerIds: [],
        remainingRackDeductions: {},
        endReason: "CONSECUTIVE_PASSES",
      },
    });
    expect(session).toEqual({ mode: "PLAYING" });
  });
});

describe("describeHandoff", () => {
  it("names the incoming viewer for a normal handoff", () => {
    const { state, playerOneId } = buildEngineTestGame();
    const result = describeHandoff(
      { mode: "HANDOFF_TO_TURN", expectedViewerPlayerId: playerOneId },
      state,
    );
    expect(result).toEqual({
      message: "Lämna över enheten till August.",
      continueLabel: "Fortsätt",
    });
  });

  it("names both the proposer and the reviewer for a review handoff", () => {
    const { state, playerOneId, playerTwoId } = buildEngineTestGame();
    const stateInReview = {
      ...state,
      turnState: {
        type: "WAITING_FOR_OPPONENT_APPROVAL" as const,
        proposingPlayerId: playerOneId,
        reviewingPlayerId: playerTwoId,
      },
    };
    const result = describeHandoff(
      { mode: "HANDOFF_TO_REVIEW", expectedViewerPlayerId: playerTwoId },
      stateInReview,
    );
    expect(result.message).toBe(
      "Anna behöver ta ställning till Augusts läggning. Lämna över enheten till Anna.",
    );
  });

  it("describes nothing while playing, since no screen is shown then", () => {
    const { state } = buildEngineTestGame();

    expect(describeHandoff({ mode: "PLAYING" }, state)).toEqual({
      message: "",
      continueLabel: "",
    });
  });
});
