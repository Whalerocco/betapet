import { describe, expect, it } from "vitest";
import {
  createSwedishGameConfiguration,
  SWEDISH_CONFIGURATION_ID,
} from "./swedishConfiguration";

describe("createSwedishGameConfiguration", () => {
  it("uses the Swedish language code", () => {
    const configuration = createSwedishGameConfiguration(7);
    expect(configuration.language).toBe("sv");
  });

  it("carries a stable configuration id", () => {
    const configuration = createSwedishGameConfiguration(7);
    expect(configuration.id).toBe(SWEDISH_CONFIGURATION_ID);
  });

  it("uses the 15x15 board definition", () => {
    const configuration = createSwedishGameConfiguration(6);
    expect(configuration.boardDefinition.width).toBe(15);
    expect(configuration.boardDefinition.height).toBe(15);
  });

  it("honours the requested rack size", () => {
    expect(createSwedishGameConfiguration(6).rackSize).toBe(6);
    expect(createSwedishGameConfiguration(8).rackSize).toBe(8);
  });

  it("defaults to no modifiers", () => {
    expect(createSwedishGameConfiguration(7).modifiers).toEqual(new Set());
  });

  it("carries through a requested modifier selection", () => {
    const configuration = createSwedishGameConfiguration(
      7,
      new Set(["ILLEGAL"]),
    );
    expect(configuration.modifiers).toEqual(new Set(["ILLEGAL"]));
  });
});
