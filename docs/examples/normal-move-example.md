# Normal Move Example

## 1. Purpose

This example shows the complete lifecycle of an ordinary dictionary-valid move.

It demonstrates how the UI, application layer, and game engine should cooperate without mixing responsibilities.

Use this example together with:

- `game-rules.md`
- `game-engine.md`
- `content-model.md`
- `dictionary.md`
- `ui-design.md`
- `local-multiplayer.md`

If this example conflicts with a specification file, the specification file takes precedence.

---

## 2. Scenario

Assume:

- August and Anna are playing locally on one device.
- It is August's turn.
- The board already contains committed tiles.
- August has the letters needed to form the Swedish word `BIL`.
- `BIL` is recognized by the configured Swedish dictionary.
- The placement is physically legal.
- Any crossing words created by the placement are also valid.
- No opponent approval is required.

Exact coordinates and score values below are illustrative unless they come from verified Swedish Alfapet configuration.

---

# 3. Starting state

Conceptually:

```text
Game status:
    ACTIVE

Current player:
    August

Turn state:
    PLAYER_TURN

Pending move:
    none

August score:
    74

Anna score:
    68
```

The local session has already completed the handoff to August, so August's rack is visible.

Anna's rack is hidden.

---

# 4. Rack

Assume August's rack contains:

```text
B  I  L  A  R  E  N
```

Internally these are physical tile IDs, for example:

```text
tile-21 → B
tile-22 → I
tile-23 → L
tile-24 → A
tile-25 → R
tile-26 → E
tile-27 → N
```

The UI displays letters and point values.

The engine operates on tile identities.

---

# 5. Selecting a tile

August selects the `B` tile.

This is primarily UI state:

```text
selectedTileId = tile-21
```

Selecting a tile does not modify authoritative game state by itself unless the chosen application architecture deliberately represents selection elsewhere.

The core game engine does not need to know which tile is merely highlighted.

---

# 6. Placing the first tile

August selects an empty board square.

The application sends an action conceptually similar to:

```json
{
  "type": "PLACE_TILE",
  "playerId": "player-1",
  "tileId": "tile-21",
  "coordinate": {
    "row": 8,
    "column": 6
  }
}
```

The engine/application state now records the tile as pending.

It is not committed to the board.

---

# 7. Placing the remaining tiles

August similarly places `I` and `L`.

The pending move becomes conceptually:

```json
{
  "playerId": "player-1",
  "status": "EDITING",
  "placedTiles": [
    {
      "tileId": "tile-21",
      "coordinate": {
        "row": 8,
        "column": 6
      }
    },
    {
      "tileId": "tile-22",
      "coordinate": {
        "row": 8,
        "column": 7
      }
    },
    {
      "tileId": "tile-23",
      "coordinate": {
        "row": 8,
        "column": 8
      }
    }
  ]
}
```

The visual board shows the three tiles.

They should look editable/pending rather than committed.

---

# 8. Editing before submission

Before selecting `Spela`, August may:

- Move `B`
- Move `I`
- Move `L`
- Return one or more tiles to the rack
- Replace a pending tile with another rack tile

The engine must not allow August to move previously committed tiles.

---

# 9. Submit

August selects:

```text
Spela
```

The application sends a submit action.

Conceptually:

```json
{
  "type": "SUBMIT_MOVE",
  "playerId": "player-1"
}
```

The UI does not tell the engine:

```text
"I played BIL and it is worth 8 points."
```

Instead, the engine derives the word and score from the board, pending tiles, and configuration.

---

# 10. Validation stage 1: action validity

The engine checks:

```text
Game is ACTIVE?
    yes

Correct player?
    yes

Pending move exists?
    yes

Pending tile IDs belong to August?
    yes
```

If any of these checks fail, the move is rejected with a structured error.

---

# 11. Validation stage 2: physical placement

The engine checks the placement according to `game-rules.md`.

For this example:

```text
All new tiles are in one line:
    yes

No illegal gaps:
    yes

Placement is connected correctly:
    yes

No board collision:
    yes

First-move rule:
    not applicable / already satisfied earlier
```

Result:

```text
physical placement = VALID
```

---

# 12. Validation stage 3: build resulting board

The engine conceptually overlays:

```text
Committed board
+
Pending tiles
```

to produce a temporary resulting board used for validation.

The committed board itself is not yet permanently changed.

---

# 13. Validation stage 4: identify formed words

The engine scans the resulting board and determines which words were newly formed by August's placement.

For example:

```text
Main word:
    BIL
```

There may also be crossing words.

Suppose there is one:

```text
Crossing word:
    IS
```

The exact board geometry is not important for this example.

The important rule is:

> Every newly formed word must be validated.

---

# 14. Dictionary validation

The engine sends normalized words to the word-validation system.

Conceptually:

```text
normalize("BIL")
    ↓
"BIL"
    ↓
dictionary lookup
    ↓
DICTIONARY_WORD
```

