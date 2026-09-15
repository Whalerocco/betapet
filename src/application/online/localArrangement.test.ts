import { describe, expect, it } from "vitest";

import { placeTile } from "../../game/engine/placeTile";
import { SWEDISH_ALPHABET } from "../../game/configuration/swedishAlphabet";
import { placeCommittedTile } from "../../game/model/board";
import type { Coordinate } from "../../game/model/coordinate";
import { coordinateKey } from "../../game/model/coordinate";
import type { GameState } from "../../game/model/game";
import type { TileId } from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { toPlayerGameView } from "../../game/view/playerGameView";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import { localArrangement } from "./localArrangement";

const CENTRE: Coordinate = { row: 7, column: 7 };
const BESIDE: Coordinate = { row: 7, column: 8 };

/** A Replace-mode game with one committed tile on the centre square for August to replace. */
function replaceGame() {
  const game = buildEngineTestGame({
    playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
    modifiers: new Set(["REPLACE" as const]),
  });
  const [committedTileId, ...bag] = game.state.tileBag.tileIds;
  const state: GameState = {
    ...game.state,
    tileBag: { tileIds: bag },
    board: placeCommittedTile(game.state.board, CENTRE, committedTileId!),
  };
  return { ...game, state, committedTileId: committedTileId! };
}

/** What the screen would build from a view of `state`, given what this client has arranged. */
function arrangementFrom(
  state: GameState,
  playerId: string,
  placements: readonly PendingPlacedTile[],
) {
  const view = toPlayerGameView(state, playerId as never);
  return localArrangement({
    board: view.board,
    ownRackTileIds: view.ownRack.tileIds,
    serverPending:
      view.pendingMove && view.pendingMove.playerId === playerId
        ? view.pendingMove.placedTiles
        : [],
    placements,
    tiles: view.tiles,
  });
}

function occupiedKeys(cells: { coordinate: Coordinate; tileId: TileId }[]) {
  return new Map(
    cells.map((cell) => [coordinateKey(cell.coordinate), cell.tileId]),
  );
}

