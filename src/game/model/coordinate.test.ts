import { describe, expect, it } from "vitest";
import { coordinateKey, parseCoordinateKey } from "./coordinate";

describe("coordinateKey / parseCoordinateKey", () => {
  it("round-trips a coordinate through its key", () => {
    const coordinate = { row: 7, column: 12 };
    expect(parseCoordinateKey(coordinateKey(coordinate))).toEqual(coordinate);
  });

  it("parses a literal key string", () => {
    expect(parseCoordinateKey("3,9")).toEqual({ row: 3, column: 9 });
  });

  it("parses coordinate 0,0", () => {
    expect(parseCoordinateKey("0,0")).toEqual({ row: 0, column: 0 });
  });
});
