import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MatchSnapshot } from "../../application/online/matchApi";
import { createGame } from "../../game/engine/createGame";
import { placeCommittedTile } from "../../game/model/board";
import type { TileId } from "../../game/model/ids";
import type { GameState } from "../../game/model/game";
import {
  requiresPlayerConfirmation,
  waitingForOpponentApproval,
} from "../../game/model/turnState";
import { tileLetter } from "../../game/model/tile";
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

function renderScreen(snapshot: MatchSnapshot, props = {}) {
  const handlers = {
    onAction: vi.fn(),
    onRefresh: vi.fn(),
    onExit: vi.fn(),
  };
  render(<OnlineGameScreen snapshot={snapshot} {...handlers} {...props} />);
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
   * Reported in play (known-bugs item 15): after "Ändra" on an unknown word, the tiles were lost
   * — not back in the hand, and gone from the board once taken back. While the server holds a
   * pending move those tiles are on the board rather than in `ownRack`, so a hand built from the
   * rack alone left a tile taken off the board in neither place.
   */
  describe("a move the server is holding", () => {
    /** August has proposed a word and is being asked whether to play it anyway. */
    function awaitingConfirmation(): GameState {
      const state = onTurn(game(), 0);
      const proposer = state.players[0].id;
      const [first, second] = state.players[0].rack.tileIds;

      return {
        ...state,
        players: [
          {
            ...state.players[0],
            rack: { tileIds: state.players[0].rack.tileIds.slice(2) },
          },
          state.players[1],
        ] as GameState["players"],
        pendingMove: {
          playerId: proposer,
          placedTiles: [
            { tileId: first!, coordinate: { row: 7, column: 7 } },
            { tileId: second!, coordinate: { row: 7, column: 8 } },
          ],
          status: "EDITING",
        },
        turnState: { type: "PLAYER_TURN", playerId: proposer },
      };
    }

    function handSize() {
      return within(
        screen.getByRole("group", { name: "Din hand" }),
      ).getAllByRole("button").length;
    }

    it("counts the tiles it is holding as part of this player's hand", async () => {
      renderScreen(snapshotFor(awaitingConfirmation(), 0));

      // Five left in the rack proper, two on the board: the player still holds seven.
      expect(handSize()).toBe(5);

      await userEvent.click(
        screen.getAllByRole("button", { name: /^Pending bricka/ })[0]!,
      );

      expect(handSize()).toBe(6);
    });

    it("clears through the server, since the tiles it holds are the ones being returned", async () => {
      const handlers = renderScreen(snapshotFor(awaitingConfirmation(), 0));

      await userEvent.click(screen.getByRole("button", { name: "Rensa" }));

      expect(handlers.onAction).toHaveBeenCalledWith({
        type: "CLEAR_PENDING_MOVE",
      });
    });

    it("clears a placement the server has never seen without asking it to", async () => {
      const state = onTurn(game(), 0);
      const snapshot = snapshotFor(state, 0);
      const handlers = renderScreen(snapshot);
      const plainTile = snapshot.view.ownRack.tileIds.find(
        (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
      )!;

      const rack = screen.getByRole("group", { name: "Din hand" });
      await userEvent.click(
        rack.querySelector<HTMLElement>(`[data-rack-tile-id="${plainTile}"]`)!,
      );
      await userEvent.click(screen.getByTestId("cell-7,7"));
      await userEvent.click(screen.getByRole("button", { name: "Rensa" }));

      // Nothing for the server to clear: it never saw this placement.
      expect(handlers.onAction).not.toHaveBeenCalled();
      expect(handSize()).toBe(7);
    });

    it("does not offer to pass or exchange while a move is in progress", () => {
      renderScreen(snapshotFor(awaitingConfirmation(), 0));

      // The engine refuses both while a pending move exists, so offering them would only produce
      // a rule error — the hot-seat screen gates them the same way.
      expect(screen.getByRole("button", { name: "Passa" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Byt brickor" }),
      ).toBeDisabled();
    });
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

/*
 * The way back says how much is behind it (T30.1). This replaced a notifications screen of its
 * own: the match list already shows everything the screen did, so the only thing missing while a
 * match is open was a count.
 */
describe("OnlineGameScreen: what is waiting elsewhere", () => {
  function waiting(matchId: string, type = "YOUR_TURN") {
    return {
      id: `n-${matchId}`,
      type,
      otherUserName: "Anna",
      matchId,
      words: [],
      occurredAt: "2026-09-15T10:00:00.000Z",
    } as const;
  }

  it("badges the way back with the other matches that need the player", () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot, {
      notifications: [waiting("other-1"), waiting("other-2")],
    });

    expect(
      screen.getByRole("button", {
        name: /Mina matcher.*2 andra matcher väntar på dig/,
      }),
    ).toBeVisible();
  });

  /* The button leads away from this match, so counting it would misdescribe what is behind it. */
  it("leaves this match out of the count", () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot, {
      notifications: [waiting(snapshot.matchId), waiting("other-1")],
    });

    expect(
      screen.getByRole("button", {
        name: /Mina matcher.*1 annan match väntar på dig/,
      }),
    ).toBeVisible();
  });

  it("shows no badge when this is the only match waiting", () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot, { notifications: [waiting(snapshot.matchId)] });

    expect(screen.getByRole("button", { name: "Mina matcher" })).toBeVisible();
  });

  it("caps a large count at 99+", () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot, {
      notifications: Array.from({ length: 120 }, (_, i) =>
        waiting(`other-${i}`),
      ),
    });

    expect(screen.getByText("99+")).toBeVisible();
  });
});

