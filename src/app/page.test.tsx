import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { saveLocalGame } from "../application/persistence/localGameStorage";
import { SWEDISH_CONFIGURATION_ID } from "../game/configuration/swedishConfiguration";
import { createGame } from "../game/engine/createGame";
import Home from "./page";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home", () => {
  it("renders the Betapet heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Betapet" }),
    ).toBeInTheDocument();
  });

  it("does not offer Fortsätt spel when no game is saved", async () => {
    render(<Home />);

    expect(
      await screen.findByRole("button", { name: "Nytt spel" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fortsätt spel" }),
    ).not.toBeInTheDocument();
  });

  it("offers Fortsätt spel and resumes behind a privacy-safe handoff", async () => {
    const state = createGame({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
    });
    saveLocalGame({ ...state, configurationId: SWEDISH_CONFIGURATION_ID }, 7, new Set());
    render(<Home />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Fortsätt spel" }),
    );

    expect(
      screen.getByText(/Spelet är redo att fortsätta\./),
    ).toBeInTheDocument();
  });

  it("asks for confirmation before starting a new game over an unfinished saved one", async () => {
    const state = createGame({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
    });
    saveLocalGame({ ...state, configurationId: SWEDISH_CONFIGURATION_ID }, 7, new Set());
    render(<Home />);
    await screen.findByRole("button", { name: "Fortsätt spel" });

    await userEvent.click(screen.getByRole("button", { name: "Nytt spel" }));

    expect(
      screen.getByText("Det finns redan ett pågående spel."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Starta nytt" }));

    expect(screen.getByText("Nytt spel")).toBeInTheDocument();
    expect(screen.getByLabelText("Spelare 1")).toBeInTheDocument();
  });

  it("goes straight to setup when starting new with no unfinished saved game", async () => {
    render(<Home />);
    await screen.findByRole("button", { name: "Nytt spel" });

    await userEvent.click(screen.getByRole("button", { name: "Nytt spel" }));

    expect(screen.getByLabelText("Spelare 1")).toBeInTheDocument();
  });

  it("persists a modifier selected at setup, instead of silently dropping it", async () => {
    render(<Home />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Nytt spel" }),
    );
    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Olagligt läge/));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    const saved = JSON.parse(
      window.localStorage.getItem("betapet:local-game") ?? "{}",
    );
    expect(saved.modifiers).toEqual(["ILLEGAL"]);
  });

  it(
    "starts a Polyglot game end to end, loading the extra dictionary and persisting the language selection",
    async () => {
      render(<Home />);
      await userEvent.click(
        await screen.findByRole("button", { name: "Nytt spel" }),
      );
      await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
      await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
      await userEvent.click(screen.getByLabelText(/Flerspråksläge/));
      await userEvent.click(screen.getByLabelText("Tyska"));
      await userEvent.click(
        screen.getByRole("button", { name: "Starta spel" }),
      );

      // The setup form shows a loading state while the German dictionary loads (dynamic import).
      expect(
        await screen.findByRole("button", { name: "Förbereder spelet…" }),
      ).toBeInTheDocument();

      // Once resolved, the game actually starts (the setup form is gone) rather than hanging.
      // Which player's turn/handoff shows first depends on a random starting-tile draw, so this
      // only asserts we've left the setup screen, not which name/screen appears.
      await waitFor(
        () => {
          expect(screen.queryByLabelText("Spelare 1")).not.toBeInTheDocument();
        },
        { timeout: 15000 },
      );

      const saved = JSON.parse(
        window.localStorage.getItem("betapet:local-game") ?? "{}",
      );
      expect(saved.modifiers).toEqual(["POLYGLOT"]);
      expect(saved.polyglotLanguages).toEqual(["sv", "de"]);
    },
    20000,
  );
});
