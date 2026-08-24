import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameControllerDependencies } from "../../application/game-controller/gameController";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";
import { createFrenchWordClassificationRules } from "../../game/dictionary/frenchWordClassificationRules";
import { createGermanWordClassificationRules } from "../../game/dictionary/germanWordClassificationRules";
import { createSwedishWordClassificationRules } from "../../game/dictionary/swedishWordClassificationRules";
import { placeCommittedTile } from "../../game/model/board";
import { addHistoryEvent, nextSequence } from "../../game/model/history";
import { createHistoryEventId, createTileId } from "../../game/model/ids";
import { createLetterTile } from "../../game/model/tile";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import { GameScreen } from "./GameScreen";

const classificationRules = createSwedishWordClassificationRules();

/** Renders the game and clicks through the initial "pass the device" handoff screen. */
async function renderGame(
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
  await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));
  return { setup, onExit };
}

/**
 * Presses on a tile, moves past useTileDrag's 6px threshold, and releases over `target`. Only
 * `document.elementFromPoint` is stubbed — jsdom cannot answer it without layout — so everything
 * downstream (handleTileDrop, the controller, the engine) is the real thing.
 */
function dragOnto(tile: HTMLElement, target: HTMLElement) {
  const originalElementFromPoint = document.elementFromPoint;
  document.elementFromPoint = () => target;
  try {
    fireEvent.pointerDown(tile, {
      pointerType: "mouse",
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 40 });
    fireEvent.pointerUp(window, { clientX: 40, clientY: 40 });
  } finally {
    document.elementFromPoint = originalElementFromPoint;
  }
}