and:

```text
normalize("IS")
    ↓
"IS"
    ↓
dictionary lookup
    ↓
DICTIONARY_WORD
```

The result may look like:

```json
[
  {
    "word": "BIL",
    "normalizedWord": "BIL",
    "status": "DICTIONARY_WORD"
  },
  {
    "word": "IS",
    "normalizedWord": "IS",
    "status": "DICTIONARY_WORD"
  }
]
```

---

# 15. No approval required

Because all newly formed words are normally valid:

```text
requiresApproval = false
```

The move does not enter:

```text
REQUIRES_PLAYER_CONFIRMATION
```

or:

```text
WAITING_FOR_OPPONENT_APPROVAL
```

The opponent is not asked anything.

---

# 16. Score calculation

The scoring system calculates the move from:

- Newly placed tiles
- All newly formed words
- Tile values
- Newly activated board multipliers
- Blank-tile values if relevant
- Rack-size/all-tiles bonus if relevant

Conceptually:

```text
scoreMove(...)
    ↓
ScoreResult
```

For example only:

```json
{
  "wordScores": [
    {
      "word": "BIL",
      "total": 7
    },
    {
      "word": "IS",
      "total": 3
    }
  ],
  "allTilesBonus": 0,
  "total": 10
}
```

These numbers are illustrative.

Claude must calculate real scores from the verified Swedish configuration.

---

# 17. Score is still provisional during validation

Before commit:

```text
August score = 74
```

The calculated:

```text
+10
```

is not yet authoritative.

The engine should avoid mutating the score in the middle of validation.

Conceptually:

```text
Validate
    ↓
Calculate
    ↓
Commit complete move
```

---

# 18. Commit

Because the move is physically valid and all words are accepted normally, the engine commits it.

The commit operation should atomically:

1. Move pending tiles onto the committed board.
2. Remove those tiles from August's pending/rack ownership.
3. Apply the calculated score.
4. Draw replacement tiles.
5. Update the tile bag.
6. Add the move to history.
7. Clear the pending move.
8. Reset/update consecutive-pass tracking.
9. Check for game end.
10. If game continues, advance to Anna.

---

# 19. Board after commit

Before:

```text
Committed board
    does not contain tile-21, tile-22, tile-23
```

After:

```text
tile-21
tile-22
tile-23
```

are committed board tiles.

They are no longer editable by August or Anna.

The special squares beneath them remain part of the board definition, but their multipliers are not reactivated by future words merely passing through those existing tiles.

---

# 20. Score after commit

Using the illustrative score:

```text
August before:
    74

Move:
    +10

August after:
    84
```

The score changes only once.

A rerender or persistence reload must not cause the move to be scored again.

---

# 21. Drawing replacement tiles

August used three physical tiles.

If enough tiles remain in the bag, the engine draws three replacements.

For example:

```text
Before:
    A R E N

Draw:
    S T Ö

New rack:
    A R E N S T Ö
```

The actual draw depends on the authoritative tile-bag order/random source.

The UI never chooses the replacement letters.

---

# 22. Tile bag

Suppose:

```text
Before move:
    41 tiles remaining
```

After drawing three replacements:

```text
38 tiles remaining
```

The UI may display:

```text
38 brickor kvar
```

The UI should not display which letters remain in the bag.

---

# 23. History entry

The engine records structured history.

Conceptually:

```json
{
  "id": "event-014",
  "sequence": 14,
  "type": "WORD_MOVE_COMMITTED",
  "playerId": "player-1",
  "payload": {
    "words": ["BIL", "IS"],
    "score": 10,
    "usedUnknownWordApproval": false
  }
}
```

The UI may render:

```text
August: BIL +10
```

It may optionally expose crossing-word details in an expanded history view.

---

# 24. Accepted vocabulary

This normal move does not modify:

```text
acceptedVocabulary
```

No special opponent decision occurred.

---

# 25. Turn transition

After the commit:

```text
currentPlayerId = player-2
```

and:

```text
turnState = PLAYER_TURN(player-2)
```

Anna now owns the next normal turn.

However, Anna's rack must not immediately appear.

---

# 26. Persistence

The application receives the new authoritative state and saves it.

Conceptually:

```text
Engine returns committed GameState
      ↓
Application serializes
      ↓
localStorage updated
```

Persist the completed state before relying on the next UI interaction.

---

# 27. Local handoff

After persistence, the local UI enters:

```text
HANDOFF_TO_TURN
```

with:

```text
expectedViewerPlayerId = player-2
```

The screen shows:

```text
August är klar.

Lämna över enheten till Anna.

[ Fortsätt ]
```

Neither rack is shown.

---

# 28. Anna begins

Anna takes the device and selects:

```text
Fortsätt
```

The local UI enters:

```text
ACTIVE_TURN
```

for Player 2.

Now:

```text
Anna's rack = visible
August's rack = hidden
```

The board and scores remain public.

---

