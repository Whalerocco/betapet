import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBoard } from "./ScoreBoard";

const players = [
  { name: "August", score: 12, isCurrent: true },
  { name: "Anna", score: 8, isCurrent: false },
];

describe("ScoreBoard", () => {
  it("shows player names, scores, and remaining tile count", () => {
    render(<ScoreBoard players={players} tilesRemaining={42} />);

    expect(screen.getByText("August: 12")).toBeInTheDocument();
    expect(screen.getByText("Anna: 8")).toBeInTheDocument();
    expect(screen.getByText("42 brickor kvar")).toBeInTheDocument();
  });

  it("shows no modifier or language badges when none are given", () => {
    render(<ScoreBoard players={players} tilesRemaining={42} />);

    expect(screen.queryByText(/läge/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aktivt språk/)).not.toBeInTheDocument();
  });

  it("shows a badge for every active modifier", () => {
    render(
      <ScoreBoard
        players={players}
        tilesRemaining={42}
        activeModifierLabels={["Kryssläge", "Olagligt läge"]}
      />,
    );

    expect(screen.getByText("Kryssläge")).toBeInTheDocument();
    expect(screen.getByText("Olagligt läge")).toBeInTheDocument();
  });

  it("shows the active language when given", () => {
    render(
      <ScoreBoard
        players={players}
        tilesRemaining={42}
        activeModifierLabels={["Roterande språkläge"]}
        activeLanguageLabel="Tyska"
      />,
    );

    expect(screen.getByText("Aktivt språk: Tyska")).toBeInTheDocument();
  });
});
