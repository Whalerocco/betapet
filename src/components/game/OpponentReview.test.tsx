import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpponentReview } from "./OpponentReview";

describe("OpponentReview", () => {
  it("shows the proposing player's name, the unknown word(s), and the score preview", () => {
    render(
      <OpponentReview
        proposingPlayerName="August"
        words={["GRÖMP"]}
        scorePreview={12}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        'August vill spela "GRÖMP", som inte finns i ordlistan.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("12 poäng om läggningen godkänns."),
    ).toBeInTheDocument();
  });

  it("calls onAccept for Godkänn and onReject for Neka", async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <OpponentReview
        proposingPlayerName="August"
        words={["GRÖMP"]}
        scorePreview={12}
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Neka" }));
    await userEvent.click(screen.getByRole("button", { name: "Godkänn" }));

    expect(onReject).toHaveBeenCalledOnce();
    expect(onAccept).toHaveBeenCalledOnce();
  });
});
