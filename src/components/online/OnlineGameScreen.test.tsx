import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MatchSnapshot } from "../../application/online/matchApi";
import { createGame } from "../../game/engine/createGame";
import type { GameState } from "../../game/model/game";
import {
  requiresPlayerConfirmation,
  waitingForOpponentApproval,
} from "../../game/model/turnState";
import { toPlayerGameView } from "../../game/view/playerGameView";

import { OnlineGameScreen } from "./OnlineGameScreen";

/**
 * The views come from the real engine through the real `toPlayerGameView`, so what these tests
 * render is what the server would actually send. A hand-written fixture could quietly contain
 * something the server never sends — or omit something it does.
 */
function game(): GameState {
  return createGame({
    playerOneName: "August",
    playerTwoName: "Anna",
    rackSize: 7,
  });
}

function snapshotFor(
  state: GameState,
  playerIndex: 0 | 1,
  configuration: MatchSnapshot["configuration"] = {
    rackSize: 7,
    modifiers: [],
  },
): MatchSnapshot {
  return {
    matchId: "match-1",
    revision: 4,
    status: "ACTIVE",
    configuration,
    view: toPlayerGameView(state, state.players[playerIndex].id),
  };
}

function renderScreen(snapshot: MatchSnapshot) {
  const handlers = {
    onAction: vi.fn(),
    onRefresh: vi.fn(),
    onExit: vi.fn(),
  };
  render(<OnlineGameScreen snapshot={snapshot} {...handlers} />);
  return handlers;
}

/** The state, arranged so the given player is the one to move. */
function onTurn(state: GameState, playerIndex: 0 | 1): GameState {
  const playerId = state.players[playerIndex].id;
  return {
    ...state,
    currentPlayerId: playerId,
    turnState: { type: "PLAYER_TURN", playerId },
  };
}