describe("GameScreen", () => {
  it("shows a privacy-safe handoff screen before revealing the starting player's rack", async () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
    });
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    render(
      <GameScreen initialState={setup.state} deps={deps} onExit={vi.fn()} />,
    );

    expect(
      screen.getByText(
        `Lämna över enheten till ${setup.state.players[0].name}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(screen.getByLabelText("Bricka B, 1 poäng")).toBeInTheDocument();
  });

  it("only shows the current turn owner's rack", async () => {
    const { setup } = await renderGame();
    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(`Bricka B, 1 poäng`)).toBeInTheDocument();
  });

  it("commits a real dictionary word, updates the score, and hands off the turn", async () => {
    const { setup } = await renderGame();
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
      screen.getByText(
        `Lämna över enheten till ${setup.state.players[1].name}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[1].name}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${setup.state.players[0].name}: 3`),
    ).toBeInTheDocument();
  });

  it("Rensa returns every pending tile to the rack without ending the turn", async () => {
    const { setup } = await renderGame();
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 1}`),
    );
    expect(
      screen.getByRole("button", { name: "Spela" }),
    ).not.toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Rensa" }));

    expect(screen.getByLabelText("Bricka B, 1 poäng")).toBeInTheDocument();
    expect(screen.getByLabelText("Bricka I, 1 poäng")).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Pending bricka/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spela" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rensa" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Passa" }),
    ).not.toBeDisabled();
    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
  });

  it("swaps a tile placed this turn when another is dragged onto it (DEC-017)", async () => {
    const { setup } = await renderGame();
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    expect(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    ).toBeInTheDocument();

    // No modifiers here: swapping your own not-yet-played tile is ordinary editing, so it works
    // in a plain game and must not report "Brickan kan inte placeras där."
    dragOnto(
      screen.getByLabelText("Bricka I, 1 poäng"),
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );

    expect(
      await screen.findByLabelText("Pending bricka I, tryck för att redigera"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Pending bricka B, tryck för att redigera"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bricka B, 1 poäng")).toBeInTheDocument();
    expect(
      screen.queryByText("Brickan kan inte placeras där."),
    ).not.toBeInTheDocument();
  });

  it("swaps a tile placed this turn when another rack tile is tapped onto it (DEC-017)", async () => {
    const { setup } = await renderGame();
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    // With nothing selected the pending tile still offers to be picked back up.
    expect(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    ).toBeInTheDocument();

    // Selecting a rack tile turns that square into a placement target instead.
    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Ersätt bricka B"));

    expect(
      screen.getByLabelText("Pending bricka I, tryck för att redigera"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Bricka B, 1 poäng")).toBeInTheDocument();
    expect(
      screen.queryByText("Brickan kan inte placeras där."),
    ).not.toBeInTheDocument();
  });

  it("shows a Swedish error message for an invalid placement and stays in edit mode", async () => {
    const { setup } = await renderGame();

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
    const { setup } = await renderGame(["B", "I", "_"]);
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
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 2}`),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
      "L",
    );
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(
      screen.getByText(`${setup.state.players[0].name}: 2`),
    ).toBeInTheDocument();
  });

  it("allows changing a pending blank tile's letter before it is committed", async () => {
    const { setup } = await renderGame(["_"]);
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Blank bricka"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
      "L",
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

  it("keeps the blank tile selected, and places nothing, if the letter picker is dismissed", async () => {
    const { setup } = await renderGame(["_"]);
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Blank bricka"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    expect(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
    ).toBeInTheDocument();

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));

    expect(
      screen.queryByLabelText("Vilken bokstav ska den blanka brickan vara?"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Pending bricka/)).not.toBeInTheDocument();

    // The tile is still selected: targeting the cell again reopens the letter picker.
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    expect(
      screen.getByLabelText("Vilken bokstav ska den blanka brickan vara?"),
    ).toBeInTheDocument();
  });

  it("plays the full disputed-word flow through to an accepted move", async () => {
    const { setup } = await renderGame(["G", "R", "Ö", "M", "P"]);
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

    expect(
      await screen.findByText(
        new RegExp(`Lämna över enheten till ${setup.state.players[1].name}`),
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(await screen.findByText(/August vill spela/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bricka /)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Godkänn" }));

    expect(
      screen.getByText(
        `Läggningen godkändes. Nu är det ${setup.state.players[1].name}s tur.`,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Börja tur" }));

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
    const { setup } = await renderGame(["G", "R", "Ö", "M", "P"]);
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
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));
    await userEvent.click(screen.getByRole("button", { name: "Neka" }));

    expect(
      screen.getByText(
        `Läggningen nekades. Lämna tillbaka enheten till ${setup.state.players[0].name}.`,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    ).toHaveTextContent("G");
    expect(screen.getByRole("button", { name: "Spela" })).toBeEnabled();
  });

  it("shows badges for every active gameplay modifier", async () => {
    const setup = buildEngineTestGame({
      modifiers: new Set(["ILLEGAL", "CRISSCROSS"]),
    });
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    render(
      <GameScreen initialState={setup.state} deps={deps} onExit={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(screen.getByText("Olagligt läge")).toBeInTheDocument();
    expect(screen.getByText("Kryssläge")).toBeInTheDocument();
  });

  it("shows no modifier badges for a standard game with no modifiers active", async () => {
    await renderGame();

    expect(screen.queryByText("Olagligt läge")).not.toBeInTheDocument();
    expect(screen.queryByText(/Aktivt språk/)).not.toBeInTheDocument();
  });

  it("shows Wild mode's active language and updates it after a full round", async () => {
    const german = createGermanWordClassificationRules();
    const french = createFrenchWordClassificationRules();
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["R", "E", "N"],
      modifiers: new Set(["WILD"]),
      wildLanguages: ["de", "fr"],
    });
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules: german,
      wildClassificationRules: [german, french],
      alphabet: SWEDISH_ALPHABET,
    };
    render(
      <GameScreen initialState={setup.state} deps={deps} onExit={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(screen.getByText("Aktivt språk: Tyska")).toBeInTheDocument();

    // REN is a real German word — with "de" active (round 0) it commits directly.
    const centre = setup.board.centreCoordinate;
    await userEvent.click(screen.getByLabelText("Bricka R, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka E, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 1}`),
    );
    await userEvent.click(screen.getByLabelText("Bricka N, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column + 2}`),
    );
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    // Player two passes — this completes the full round, rotating the active language to "fr".
    await userEvent.click(screen.getByRole("button", { name: "Passa" }));
    const confirmPassDialog = screen.getByRole("dialog", {
      name: "Bekräfta passning",
    });
    await userEvent.click(
      within(confirmPassDialog).getByRole("button", { name: "Passa" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(screen.getByText("Aktivt språk: Franska")).toBeInTheDocument();
  });

  it("swaps two rack tiles when a second one is tapped with a tile already selected", async () => {
    await renderGame(["B", "I", "L"]);
    const rackLetters = () =>
      Array.from(
        screen.getByRole("group", { name: "Din hand" }).querySelectorAll("button"),
      ).map((button) => button.textContent?.[0]);
    expect(rackLetters()).toEqual(["B", "I", "L"]);

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Bricka L, 1 poäng"));

    // The two exchange places; nothing is placed on the board.
    expect(rackLetters()).toEqual(["L", "I", "B"]);
    expect(screen.queryByLabelText(/^Pending bricka/)).not.toBeInTheDocument();
  });

  it("keeps the tile selected after a swap, so it can be walked along the rack", async () => {
    await renderGame(["B", "I", "L"]);
    const rackLetters = () =>
      Array.from(
        screen.getByRole("group", { name: "Din hand" }).querySelectorAll("button"),
      ).map((button) => button.textContent?.[0]);

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    expect(rackLetters()).toEqual(["I", "B", "L"]);

    // "B" is still the selected tile, so tapping the next one moves it along again.
    await userEvent.click(screen.getByLabelText("Bricka L, 1 poäng"));
    expect(rackLetters()).toEqual(["I", "L", "B"]);
  });

  it("still places the selected tile when a board square is tapped instead", async () => {
    const { setup } = await renderGame(["B", "I", "L"]);
    const centre = setup.board.centreCoordinate;

    await userEvent.click(screen.getByLabelText("Bricka B, 1 poäng"));
    await userEvent.click(
      screen.getByTestId(`cell-${centre.row},${centre.column}`),
    );

    expect(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    ).toBeInTheDocument();
  });

  it("shuffling the rack keeps the same tiles without losing the player's turn", async () => {
    await renderGame(["B", "I", "L", "A", "R", "E", "N"]);

    await userEvent.click(
      screen.getByRole("button", { name: "Blanda brickorna i din hand" }),
    );

    for (const letter of ["B", "I", "L", "A", "R", "E", "N"]) {
      expect(
        screen.getByLabelText(`Bricka ${letter}, 1 poäng`),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Spela" })).toBeInTheDocument();
  });

  it("ends the game immediately via 'Avsluta spel', without requiring two passes", async () => {
    await renderGame();

    await userEvent.click(screen.getByRole("button", { name: "Avsluta spel" }));
    const confirmDialog = screen.getByRole("dialog", {
      name: "Bekräfta att avsluta spelet",
    });
    await userEvent.click(
      within(confirmDialog).getByRole("button", { name: "Avsluta spel" }),
    );

    expect(
      screen.getByRole("heading", { name: "Spelet är slut" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Spelet avslutades i förtid.")).toBeInTheDocument();
  });
});

/**
 * Both ways of performing a replace, since neither is covered by the ordinary placement tests:
 * tapping a committed tile after selecting a rack tile, and dragging onto it. The drag test is
 * the one that needs a stub — `document.elementFromPoint`, which jsdom cannot answer without
 * layout — while everything downstream of it is real: `handleTileDrop`, `dispatchGameAction`'s
 * `allowReplace` option, the engine, and the Swedish error text. `e2e/replace-mode.spec.ts`
 * covers the drag with real hit-testing, including `MOVE_TILE`, which has no tap equivalent.
 */
describe("GameScreen: Replace mode", () => {
  /** Committed "BIL" through the centre, with a move in history so it is not the first move. */
  function renderReplaceGame(playerOneRackLetters: string[]) {
    const setup = buildEngineTestGame({
      playerOneRackLetters,
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    let board = setup.state.board;
    for (const [letter, columnOffset] of [
      ["B", -1],
      ["I", 0],
      ["L", 1],
    ] as const) {
      const tileId = createTileId();
      setup.tiles[tileId] = createLetterTile(tileId, letter, 1);
      board = placeCommittedTile(
        board,
        { row: centre.row, column: centre.column + columnOffset },
        tileId,
      );
    }
    const history = addHistoryEvent(setup.state.history, {
      id: createHistoryEventId(),
      sequence: nextSequence(setup.state.history),
      type: "WORD_MOVE_COMMITTED",
      playerId: setup.playerTwoId,
      payload: {
        placedTiles: [],
        words: ["BIL"],
        scoreAwarded: 3,
        usedUnknownWordApproval: false,
      },
    });
    const deps: GameControllerDependencies = {
      configuration: setup.configuration,
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
    render(
      <GameScreen
        initialState={{ ...setup.state, board, history }}
        deps={deps}
        onExit={vi.fn()}
      />,
    );
    return { setup, centre };
  }

  it("marks the displaced tile in the rack, and stops marking it once the turn ends", async () => {
    const { setup } = renderReplaceGame(["A", "I", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    // Before the replace, the "I" already in the hand carries no marking.
    expect(screen.getByLabelText("Bricka I, 1 poäng")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Bricka A, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Ersätt bricka I"));

    // The displaced "I" is distinguishable from the "I" that was always in the hand: same
    // letter and points, but its own accessible name and its own styling.
    const displaced = screen.getByLabelText("Bricka I, 1 poäng, ersatt bricka");
    expect(displaced).toBeInTheDocument();
    expect(screen.getByLabelText("Bricka I, 1 poäng")).toBeInTheDocument();
    expect(displaced.className).not.toBe(
      screen.getByLabelText("Bricka I, 1 poäng").className,
    );

    // Committing ends the turn, which lifts the restriction: it is an ordinary tile again by the
    // time this player next sees the rack.
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));
    await userEvent.click(screen.getByRole("button", { name: "Passa" }));
    const confirmPass = screen.getByRole("dialog", {
      name: "Bekräfta passning",
    });
    await userEvent.click(
      within(confirmPass).getByRole("button", { name: "Passa" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(
      screen.getByText(`Din tur: ${setup.state.players[0].name}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/ersatt bricka/),
    ).not.toBeInTheDocument();
  });

  it("replaces a committed tile by tapping it after selecting a rack tile", async () => {
    renderReplaceGame(["A", "I", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    // A committed tile offers nothing until a rack tile is waiting to be placed.
    expect(screen.queryByLabelText("Ersätt bricka I")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Bricka A, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Ersätt bricka I"));

    expect(
      screen.getByLabelText("Pending bricka A, tryck för att redigera"),
    ).toBeInTheDocument();
    // The displaced "I" joins the rack alongside the "I" that was already there, marked out
    // from it as a tile this move took off the board.
    expect(
      screen.getByLabelText("Bricka I, 1 poäng, ersatt bricka"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Bricka I, 1 poäng")).toBeInTheDocument();
  });

  it("drags a rack tile onto a committed tile and takes the displaced tile into the rack", async () => {
    const { centre } = renderReplaceGame(["A", "I", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));
    const centreCell = screen.getByTestId(`cell-${centre.row},${centre.column}`);

    dragOnto(screen.getByLabelText("Bricka A, 1 poäng"), centreCell);

    expect(
      await screen.findByLabelText(
        "Pending bricka A, tryck för att redigera",
      ),
    ).toBeInTheDocument();
    // The displaced "I" joins the replacing player's rack — alongside the "I" already there.
    expect(
      screen.getByLabelText("Bricka I, 1 poäng, ersatt bricka"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Bricka I, 1 poäng")).toBeInTheDocument();
  });

  it("shows a Swedish error when the replacing tile carries the same letter (DEC-015)", async () => {
    renderReplaceGame(["A", "I", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    await userEvent.click(screen.getByLabelText("Bricka I, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Ersätt bricka I"));

    expect(
      await screen.findByText(
        "En bricka kan bara ersättas av en bricka med en annan bokstav.",
      ),
    ).toBeInTheDocument();
    // Nothing moved: the committed "I" is still on the board and the rack is untouched.
    expect(
      screen.queryByLabelText(/^Pending bricka/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Bricka I, 1 poäng")).toHaveLength(1);
  });

  it("awards nothing for a word the replace only re-lettered (DEC-016)", async () => {
    const { setup } = renderReplaceGame(["A", "I", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    // "BIL" becomes "BAL" — a real word, same length, so it commits and scores nothing.
    await userEvent.click(screen.getByLabelText("Bricka A, 1 poäng"));
    await userEvent.click(screen.getByLabelText("Ersätt bricka I"));
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));
    await userEvent.click(screen.getByRole("button", { name: "Fortsätt" }));

    expect(
      screen.getByText(`${setup.state.players[0].name}: BAL +0`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${setup.state.players[0].name}: 0`),
    ).toBeInTheDocument();
  });
});
