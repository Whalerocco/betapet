crisscross mode:
1. ~~you can play the tiles anywhere if it's connected to another word. According to the rules the tiles you play need to be connected to each other~~ Fixed 2026-08-20: the connectivity check treated the whole existing board as a bridge between unrelated new-tile groups; rewrote it so newly placed tiles must form lines that directly share a cell with each other (see `isCrisscrossConnected` in `src/game/rules/physicalValidation.ts`).

Replace mode:
1. ~~If you have placed a tile you cannot change it's position if the new position would replace another tile.~~ Fixed 2026-08-20: `movePendingTile` only supported moving a pending tile onto an empty cell; it now supports the same replace-and-displace logic `placeTile` already had (including the replace-chaining check), and the UI now passes `allowReplace` through for MOVE_TILE too (see `src/game/engine/movePendingTile.ts`).

In general:
1. ~~It's not possible to drag the blank tile. It should be possible to drag it.~~ Fixed 2026-08-20: dragging a blank tile from the rack now opens the letter picker on drop instead of being blocked outright, matching the tap flow (see `handleRackTilePointerDown`/`handleTileDrop` in `src/components/game/GameScreen.tsx`).