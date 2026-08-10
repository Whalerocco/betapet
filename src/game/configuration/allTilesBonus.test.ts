import { describe, expect, it } from "vitest";
import { getAllTilesBonus } from "./allTilesBonus";

describe("getAllTilesBonus", () => {
  it("awards 40 points for a six-tile rack", () => {
    expect(getAllTilesBonus(6)).toBe(40);
  });

  it("awards 50 points for a seven-tile rack", () => {
    expect(getAllTilesBonus(7)).toBe(50);
  });

  it("awards 60 points for an eight-tile rack", () => {
    expect(getAllTilesBonus(8)).toBe(60);
  });
});
