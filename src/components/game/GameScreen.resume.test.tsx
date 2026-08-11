import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameControllerDependencies } from "../../application/game-controller/gameController";
import { loadLocalGame } from "../../application/persistence/localGameStorage";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";
import { SWEDISH_CONFIGURATION_ID } from "../../game/configuration/swedishConfiguration";
import { createSwedishWordClassificationRules } from "../../game/dictionary/swedishWordClassificationRules";
import { confirmProposal } from "../../game/engine/confirmProposal";
import { placeTile } from "../../game/engine/placeTile";
import { submitMove } from "../../game/engine/submitMove";
import type { GameState } from "../../game/model/game";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import { GameScreen } from "./GameScreen";

const classificationRules = createSwedishWordClassificationRules();

beforeEach(() => {
  window.localStorage.clear();
});

function renderResumed(state: GameState, deps: GameControllerDependencies) {
  return render(
    <GameScreen initialState={state} deps={deps} isResumed onExit={vi.fn()} />,
  );
}

/**
 * Milestone 3.3/3.4: a page reload restores whatever GameState was saved and must always land
 * behind a neutral "resume" handoff screen before revealing any private information
 * (local-multiplayer.md sections 30-33), never jumping straight back into the previous view.
 */
describe("GameScreen resume", () => {
  it("resuming during a normal turn with a pending placement still gates the rack behind a handoff", async () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
    });
    const [b] = setup.state.players[0].rack.tileIds;
    const placed = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: b,
      coordinate: setup.board.centreCoordinate,
    });
    expect(placed.success).toBe(true);
    if (!placed.success) return;

    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    renderResumed(placed.state, deps);

    expect(
      screen.getByText(
        `Spelet är redo att fortsätta. Lämna enheten till ${setup.state.players[0].name}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^cell-/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    const centre = setup.board.centreCoordinate;
    expect(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    ).toHaveTextContent("B");
    expect(screen.getByRole("button", { name: "Spela" })).toBeEnabled();
  });

  it("resuming while a proposal awaits review hands off to the reviewer, not the proposer", async () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["G", "R", "Ö", "M", "P"],
    });
    const [g, r, o, m, p] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [g, 0],
      [r, 1],
      [o, 2],
      [m, 3],
      [p, 4],
    ] as const) {
      const placed = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(placed.success).toBe(true);
      if (placed.success) state = placed.state;
    }
    const submitted = submitMove(
      state,
      setup.configuration,
      classificationRules,
      setup.playerOneId,
    );
    expect(submitted.success).toBe(true);
    if (!submitted.success) return;
    const confirmed = confirmProposal(submitted.state, setup.playerOneId);
    expect(confirmed.success).toBe(true);
    if (!confirmed.success) return;

    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    renderResumed(confirmed.state, deps);

    expect(
      screen.getByText(
        `Spelet är redo att fortsätta. Lämna enheten till ${setup.state.players[1].name}.`,
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(await screen.findByText(/August vill spela/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Godkänn" })).toBeInTheDocument();
  });

  it("resuming a finished game shows the final result directly, with no handoff gate", () => {
    const setup = buildEngineTestGame();
    const finishedState: GameState = {
      ...setup.state,
      status: "FINISHED",
      turnState: { type: "FINISHED" },
      result: {
        finalScores: {
          [setup.playerOneId]: 42,
          [setup.playerTwoId]: 10,
        },
        winnerPlayerIds: [setup.playerOneId],
        remainingRackDeductions: {
          [setup.playerOneId]: 0,
          [setup.playerTwoId]: 0,
        },
        endReason: "CONSECUTIVE_PASSES",
      },
    };
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    renderResumed(finishedState, deps);

    expect(screen.getByText("Spelet är slut")).toBeInTheDocument();
  });
});

describe("GameScreen persistence", () => {
  it("saves progress to localStorage after every successful action", async () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
    });
    const stateWithRealConfigId: GameState = {
      ...setup.state,
      configurationId: SWEDISH_CONFIGURATION_ID,
    };
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    render(
      <GameScreen
        initialState={stateWithRealConfigId}
        deps={deps}
        onExit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(loadLocalGame()).toEqual({ status: "NONE" });

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(
        `cell-${setup.board.centreCoordinate.row},${setup.board.centreCoordinate.column}`,
      ),
    );

    const result = loadLocalGame();
    expect(result.status).toBe("LOADED");
    if (result.status !== "LOADED") return;
    expect(result.rackSize).toBe(setup.configuration.rackSize);
    expect(result.state.pendingMove?.placedTiles).toHaveLength(1);
  });
});
