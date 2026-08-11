import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameControllerDependencies } from "../../application/game-controller/gameController";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";
import { createSwedishWordClassificationRules } from "../../game/dictionary/swedishWordClassificationRules";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import { GameScreen } from "./GameScreen";

const classificationRules = createSwedishWordClassificationRules();

function renderGame() {
  const setup = buildEngineTestGame({
    playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
  });
  const deps: GameControllerDependencies = {
    configuration: setup.configuration,
    classificationRules,
    alphabet: SWEDISH_ALPHABET,
  };
  const onExit = vi.fn();
  render(<GameScreen initialState={setup.state} deps={deps} onExit={onExit} />);
  return { setup, onExit };
}

describe("GameScreen", () => {
  it("only shows the current turn owner's rack", () => {
    const { setup } = renderGame();
    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(`Bricka B, 1 poäng`)).toBeInTheDocument();
  });

  it("commits a real dictionary word, updates the score, and hands off the turn", async () => {
    const { setup } = renderGame();
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 1}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka L, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 2}`),
    );

    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[1].name}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${setup.state.players[0].name}: 3`),
    ).toBeInTheDocument();
  });

  it("shows a Swedish error message for an invalid placement and stays in edit mode", async () => {
    const { setup } = renderGame();

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(screen.getByTestId("cell-0,0"));
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(
      await screen.findByText("Första ordet måste täcka mittenrutan."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
  });
});
