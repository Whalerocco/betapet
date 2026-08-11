import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameControllerDependencies } from "../../application/game-controller/gameController";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";
import { createSwedishWordClassificationRules } from "../../game/dictionary/swedishWordClassificationRules";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import { GameScreen } from "./GameScreen";

const classificationRules = createSwedishWordClassificationRules();

function renderGame(
  playerOneRackLetters = ["B", "I", "L", "A", "R", "E", "N"],
) {
  const setup = buildEngineTestGame({ playerOneRackLetters });
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

  it("places a blank tile, lets the player choose its letter, and scores it as zero points", async () => {
    const { setup } = renderGame(["B", "I", "_"]);
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 1}`),
    );
    await userEvent.click(screen.getByLabelText("Blank bricka"));
    await userEvent.selectOptions(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
      "L",
    );
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 2}`),
    );
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(
      screen.getByText(`${setup.state.players[0].name}: 2`),
    ).toBeInTheDocument();
  });

  it("allows changing a pending blank tile's letter before it is committed", async () => {
    const { setup } = renderGame(["_"]);
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Blank bricka"));
    await userEvent.selectOptions(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
      "L",
    );
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    expect(
      screen.getByLabelText("Pending bricka L, tryck för att redigera"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByLabelText("Pending bricka L, tryck för att redigera"),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Ändra bokstav för den blanka brickan:"),
      "M",
    );

    expect(
      screen.getByLabelText("Pending bricka M, tryck för att redigera"),
    ).toBeInTheDocument();
  });

  it("plays the full disputed-word flow through to an accepted move", async () => {
    const { setup } = renderGame(["G", "R", "Ö", "M", "P"]);
    const centre = setup.board.centreCoordinate;

    for (const [letterLabel, offset] of [
      ["G", 0],
      ["R", 1],
      ["Ö", 2],
      ["M", 3],
      ["P", 4],
    ] as const) {
      await userEvent.click(
        screen.getByLabelText(`Bricka ${letterLabel}, 1 poäng`),
      );
      await userEvent.click(
        screen.getByTestId(`cell-${centre.row},${centre.column + offset}`),
      );
    }

    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(await screen.findByText(/GRÖMP/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Spela ändå" }));

    expect(await screen.findByText(/August vill spela/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Godkänn" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[1].name}`),
    ).toBeInTheDocument();
    const playerOneScore = screen.getByText(
      new RegExp(`^${setup.state.players[0].name}: \\d+$`),
    );
    expect(playerOneScore).toBeInTheDocument();
    expect(playerOneScore.textContent).not.toBe(
      `${setup.state.players[0].name}: 0`,
    );
  });

  it("returns a rejected proposal to the proposer with pending tiles still editable", async () => {
    const { setup } = renderGame(["G", "R", "Ö", "M", "P"]);
    const centre = setup.board.centreCoordinate;

    for (const [letterLabel, offset] of [
      ["G", 0],
      ["R", 1],
      ["Ö", 2],
      ["M", 3],
      ["P", 4],
    ] as const) {
      await userEvent.click(
        screen.getByLabelText(`Bricka ${letterLabel}, 1 poäng`),
      );
      await userEvent.click(
        screen.getByTestId(`cell-${centre.row},${centre.column + offset}`),
      );
    }

    await userEvent.click(screen.getByRole("button", { name: "Spela" }));
    await userEvent.click(screen.getByRole("button", { name: "Spela ändå" }));
    await userEvent.click(screen.getByRole("button", { name: "Neka" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    ).toHaveTextContent("G");
    expect(screen.getByRole("button", { name: "Spela" })).toBeEnabled();
  });
});