describe("localArrangement", () => {
  it("leaves an ordinary placement's board and hand alone", () => {
    const { state, playerOneId } = replaceGame();
    const [tileId] = state.players[0].rack.tileIds;

    const arrangement = arrangementFrom(state, playerOneId, [
      { tileId: tileId!, coordinate: BESIDE },
    ]);

    expect(arrangement.board).toEqual(state.board);
    expect(arrangement.displacedTileIds.size).toBe(0);
    expect(arrangement.placements[0]!.replacedTileId).toBeUndefined();
    expect(arrangement.heldTileIds).toEqual(state.players[0].rack.tileIds);
  });

  /*
   * The point of the whole module: what this client models must be what the engine will do with
   * the same placement (`known-bugs.md` item 20). Compared against `placeTile` itself rather
   * than against a hand-written expectation, so the two cannot drift apart silently.
   */
  it("models a replace exactly as the engine does", () => {
    const { state, board, playerOneId, committedTileId } = replaceGame();
    const replacingTileId = state.players[0].rack.tileIds.find(
      (tileId) => tileId !== committedTileId,
    )!;

    const arrangement = arrangementFrom(state, playerOneId, [
      { tileId: replacingTileId, coordinate: CENTRE },
    ]);

    const engine = placeTile(
      state,
      board,
      SWEDISH_ALPHABET,
      { playerId: playerOneId, tileId: replacingTileId, coordinate: CENTRE },
      { allowReplace: true },
    );
    expect(engine.success).toBe(true);
    if (!engine.success) return;

    // The same board: the displaced tile off it, the replacing tile not on it (it is pending).
    expect(occupiedKeys([...arrangement.board.occupiedCells])).toEqual(
      occupiedKeys([...engine.state.board.occupiedCells]),
    );
    // The same hand, including the displaced tile the engine moved into the rack.
    const engineRack = engine.state.players[0].rack.tileIds;
    const held = arrangement.heldTileIds.filter(
      (tileId) => tileId !== replacingTileId,
    );
    expect([...held].sort()).toEqual([...engineRack].sort());
    // And the same record of what was displaced, which is what scoring keys off (DEC-016).
    expect(arrangement.placements[0]!.replacedTileId).toBe(committedTileId);
    expect([...arrangement.displacedTileIds]).toEqual([committedTileId]);
  });

  it("puts the committed tile back when the placement is taken away again", () => {
    const { state, playerOneId, committedTileId } = replaceGame();
    const replacingTileId = state.players[0].rack.tileIds[0]!;

    const placed = arrangementFrom(state, playerOneId, [
      { tileId: replacingTileId, coordinate: CENTRE },
    ]);
    expect(placed.board.occupiedCells).toHaveLength(0);

    const takenBack = arrangementFrom(state, playerOneId, []);

    expect(takenBack.board).toEqual(state.board);
    expect(takenBack.displacedTileIds.size).toBe(0);
    expect(takenBack.heldTileIds).not.toContain(committedTileId);
  });

  /*
   * The server holds a pending move of this player's after `Ändra` on an unknown word, or after
   * the opponent rejected one. Its displacements are already applied to the board it sent, so the
   * arrangement has to undo them before applying the local placements — otherwise taking the
   * replacement back would leave the square empty rather than restoring the tile that was there.
   */
  describe("when the server is already holding the move", () => {
    function withServerHeldReplace() {
      const { state, board, playerOneId, committedTileId } = replaceGame();
      const replacingTileId = state.players[0].rack.tileIds[0]!;
      const result = placeTile(
        state,
        board,
        SWEDISH_ALPHABET,
        { playerId: playerOneId, tileId: replacingTileId, coordinate: CENTRE },
        { allowReplace: true },
      );
      if (!result.success) throw new Error("fixture placement failed");
      return {
        state: result.state,
        playerOneId,
        committedTileId,
        replacingTileId,
        serverPlacements: result.state.pendingMove!.placedTiles,
      };
    }

    it("shows the same board and hand the server does, while nothing has changed locally", () => {
      const { state, playerOneId, committedTileId, serverPlacements } =
        withServerHeldReplace();

      const arrangement = arrangementFrom(state, playerOneId, serverPlacements);

      expect(arrangement.board).toEqual(state.board);
      expect([...arrangement.displacedTileIds]).toEqual([committedTileId]);
      expect(arrangement.heldTileIds).toContain(committedTileId);
    });

    it("restores the committed tile when the replacement is taken back locally", () => {
      const { state, playerOneId, committedTileId } = withServerHeldReplace();

      const arrangement = arrangementFrom(state, playerOneId, []);

      expect(occupiedKeys([...arrangement.board.occupiedCells])).toEqual(
        new Map([[coordinateKey(CENTRE), committedTileId]]),
      );
      expect(arrangement.displacedTileIds.size).toBe(0);
      // Back on the board, so no longer in the hand — even though the server's rack still has it.
      expect(arrangement.heldTileIds).not.toContain(committedTileId);
    });
  });

  it("gives the displacement to whichever tile ends up on the square (DEC-017)", () => {
    const { state, playerOneId, committedTileId } = replaceGame();
    const [first, second] = state.players[0].rack.tileIds;

    /*
     * A swap reaches this module as one placement, not two: the screen replaces whatever was on
     * the square before calling it. So the tile now standing there is the one carrying the
     * displacement, whichever of them it is — nothing has to remember an earlier placement.
     */
    const firstThere = arrangementFrom(state, playerOneId, [
      { tileId: first!, coordinate: CENTRE },
    ]);
    const swapped = arrangementFrom(state, playerOneId, [
      { tileId: second!, coordinate: CENTRE },
    ]);

    expect(firstThere.placements[0]!.replacedTileId).toBe(committedTileId);
    expect(swapped.placements[0]!.replacedTileId).toBe(committedTileId);
    expect(swapped.board.occupiedCells).toHaveLength(0);
    // The swapped-out tile is held again simply by not being placed any more.
    expect(swapped.heldTileIds).toContain(first);
  });
});