# 29. Resulting state summary

The game now conceptually has:

```text
August score:
    84

Anna score:
    68

Current player:
    Anna

Pending move:
    none

BIL tiles:
    committed

Accepted vocabulary:
    unchanged

History:
    contains August's move

Tile bag:
    reduced by replacement draw
```

This is a completed normal turn.

---

# 30. What the UI was responsible for

The UI/application layer handled:

- Tile selection presentation
- Board interaction
- Showing pending tiles
- `Spela` button
- Error/result presentation
- Persistence orchestration
- Handoff screen
- Rack privacy
- Revealing Anna's rack after `Fortsätt`

---

# 31. What the engine was responsible for

The engine handled:

- Turn ownership
- Tile ownership
- Placement validity
- Word detection
- Dictionary-validation integration
- Score calculation
- Multiplier application
- Move commit
- Replacement draw
- Tile-bag update
- Score update
- History
- Game-end check
- Advancing to Anna

---

# 32. What must not happen in the UI

Avoid code conceptually like:

```text
if word === "BIL":
    valid = true
```

or:

```text
score += tile.points
```

or:

```text
currentPlayer = Anna
```

inside arbitrary React handlers.

The UI requests actions.

The engine determines the resulting gameplay state.

---

# 33. Invalid variation

Suppose August places the same tiles diagonally.

The flow stops at physical validation:

```text
SUBMIT_MOVE
    ↓
INVALID_PLACEMENT
```

The UI might show:

```text
Alla nya brickor måste ligga på samma rad eller kolumn.
```

No dictionary lookup or scoring needs to determine whether the diagonal placement can be committed.

August remains in the same turn and can edit the tiles.

---

# 34. Unknown-word variation

Suppose the placement forms:

```text
BIX
```

and `BIX` is not in the dictionary but is not otherwise forbidden.

Then the normal flow stops before commit:

```text
physical validation
    ↓
word detection
    ↓
UNKNOWN_WORD
    ↓
REQUIRES_PLAYER_CONFIRMATION
```

That scenario belongs in `disputed-word-example.md`.

---

# 35. Forbidden-word variation

Suppose one formed word is a one-letter fragment (the sole remaining `FORBIDDEN_WORD` category
as of DEC-007 — see `dictionary.md` section 22).

Then:

```text
FORBIDDEN_WORD
```

The move cannot enter the opponent-approval flow.

The UI explains the problem and August continues editing.

A word classified as a proper name or non-standard abbreviation is not `FORBIDDEN_WORD`; it is
`UNKNOWN_WORD` and follows the unknown-word variation above instead (DEC-007).

---

# 36. Blank-tile variation

Suppose `I` is instead made using a blank.

The pending tile contains:

```text
isBlank = true
representedLetter = "I"
points = 0
```

Word detection sees:

```text
BIL
```

Dictionary validation sees:

```text
BIL
```

Scoring gives the blank zero base points.

Once committed, the blank remains `I` for the rest of the game.

---

# 37. All-tiles variation

If August uses every tile in the rack, the engine determines whether the configured all-tiles bonus applies.

The amount depends on selected rack size and `game-rules.md`.

The UI does not calculate the bonus independently.

---

# 38. End-game variation

If this move triggers a game-ending condition, the commit operation must also calculate final scoring.

Instead of advancing normally to Anna:

```text
game.status = FINISHED
```

and:

```text
game.result = ...
```

The application then shows the game-over flow rather than a normal handoff.

---

# 39. Tests derived from this example

At minimum, tests should verify:

```text
Valid pending placement
→ words correctly identified
```

```text
All words dictionary-valid
→ no opponent approval
```

```text
Score calculated once
→ applied only on commit
```

```text
Committed tiles leave pending state
→ enter board state
```

```text
Replacement tiles drawn
→ rack restored appropriately
```

```text
Tile bag reduced
```

```text
History event created
```

```text
Next player becomes authoritative current player
```

And at the application/UI level:

```text
Anna's rack is not visible before handoff continuation
```

---

# 40. Key implementation lesson

A normal move should follow one predictable pipeline:

```text
EDIT
  ↓
SUBMIT
  ↓
VALIDATE ACTION
  ↓
VALIDATE PLACEMENT
  ↓
DETECT WORDS
  ↓
VALIDATE WORDS
  ↓
CALCULATE SCORE
  ↓
COMMIT ATOMICALLY
  ↓
PERSIST
  ↓
HANDOFF
```

The custom disputed-word mechanic adds branches to this pipeline, but ordinary moves should remain simple.

---

# 41. Definition of success

This example has served its purpose if Claude can implement a normal move without ambiguity about:

- When tiles are pending versus committed
- Who detects formed words
- Who validates the dictionary
- When scoring occurs
- When score is actually applied
- Who draws replacement tiles
- When history is written
- When state is persisted
- When the next player becomes authoritative
- Why the next player's rack is still hidden until the local handoff is completed
