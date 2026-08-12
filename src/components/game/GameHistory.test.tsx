import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { addHistoryEvent, createGameHistory } from "../../game/model/history";
import { createHistoryEventId, createPlayerId } from "../../game/model/ids";
import { GameHistory } from "./GameHistory";

describe("GameHistory", () => {
  it("shows an empty message when nothing has happened yet", () => {
    render(
      <GameHistory history={createGameHistory()} playerNames={{}} />,
    );

    expect(screen.getByText("Inga händelser än.")).toBeInTheDocument();
  });

  it("renders a committed word move with its score", () => {
    const august = createPlayerId();
    let history = createGameHistory();
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "WORD_MOVE_COMMITTED",
      playerId: august,
      payload: {
        placedTiles: [],
        words: ["SKOG"],
        scoreAwarded: 12,
        usedUnknownWordApproval: false,
      },
    });

    render(
      <GameHistory history={history} playerNames={{ [august]: "August" }} />,
    );

    expect(screen.getByText("August: SKOG +12")).toBeInTheDocument();
  });

  it("collapses an accepted unknown-word proposal into one line noting who approved it", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    let history = createGameHistory();
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "UNKNOWN_WORD_PROPOSED",
      playerId: august,
      payload: { words: ["GRÖMP"] },
    });
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 1,
      type: "UNKNOWN_WORD_ACCEPTED",
      playerId: anna,
      payload: { words: ["GRÖMP"] },
    });
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 2,
      type: "WORD_MOVE_COMMITTED",
      playerId: august,
      payload: {
        placedTiles: [],
        words: ["GRÖMP"],
        scoreAwarded: 18,
        usedUnknownWordApproval: true,
      },
    });

    render(
      <GameHistory
        history={history}
        playerNames={{ [august]: "August", [anna]: "Anna" }}
      />,
    );

    expect(screen.getByText("August: GRÖMP +18")).toBeInTheDocument();
    expect(screen.getByText("Godkänt av Anna")).toBeInTheDocument();
    expect(screen.queryByText(/GRÖMP finns inte/)).not.toBeInTheDocument();
  });

  it("renders a rejected proposal as its own line", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    let history = createGameHistory();
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "UNKNOWN_WORD_REJECTED",
      playerId: anna,
      payload: {
        proposingPlayerId: august,
        reviewingPlayerId: anna,
        words: ["GRÖMP"],
      },
    });

    render(
      <GameHistory
        history={history}
        playerNames={{ [august]: "August", [anna]: "Anna" }}
      />,
    );

    expect(screen.getByText("August: GRÖMP")).toBeInTheDocument();
    expect(screen.getByText("Nekat av Anna")).toBeInTheDocument();
  });

  it("renders pass and exchange events", () => {
    const august = createPlayerId();
    let history = createGameHistory();
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "PASS",
      playerId: august,
      payload: {},
    });
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 1,
      type: "TILES_EXCHANGED",
      playerId: august,
      payload: { tileCount: 3 },
    });

    render(
      <GameHistory history={history} playerNames={{ [august]: "August" }} />,
    );

    expect(screen.getByText("August: passar")).toBeInTheDocument();
    expect(screen.getByText("August: byter 3 brickor")).toBeInTheDocument();
  });
});