describe("OnlineGameScreen", () => {
  it("sends the whole placement when the move is submitted", async () => {
    const state = onTurn(game(), 0);
    const snapshot = snapshotFor(state, 0);
    const handlers = renderScreen(snapshot);
    /*
     * The first tile that is not blank, clicked by its own id rather than by position. The bag is
     * shuffled, so a rack may open with a blank — which is labelled "Blank bricka" and, when
     * placed, asks for a letter first. Taking "the first tile" and clicking "the first thing
     * labelled Bricka …" were therefore two different tiles on some runs.
     */
    const plainTile = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;

    const rack = screen.getByRole("group", { name: "Din hand" });
    await userEvent.click(
      rack.querySelector<HTMLElement>(`[data-rack-tile-id="${plainTile}"]`)!,
    );
    await userEvent.click(screen.getByTestId("cell-7,7"));
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(handlers.onAction).toHaveBeenCalledWith({
      type: "SUBMIT_MOVE",
      placements: [
        {
          tileId: plainTile,
          coordinate: { row: 7, column: 7 },
          representedLetter: undefined,
        },
      ],
    });
  });

  it("says whose turn it is, and offers nothing to play when it is not yours", () => {
    const state = onTurn(game(), 0);

    renderScreen(snapshotFor(state, 1));

    expect(screen.getByText("Väntar på motståndaren.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spela" })).toBeDisabled();
  });

  it("passes the turn, once the confirmation is answered", async () => {
    const handlers = renderScreen(snapshotFor(onTurn(game(), 0), 0));

    // Passing asks first, exactly as it does in the local game — the same component, so the same
    // safeguard against ending a turn by a stray tap.
    await userEvent.click(screen.getByRole("button", { name: "Passa" }));
    expect(handlers.onAction).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Passa" }),
    );

    expect(handlers.onAction).toHaveBeenCalledWith({ type: "PASS" });
  });

  /* Section 21: the proposer is asked before the opponent ever sees the word. */
  it("offers Spela ändå to the proposer", async () => {
    const base = onTurn(game(), 0);
    const proposer = base.players[0].id;
    const state: GameState = {
      ...base,
      turnState: requiresPlayerConfirmation(proposer),
      pendingMove: {
        playerId: proposer,
        placedTiles: [],
        status: "REQUIRES_PLAYER_CONFIRMATION",
        wordResults: [
          {
            status: "UNKNOWN_WORD",
            word: "GRÖMP",
            normalizedWord: "GRÖMP",
          },
        ],
      },
    };

    const handlers = renderScreen(snapshotFor(state, 0));

    expect(
      screen.getByText('"GRÖMP" finns inte i ordlistan.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Spela ändå" }));

    expect(handlers.onAction).toHaveBeenCalledWith({
      type: "CONFIRM_PROPOSAL",
    });
  });

  it("asks the reviewer to accept or reject, and shows them no rack of their own to play from", async () => {
    const base = onTurn(game(), 0);
    const proposer = base.players[0].id;
    const reviewer = base.players[1].id;
    const state: GameState = {
      ...base,
      turnState: waitingForOpponentApproval(proposer, reviewer),
      pendingMove: {
        playerId: proposer,
        placedTiles: [],
        status: "WAITING_FOR_OPPONENT",
        wordResults: [
          {
            status: "UNKNOWN_WORD",
            word: "GRÖMP",
            normalizedWord: "GRÖMP",
          },
        ],
      },
    };

    const handlers = renderScreen(snapshotFor(state, 1));

    await userEvent.click(screen.getByRole("button", { name: "Godkänn" }));
    expect(handlers.onAction).toHaveBeenCalledWith({
      type: "ACCEPT_PROPOSED_MOVE",
    });

    await userEvent.click(screen.getByRole("button", { name: "Neka" }));
    expect(handlers.onAction).toHaveBeenCalledWith({
      type: "REJECT_PROPOSED_MOVE",
    });

    expect(
      screen.queryByRole("button", { name: "Spela" }),
    ).not.toBeInTheDocument();
  });

  /*
   * The rules a match is played by reach the screen with the match, not with the game view
   * (T28.6). Reported in play: with Replace mode on, tapping a rack tile and then a committed
   * tile did nothing at all, because the board was never told the mode was active.
   */
  describe("the rules the match is played by", () => {
    /** A committed tile on the centre square, which a replace would target. */
    function withCommittedTile(): GameState {
      const state = onTurn(game(), 0);
      const [tileId] = state.players[1].rack.tileIds;
      return {
        ...state,
        board: {
          occupiedCells: [
            ...state.board.occupiedCells,
            { coordinate: { row: 7, column: 7 }, tileId },
          ],
        },
        players: [
          state.players[0],
          {
            ...state.players[1],
            rack: { tileIds: state.players[1].rack.tileIds.slice(1) },
          },
        ] as GameState["players"],
      };
    }

    it("offers a committed tile as a target when Replace mode is on", async () => {
      renderScreen(
        snapshotFor(withCommittedTile(), 0, {
          rackSize: 7,
          modifiers: ["REPLACE"],
        }),
      );

      const rack = screen.getByRole("group", { name: "Din hand" });
      await userEvent.click(within(rack).getAllByRole("button")[0]!);

      expect(
        screen.getByRole("button", { name: /^Ersätt bricka/ }),
      ).toBeInTheDocument();
    });

    it("leaves a committed tile alone in an ordinary game", async () => {
      renderScreen(snapshotFor(withCommittedTile(), 0));

      const rack = screen.getByRole("group", { name: "Din hand" });
      await userEvent.click(within(rack).getAllByRole("button")[0]!);

      expect(
        screen.queryByRole("button", { name: /^Ersätt bricka/ }),
      ).not.toBeInTheDocument();
    });

    it("places onto a committed tile when Replace mode is on, and submits it", async () => {
      // The reported bug end to end: select from the hand, tap the committed tile, play.
      const state = withCommittedTile();
      const snapshot = snapshotFor(state, 0, {
        rackSize: 7,
        modifiers: ["REPLACE"],
      });
      const handlers = renderScreen(snapshot);
      const plainTile = snapshot.view.ownRack.tileIds.find(
        (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
      )!;

      const rack = screen.getByRole("group", { name: "Din hand" });
      await userEvent.click(
        rack.querySelector<HTMLElement>(`[data-rack-tile-id="${plainTile}"]`)!,
      );
      await userEvent.click(
        screen.getByRole("button", { name: /^Ersätt bricka/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Spela" }));

      expect(handlers.onAction).toHaveBeenCalledWith({
        type: "SUBMIT_MOVE",
        placements: [
          {
            tileId: plainTile,
            coordinate: { row: 7, column: 7 },
            representedLetter: undefined,
          },
        ],
      });
    });

    it("refuses to stack a tile on a committed one in an ordinary game", async () => {
      const state = withCommittedTile();
      const snapshot = snapshotFor(state, 0);
      const handlers = renderScreen(snapshot);

      const rack = screen.getByRole("group", { name: "Din hand" });
      await userEvent.click(within(rack).getAllByRole("button")[0]!);
      await userEvent.click(screen.getByTestId("cell-7,7"));

      expect(screen.getByRole("button", { name: "Spela" })).toBeDisabled();
      expect(handlers.onAction).not.toHaveBeenCalled();
    });

    it("names the modes in play, so a player can see which game they are in", () => {
      renderScreen(
        snapshotFor(onTurn(game(), 0), 0, {
          rackSize: 7,
          modifiers: ["CRISSCROSS", "REPLACE"],
        }),
      );

      expect(screen.getByText(/Kryssläge/)).toBeInTheDocument();
      expect(screen.getByText(/Ersättningsläge/)).toBeInTheDocument();
    });

    it("names the language Wild mode is currently validating against", () => {
      // Which language is active decides whether a word is a word, so a player who cannot see it
      // is guessing (`game-modifiers.md` section 10).
      renderScreen(
        snapshotFor(onTurn(game(), 0), 0, {
          rackSize: 7,
          modifiers: ["WILD"],
          wildLanguages: ["sv", "en"],
        }),
      );

      expect(screen.getByText(/Svenska/)).toBeInTheDocument();
    });
  });

  /*
   * Shuffling is local to this client (T28.5): the server holds the authoritative rack, and this
   * screen decides only the order the player sees it in — the same division DEC-026 draws for
   * arranging tiles. So these are about what the rack shows, not about what is sent.
   */
  describe("shuffling the rack", () => {
    it("reorders the tiles in hand without telling the server", async () => {
      const state = onTurn(game(), 0);
      const snapshot = snapshotFor(state, 0);
      const handlers = renderScreen(snapshot);
      const rack = screen.getByRole("group", { name: "Din hand" });
      const before = within(rack)
        .getAllByRole("button")
        .map((tile) => tile.dataset.rackTileId);

      // A reversal: deterministic, and every tile moves.
      vi.spyOn(Math, "random").mockReturnValue(0);
      await userEvent.click(
        screen.getByRole("button", { name: "Blanda brickorna i din hand" }),
      );
      vi.restoreAllMocks();

      const after = within(rack)
        .getAllByRole("button")
        .map((tile) => tile.dataset.rackTileId);

      expect(after).not.toEqual(before);
      expect([...after].sort()).toEqual([...before].sort());
      expect(handlers.onAction).not.toHaveBeenCalled();
    });

    it("keeps the chosen order when the server sends the same rack again", () => {
      // An open match polls every 15 seconds (DEC-020). A refresh that re-sent the server's own
      // order would undo the shuffle a few seconds after every use.
      const state = onTurn(game(), 0);
      const snapshot = snapshotFor(state, 0);
      const { rerender } = render(
        <OnlineGameScreen
          snapshot={snapshot}
          onAction={vi.fn()}
          onRefresh={vi.fn()}
          onExit={vi.fn()}
        />,
      );

      vi.spyOn(Math, "random").mockReturnValue(0);
      fireEvent.click(
        screen.getByRole("button", { name: "Blanda brickorna i din hand" }),
      );
      vi.restoreAllMocks();

      const rack = screen.getByRole("group", { name: "Din hand" });
      const shuffled = within(rack)
        .getAllByRole("button")
        .map((tile) => tile.dataset.rackTileId);

      rerender(
        <OnlineGameScreen
          snapshot={{ ...snapshot, revision: snapshot.revision + 1 }}
          onAction={vi.fn()}
          onRefresh={vi.fn()}
          onExit={vi.fn()}
        />,
      );

      expect(
        within(screen.getByRole("group", { name: "Din hand" }))
          .getAllByRole("button")
          .map((tile) => tile.dataset.rackTileId),
      ).toEqual(shuffled);
    });
  });

  /*
   * Section 26: a rejected placement comes back to its proposer as something they can edit, so
   * the screen has to adopt what the server is holding rather than start from an empty board.
   */
  it("takes up a placement the server handed back after a rejection", () => {
    const base = onTurn(game(), 0);
    const proposer = base.players[0].id;
    const [tileId] = base.players[0].rack.tileIds;
    const state: GameState = {
      ...base,
      pendingMove: {
        playerId: proposer,
        placedTiles: [{ tileId: tileId!, coordinate: { row: 7, column: 7 } }],
        status: "EDITING",
      },
    };

    renderScreen(snapshotFor(state, 0));

    /*
     * The tile is on the board, so it is no longer among the tiles left in hand. Counted inside
     * the rack rather than across the screen: the rack labels a blank "Blank bricka", which an
     * anchored /^Bricka / misses, while a board tile is labelled "Pending bricka …", which a
     * looser pattern would wrongly include. The bag is shuffled, so either mistake only shows up
     * on some runs.
     */
    const rack = screen.getByRole("group", { name: "Din hand" });
    expect(within(rack).getAllByLabelText(/bricka/i)).toHaveLength(6);
  });
});