/*
 * The live score preview, which online did without until T34.1 (DEC-035): the board, the
 * multipliers, the tiles being placed and the size of your own hand are all public, so the client
 * can score a placement without holding the game.
 */
describe("OnlineGameScreen: the live score preview", () => {
  /** The ids of two ordinary (non-blank) tiles in this player's hand. */
  function plainTiles(snapshot: MatchSnapshot) {
    return snapshot.view.ownRack.tileIds.filter(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    );
  }

  /** The score badge's text on one cell, or undefined when that cell shows no badge. */
  function badgeOn(testId: string): string | undefined {
    return (
      screen
        .getByTestId(testId)
        .querySelector<HTMLElement>('[class*="scoreBadge"]')?.textContent ??
      undefined
    );
  }

  async function placeFromRack(tileId: string, testId: string) {
    const rack = screen.getByRole("group", { name: "Din hand" });
    await userEvent.click(
      rack.querySelector<HTMLElement>(`[data-rack-tile-id="${tileId}"]`)!,
    );
    await userEvent.click(screen.getByTestId(testId));
  }

  it("shows what the placement would score, on the move's first tile", async () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot);
    const [first, second] = plainTiles(snapshot);
    const points = (tileId: TileId) => snapshot.view.tiles[tileId]!.points;

    // A single tile on the centre forms no word yet, so there is nothing to preview.
    await placeFromRack(first!, "cell-7,7");
    expect(badgeOn("cell-7,7")).toBeUndefined();

    await placeFromRack(second!, "cell-7,8");

    /*
     * The centre square doubles the word (`scrabbleBoard.ts`), which is the whole reason to show
     * this: the score is not the sum of the letters, and a player cannot see it from the tiles.
     */
    const expected = (points(first!) + points(second!)) * 2;
    expect(badgeOn("cell-7,7")).toBe(String(expected));
    // One badge for the whole move (ui-design.md section 17), not one per tile.
    expect(badgeOn("cell-7,8")).toBeUndefined();
  });

  it("shows nothing while the placement cannot be scored", async () => {
    const snapshot = snapshotFor(onTurn(game(), 0), 0);
    renderScreen(snapshot);
    const [first, second] = plainTiles(snapshot);

    // A gap between the two tiles: not a placement the engine would accept, so no preview.
    await placeFromRack(first!, "cell-7,7");
    await placeFromRack(second!, "cell-7,9");

    expect(badgeOn("cell-7,7")).toBeUndefined();
    expect(badgeOn("cell-7,9")).toBeUndefined();
  });
});

/*
 * Reported in play (known-bugs item 17): the reviewer could not see the word they were being
 * asked about. The board drew this client's own local arrangement, which for the reviewer is
 * empty — the server's pending move belongs to the opponent.
 */
