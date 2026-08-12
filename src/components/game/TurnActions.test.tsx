import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TurnActions } from "./TurnActions";

const baseProps = {
  canSubmit: false,
  canPass: false,
  canClear: false,
  exchangeMode: true,
  canStartExchange: false,
  onSubmit: vi.fn(),
  onClear: vi.fn(),
  onStartExchange: vi.fn(),
  onCancelExchange: vi.fn(),
  onConfirmExchange: vi.fn(),
  onPass: vi.fn(),
};

describe("TurnActions exchange confirmation label", () => {
  it("uses the singular form for exactly one tile", () => {
    render(<TurnActions {...baseProps} exchangeSelectionCount={1} />);
    expect(
      screen.getByRole("button", { name: "Byt 1 bricka" }),
    ).toBeInTheDocument();
  });

  it("uses the plural 'brickor', not 'brickan', for more than one tile", () => {
    render(<TurnActions {...baseProps} exchangeSelectionCount={3} />);
    expect(
      screen.getByRole("button", { name: "Byt 3 brickor" }),
    ).toBeInTheDocument();
  });

  it("uses the plural form for zero tiles selected", () => {
    render(<TurnActions {...baseProps} exchangeSelectionCount={0} />);
    expect(
      screen.getByRole("button", { name: "Byt 0 brickor" }),
    ).toBeInTheDocument();
  });
});
