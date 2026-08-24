import type { GameState } from "../../game/model/game";
import type { PlayerId } from "../../game/model/ids";
import type { GameAction } from "./gameController";

/**
 * Local, presentation-only session state (local-multiplayer.md section 25): the engine has no
 * notion of "has the device physically been passed" or "has the next viewer pressed Fortsätt".
 * Kept entirely outside GameState so the same domain actions remain meaningful once handoff is
 * replaced by real networking (local-multiplayer.md section 50-51).
 */
export type LocalSessionMode =
  | "PLAYING"
  | "HANDOFF_TO_TURN"
  | "HANDOFF_TO_REVIEW"
  | "HANDOFF_BACK_AFTER_REJECTION"
  | "RESUME_HANDOFF";

export interface LocalSessionState {
  readonly mode: LocalSessionMode;
  /** Whose private information may be shown once the viewer presses Fortsätt/Börja tur. */
  readonly expectedViewerPlayerId?: PlayerId;
}

/**
 * The privacy-safe starting state for a freshly created game (local-multiplayer.md section 5):
 * even the very first player's rack stays hidden until they explicitly continue.
 */
export function initialLocalSession(state: GameState): LocalSessionState {
  if (state.turnState.type !== "PLAYER_TURN") {
    return { mode: "PLAYING" };
  }
  return {
    mode: "HANDOFF_TO_TURN",
    expectedViewerPlayerId: state.turnState.playerId,
  };
}

/**
 * The privacy-safe entry point after loading a saved game (local-multiplayer.md sections 30-33):
 * regardless of what the loaded state was doing when the page closed, resuming always starts
 * behind a neutral handoff screen naming whoever must act next — the current turn owner, or the
 * reviewer if a proposal was awaiting approval.
 */
export function resumeLocalSession(state: GameState): LocalSessionState {
  if (state.status === "FINISHED" || state.turnState.type === "FINISHED") {
    return { mode: "PLAYING" };
  }
  if (state.turnState.type === "WAITING_FOR_OPPONENT_APPROVAL") {
    return {
      mode: "RESUME_HANDOFF",
      expectedViewerPlayerId: state.turnState.reviewingPlayerId,
    };
  }
  return {
    mode: "RESUME_HANDOFF",
    expectedViewerPlayerId: state.turnState.playerId,
  };
}

/**
 * Derives the next local session state from the action just dispatched and the resulting
 * GameState (architecture.md section 24: the application layer determines handoff/view state
 * as a consequence of a completed engine transition, never independently of it). Actions that
 * don't hand the device to someone else (editing a pending move, Ändra) keep the same viewer
 * and stay in "PLAYING" — no privacy screen needed since nothing changed hands.
 */
export function deriveLocalSessionAfterAction(
  actionType: GameAction["type"],
  newState: GameState,
): LocalSessionState {
  if (newState.status === "FINISHED") {
    return { mode: "PLAYING" };
  }

  switch (actionType) {
    case "SUBMIT_MOVE":
    case "PASS":
    case "EXCHANGE_TILES": {
      if (newState.turnState.type !== "PLAYER_TURN") {
        return { mode: "PLAYING" };
      }
      return {
        mode: "HANDOFF_TO_TURN",
        expectedViewerPlayerId: newState.turnState.playerId,
      };
    }
    case "CONFIRM_PROPOSAL": {
      if (newState.turnState.type !== "WAITING_FOR_OPPONENT_APPROVAL") {
        return { mode: "PLAYING" };
      }
      return {
        mode: "HANDOFF_TO_REVIEW",
        expectedViewerPlayerId: newState.turnState.reviewingPlayerId,
      };
    }
    case "REJECT_PROPOSED_MOVE": {
      if (newState.turnState.type !== "PLAYER_TURN") {
        return { mode: "PLAYING" };
      }
      return {
        mode: "HANDOFF_BACK_AFTER_REJECTION",
        expectedViewerPlayerId: newState.turnState.playerId,
      };
    }
    // ACCEPT_PROPOSED_MOVE deliberately has no handoff (DEC-019): accepting passes the turn to
    // the reviewer, who is the person already holding the device, so there is nobody to hand it
    // to and no rack to keep hidden from whoever is looking. It falls through to "PLAYING".
    default:
      return { mode: "PLAYING" };
  }
}

/** Text for the active handoff screen. Player names live in GameState, not in LocalSessionState. */
export function describeHandoff(
  session: LocalSessionState,
  state: GameState,
): { readonly message: string; readonly continueLabel: string } {
  const viewerName = session.expectedViewerPlayerId
    ? (state.players.find((p) => p.id === session.expectedViewerPlayerId)
        ?.name ?? "")
    : "";

  switch (session.mode) {
    case "HANDOFF_TO_TURN":
      return {
        message: `Lämna över enheten till ${viewerName}.`,
        continueLabel: "Fortsätt",
      };
    case "HANDOFF_TO_REVIEW": {
      const turnState = state.turnState;
      const proposerName =
        turnState.type === "WAITING_FOR_OPPONENT_APPROVAL"
          ? (state.players.find((p) => p.id === turnState.proposingPlayerId)
              ?.name ?? "")
          : "";
      return {
        message: `${viewerName} behöver ta ställning till ${proposerName}s läggning. Lämna över enheten till ${viewerName}.`,
        continueLabel: "Fortsätt",
      };
    }
    case "HANDOFF_BACK_AFTER_REJECTION":
      return {
        message: `Läggningen nekades. Lämna tillbaka enheten till ${viewerName}.`,
        continueLabel: "Fortsätt",
      };
    case "RESUME_HANDOFF":
      return {
        message: `Spelet är redo att fortsätta. Lämna enheten till ${viewerName}.`,
        continueLabel: "Fortsätt",
      };
    case "PLAYING":
      return { message: "", continueLabel: "" };
  }
}