describe("OnlineGameScreen: the proposed word on the board", () => {
  /** August has proposed an unknown word with two tiles at the centre; Anna must answer. */
  function proposed(): GameState {
    const state = onTurn(game(), 0);
    const proposer = state.players[0].id;
    const reviewer = state.players[1].id;
    /*
     * Two ordinary letters, not simply the first two in the rack: the bag is shuffled, so a rack
     * can open with a blank, and a blank placed without a chosen letter draws no letter at all.
     */
    const [first, second] = state.players[0].rack.tileIds.filter(
      (tileId) => state.tiles[tileId]!.kind === "LETTER",
    );
    const placedIds = new Set([first, second]);

    return {
      ...state,
      players: [
        {
          ...state.players[0],
          rack: {
            tileIds: state.players[0].rack.tileIds.filter(
              (tileId) => !placedIds.has(tileId),
            ),
          },
        },
        state.players[1],
      ] as GameState["players"],
      turnState: waitingForOpponentApproval(proposer, reviewer),
      pendingMove: {
        playerId: proposer,
        placedTiles: [
          { tileId: first!, coordinate: { row: 7, column: 7 } },
          { tileId: second!, coordinate: { row: 7, column: 8 } },
        ],
        status: "WAITING_FOR_OPPONENT",
        wordResults: [
          { status: "UNKNOWN_WORD", word: "GRÖMP", normalizedWord: "GRÖMP" },
        ],
      },
    };
  }

  it("shows the reviewer the proposed tiles, greyed out and inert", () => {
    const state = proposed();
    renderScreen(snapshotFor(state, 1));

    const [first, second] = state.pendingMove!.placedTiles;
    for (const [placed, testId] of [
      [first!, "cell-7,7"],
      [second!, "cell-7,8"],
    ] as const) {
      const letter = tileLetter(state.tiles[placed.tileId]!) ?? "";
      const tile = within(screen.getByTestId(testId)).getByLabelText(
        `Föreslagen bricka ${letter}, väntar på svar`,
      );
      expect(tile.className).toContain("underReview");
      // Not a control: the reviewer answers with Godkänn/Neka, not by editing the placement.
      expect(tile.tagName).toBe("DIV");
    }
  });

  it("greys the proposer's own tiles out too while the answer is pending", () => {
    const state = proposed();
    renderScreen(snapshotFor(state, 0));

    expect(screen.getByText("Väntar på motståndarens svar.")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Pending bricka/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText(/^Föreslagen bricka .*, väntar på svar$/),
    ).toHaveLength(2);
  });
});

/*
 * Replace mode online (`known-bugs.md` item 20). Reported in play: a tile played onto a committed
 * one seemed to disappear, the displaced tile never reached the hand, and only `Spela` revealed
 * that the placement had been real all along. The client tracked placements without modelling
 * what they displace, so its board and its hand both disagreed with the move it was about to send.
 */
describe("OnlineGameScreen: Replace mode", () => {
  const REPLACE_RULES = { rackSize: 7, modifiers: ["REPLACE"] } as const;
  const CENTRE = { row: 7, column: 7 };

  /** August to move, with one committed tile on the centre square for them to replace. */
  function gameWithCommittedTile() {
    const base = onTurn(game(), 0);
    const committedTileId = base.tileBag.tileIds.find(
      (tileId) => base.tiles[tileId]!.kind === "LETTER",
    )!;
    const state: GameState = {
      ...base,
      tileBag: {
        tileIds: base.tileBag.tileIds.filter(
          (tileId) => tileId !== committedTileId,
        ),
      },
      board: placeCommittedTile(base.board, CENTRE, committedTileId),
    };
    return { state, committedTileId };
  }

  function rackTileIds() {
    return Array.from(
      screen
        .getByRole("group", { name: "Din hand" })
        .querySelectorAll<HTMLElement>("[data-rack-tile-id]"),
    ).map((element) => element.dataset.rackTileId!);
  }

  async function selectAndPlace(tileId: string, testId: string) {
    const rack = screen.getByRole("group", { name: "Din hand" });
    await userEvent.click(
      rack.querySelector<HTMLElement>(`[data-rack-tile-id="${tileId}"]`)!,
    );
    /*
     * An occupied square is a div wrapping the tile's own button, and only the button carries
     * the click — an empty square is the button itself. Targeting whichever it is keeps this
     * helper usable for both, which is the point of a Replace-mode test.
     */
    const cell = screen.getByTestId(testId);
    await userEvent.click(cell.querySelector("button") ?? cell);
  }

  it("puts the played tile on the square and the displaced tile in the hand", async () => {
    const { state, committedTileId } = gameWithCommittedTile();
    const snapshot = snapshotFor(state, 0, REPLACE_RULES);
    renderScreen(snapshot);

    const replacing = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;
    const replacingLetter = tileLetter(snapshot.view.tiles[replacing]!)!;
    const displacedLetter = tileLetter(state.tiles[committedTileId]!)!;

    await selectAndPlace(replacing, "cell-7,7");

    // The played tile is on the board, as an editable pending tile.
    expect(
      screen.getByLabelText(
        `Pending bricka ${replacingLetter}, tryck för att redigera`,
      ),
    ).toBeInTheDocument();
    // The displaced tile is in the hand, marked out as restricted for the rest of the turn.
    expect(rackTileIds()).toContain(committedTileId);
    expect(
      screen.getByLabelText(
        new RegExp(`^Bricka ${displacedLetter}, \\d+ poäng, ersatt bricka$`),
      ),
    ).toBeInTheDocument();
    // One out, one in: the hand is the same size it was.
    expect(rackTileIds()).toHaveLength(snapshot.view.ownRack.tileIds.length);
    expect(rackTileIds()).not.toContain(replacing);
  });

  it("puts the committed tile back when the replacement is taken back", async () => {
    const { state, committedTileId } = gameWithCommittedTile();
    const snapshot = snapshotFor(state, 0, REPLACE_RULES);
    renderScreen(snapshot);

    const replacing = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;
    const replacingLetter = tileLetter(snapshot.view.tiles[replacing]!)!;

    await selectAndPlace(replacing, "cell-7,7");
    await userEvent.click(
      screen.getByLabelText(
        `Pending bricka ${replacingLetter}, tryck för att redigera`,
      ),
    );

    expect(rackTileIds()).toContain(replacing);
    expect(rackTileIds()).not.toContain(committedTileId);
    expect(screen.queryByLabelText(/ersatt bricka/)).not.toBeInTheDocument();
    expect(rackTileIds()).toHaveLength(snapshot.view.ownRack.tileIds.length);
  });

  it("takes a re-played displaced tile back with the replacement that displaced it", async () => {
    const { state, committedTileId } = gameWithCommittedTile();
    const snapshot = snapshotFor(state, 0, REPLACE_RULES);
    const handlers = renderScreen(snapshot);

    const replacing = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;
    const replacingLetter = tileLetter(snapshot.view.tiles[replacing]!)!;

    // Replace the committed tile, then play the displaced tile beside it.
    await selectAndPlace(replacing, "cell-7,7");
    await selectAndPlace(committedTileId, "cell-7,8");
    expect(rackTileIds()).not.toContain(committedTileId);

    // Taking the replacement back returns the displaced tile to its square, so its own
    // placement cannot stand — one tile cannot be in two places (`removePendingTile`).
    await userEvent.click(
      screen.getByLabelText(
        `Pending bricka ${replacingLetter}, tryck för att redigera`,
      ),
    );

    // The displaced tile is back where it came from, and no longer beside it.
    const displacedLetter = tileLetter(state.tiles[committedTileId]!)!;
    expect(screen.getByTestId("cell-7,7")).toHaveTextContent(displacedLetter);
    expect(screen.getByTestId("cell-7,8")).not.toHaveTextContent(/[A-ZÅÄÖ]/);
    // Only the replacing tile returns to the hand: the other one is on the board again.
    expect(rackTileIds()).toContain(replacing);
    expect(rackTileIds()).not.toContain(committedTileId);
    expect(rackTileIds()).toHaveLength(snapshot.view.ownRack.tileIds.length);
    // Local editing throughout — nothing was sent to the server (DEC-026).
    expect(handlers.onAction).not.toHaveBeenCalled();
  });

  it("sends the replacement as an ordinary placement, for the server to judge", async () => {
    const { state } = gameWithCommittedTile();
    const snapshot = snapshotFor(state, 0, REPLACE_RULES);
    const handlers = renderScreen(snapshot);

    const replacing = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;

    await selectAndPlace(replacing, "cell-7,7");
    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(handlers.onAction).toHaveBeenCalledWith({
      type: "SUBMIT_MOVE",
      placements: [
        {
          tileId: replacing,
          coordinate: CENTRE,
          representedLetter: undefined,
        },
      ],
    });
  });

  it("offers no committed tile as a target when Replace mode is off", async () => {
    const { state, committedTileId } = gameWithCommittedTile();
    const snapshot = snapshotFor(state, 0);
    renderScreen(snapshot);

    const tile = snapshot.view.ownRack.tileIds.find(
      (tileId) => snapshot.view.tiles[tileId]!.kind === "LETTER",
    )!;

    await selectAndPlace(tile, "cell-7,7");

    // Nothing moved: the committed tile is untouched and the hand is unchanged.
    expect(rackTileIds()).toContain(tile);
    expect(rackTileIds()).not.toContain(committedTileId);
    expect(screen.queryByLabelText(/^Pending bricka/)).not.toBeInTheDocument();
  });
});
