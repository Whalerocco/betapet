# Game Engine

## 1. Purpose

This document describes the design of the core game engine.

The game engine is the authoritative implementation of the game rules described in `game-rules.md`.

It must be usable without a browser or UI.

The engine receives game actions and produces valid game-state transitions.

Conceptually:

```text
GameState + GameAction → GameResult
```

The engine should be deterministic when supplied with deterministic randomness.

---

## 2. Responsibilities

The game engine is responsible for:

- Creating a new game
- Initializing the board
- Initializing and shuffling the tile bag
- Drawing tiles
- Managing player racks
- Managing scores
- Managing turns
- Validating tile placements
- Identifying all words created by a move
- Validating physical board rules
- Checking dictionary status
- Managing accepted non-dictionary words
- Managing proposed moves
- Handling opponent approval/rejection
- Calculating scores
- Applying bonuses
- Handling exchanges
- Handling passes
- Detecting game end
- Calculating final scores
- Producing structured game history

The engine must not:

- Render UI
- Access the DOM
- Read browser storage
- Make HTTP requests
- Send chat messages
- Authenticate users
- Decide how errors are visually presented

---

# 3. Core domain model

The exact TypeScript syntax may evolve, but the conceptual model should contain the following entities.

## 3.1 Game

A game contains:

```text
GameState
├── id
├── configuration
├── players
├── board
├── tileBag
├── currentPlayerId
├── turnState
├── pendingMove
├── acceptedVocabulary
├── moveHistory
├── consecutivePasses
├── status
└── result
```

Not every field needs to be present at every stage. Optional/null values should be used where appropriate.

---

## 3.2 Player

A player contains:

```text
Player
├── id
├── name
├── rack
└── score
```

The engine should not store UI state on the player.

For example, these do not belong in the engine's Player model:

- Is the player currently looking at the screen?
- Is a modal open?
- Is the rack currently animated?

---

## 3.3 Tile

A tile represents one physical tile.

Conceptually:

```text
Tile
├── id
├── baseLetter
├── points
├── isBlank
└── representedLetter?
```

For a normal tile:

```text
baseLetter = "A"
points = 1
isBlank = false
representedLetter = undefined
```

For a blank representing Ö:

```text
baseLetter = undefined
points = 0
isBlank = true
representedLetter = "Ö"
```

A blank's represented letter must become fixed once the tile is committed.

A tile's physical identity should remain stable throughout the game.

---

# 4. Board

The board is a fixed-size two-dimensional grid.

Conceptually:

```text
Board
├── width
├── height
└── cells
```

Each cell contains:

```text
BoardCell
├── coordinate
├── multiplier
└── tile?
```

The multiplier is permanent board data.

The tile is the current committed tile occupying that cell.

A future implementation may need a distinction between committed tiles and currently proposed tiles. See the pending-move section below.

---

# 5. Coordinates

Board coordinates should use a simple, deterministic representation.

For example:

```text
Coordinate
├── row
└── column
```

Rows and columns should have a clear zero-based or one-based internal convention.

The convention must be consistent throughout the engine.

UI-specific coordinate transformations should remain outside the core engine.

---

# 6. Multipliers

Board multipliers should be represented as data.

For example:

```text
Multiplier =
    NONE
    LETTER_X2
    LETTER_X3
    LETTER_X4
    LETTER_MINUS_X2
    WORD_X2
    WORD_X3
    WORD_X4
    START
```

The exact meaning of the multipliers is defined in `game-rules.md`.

A multiplier belongs to a board cell, not a tile.

The engine must determine whether a multiplier is active based on whether the tile occupying that cell is newly placed during the current committed move.

---

# 7. Tile bag

The tile bag is an ordered collection of physical tiles.

Conceptually:

```text
TileBag
├── tiles
└── randomSource
```

The random source should be abstracted.

This allows tests to use deterministic randomness.

For example, tests may provide a predetermined tile order rather than depending on unpredictable random numbers.

The tile bag must never create new tiles during normal play. It only contains the finite set defined by the configured tile distribution.

---

# 8. Game configuration

The engine should receive a game configuration.

Conceptually:

```text
GameConfiguration
├── language
├── board
├── tileSet
├── dictionary
├── wordRules
└── scoringRules
```

For the initial game:

```text
language = Swedish
game rules = Swedish Alfapet
```

This design is intended to make future languages possible without rewriting the engine.

---

# 9. Dictionary interface

The engine should not depend directly on a particular dictionary file format.

Use an abstraction similar to:

```text
Dictionary
    isWord(word): boolean
```

The dictionary implementation can later use:

- A local word list
- A generated lookup structure
- A database
- Another optimized representation

The engine only needs the defined interface.

---

# 10. Word representation

A word should be represented as a sequence of letters associated with board coordinates.

Conceptually:

```text
FormedWord
├── letters
├── tiles
├── coordinates
├── orientation
└── score?
```

The engine should be able to identify both:

- The main word created by the player's placement
- Any perpendicular/crossing words created by that placement

The UI should not provide the word strings to the engine as an authoritative input.

The engine should derive them from the board.

---

# 11. Move representation

A player's intended move should be represented explicitly.

Conceptually:

```text
Move
├── playerId
├── placedTiles
├── formedWords
└── score
```

A placed tile should contain:

```text
PlacedTile
├── tileId
├── coordinate
└── representedLetter?
```

The engine should verify that the tile IDs belong to the current player's rack.

---

# 12. Pending move

A pending move represents the current player's uncommitted placement.

Conceptually:

```text
PendingMove
├── playerId
├── placedTiles
├── formedWords
├── dictionaryResults
├── score
└── approvalStatus
```

Possible approval states include:

```text
NOT_REQUIRED
REQUIRES_PLAYER_CONFIRMATION
WAITING_FOR_OPPONENT
ACCEPTED
REJECTED
```

A pending move exists only until it is either:

- Committed
- Cancelled
- Replaced by another pending placement

---

# 13. Proposed tiles and committed tiles

The engine must distinguish between:

### Committed board state

Tiles that are permanently part of the game board.

### Pending placement

Tiles currently placed by the active player but not yet committed.

Conceptually:

```text
Committed board
+
Pending placement
=
Current visual board
```

However, the underlying authoritative committed board should not be permanently modified until the move is accepted.

This is particularly important when an opponent rejects a proposed unknown word.

---

# 14. Move validation

Move validation should be divided into separate stages.

## Stage 1: Validate action

Check:

- Is it the correct player's turn?
- Is the game still active?
- Are the referenced tiles valid?
- Are the referenced tiles in the player's rack?

## Stage 2: Validate placement

Check:

- Is the placement within the board?
- Are tiles placed horizontally or vertically?
- Are tiles in a single line?
- Are there illegal gaps?
- Does the move connect to existing tiles when required?
- Does the first move cover the centre?
- Does the placement interact correctly with existing tiles?

## Stage 3: Determine formed words

Build the resulting board conceptually and identify all newly formed words.

## Stage 4: Validate words

For every newly formed word:

- Check minimum length.
- Check language/game word rules.
- Check accepted vocabulary.
- Check dictionary.

## Stage 5: Calculate score

Calculate the score without mutating the game state.

## Stage 6: Determine required approval

If all words are normally accepted:

```text
approvalStatus = NOT_REQUIRED
```

If one or more words are unknown but otherwise eligible for the custom mechanism:

```text
approvalStatus = REQUIRES_PLAYER_CONFIRMATION
```

---

# 15. Physical validity versus word validity

These must be separate concepts.

A move can be:

```text
Physically invalid
```

or:

```text
Physically valid + dictionary-valid
```

or:

```text
Physically valid + contains unknown word(s)
```

Opponent approval only applies to the third case.

It must never be possible to use opponent approval to rescue a physically invalid placement.

---

# 16. Dictionary validation result

The engine should return structured information about each formed word.

Conceptually:

```text
WordValidationResult
├── word
├── normalizedWord
├── status
└── reason?
```

Possible statuses include:

```text
DICTIONARY_WORD
ACCEPTED_IN_GAME
UNKNOWN_WORD
FORBIDDEN_WORD
```

The exact classification may be refined together with `dictionary.md`.

The distinction between `UNKNOWN_WORD` and `FORBIDDEN_WORD` is important.

An unknown word may enter the opponent-approval flow.

A word explicitly forbidden by the game's rules may not.

For example, a physically valid placement of a prohibited one-letter word should not become legal just because an opponent accepts it.

---

# 17. Player confirmation

When unknown words are detected, the engine should not automatically send the game to the opponent.

There is an explicit player-confirmation step.

Conceptually:

```text
submitMove
    ↓
unknown words detected
    ↓
REQUIRES_PLAYER_CONFIRMATION
```

The UI then asks the player whether they want to propose the move anyway.

If the player declines:

```text
cancelProposal
    ↓
player continues editing the move
```

If the player accepts:

```text
confirmProposal
    ↓
WAITING_FOR_OPPONENT
```

The engine remains responsible for ensuring that only the correct action is possible in each state.

---

# 18. Opponent approval

Once a player confirms a move containing unknown words:

```text
turnState = WAITING_FOR_OPPONENT
```

The opponent may perform exactly one of two relevant actions:

```text
acceptProposedMove
rejectProposedMove
```

### Accept

The engine:

1. Commits the pending tiles.
2. Applies blank-tile representation.
3. Calculates/applies score.
4. Adds newly accepted unknown words to the game's accepted vocabulary.
5. Draws replacement tiles.
6. Records the move.
7. Advances the turn.
8. Checks for game end.

### Reject

The engine:

1. Does not commit the proposed move as a completed move.
2. Does not award its score.
3. Does not draw replacement tiles.
4. Returns control to the original player.
5. Keeps the pending placement available for editing.

The pending placement remains associated with the original player.

---

# 19. Editing a rejected proposal

After rejection, the original player may:

- Remove proposed tiles.
- Move proposed tiles.
- Change blank-tile representation if the blank has not yet been committed.
- Submit a different move.
- Cancel the pending placement.
- Perform another legal turn action.

The player may not modify committed tiles.

The engine must distinguish tile IDs so that only tiles belonging to the current pending placement are editable.

---

# 20. Accepted vocabulary

The game state contains:

```text
acceptedVocabulary: Set<string>
```

When an unknown word is accepted:

```text
acceptedVocabulary.add(normalizedWord)
```

Future word validation treats the word as valid.

Example:

```text
Dictionary:
    GRÖMP → false

Game:
    acceptedVocabulary = {}

Player proposes GRÖMP
Opponent accepts

Game:
    acceptedVocabulary = {"GRÖMP"}
```

A later move containing GRÖMP is then normally accepted.

The accepted vocabulary is reset when a new game starts.

---

# 21. Scoring

Scoring should be a pure calculation.

Conceptually:

```text
scoreMove(
    board,
    placedTiles,
    formedWords,
    configuration
) → ScoreResult
```

The score result may contain:

```text
ScoreResult
├── wordScores
├── wordMultiplierEffects
├── letterMultiplierEffects
├── allTilesBonus
└── total
```

The scoring system must use the exact values defined by the configured Swedish Alfapet tile set and board.

The engine must never apply scoring twice.

A proposed move may have a calculated score before approval, but that score is only applied after the move is committed.

---

# 22. Blank scoring

Blank tiles always contribute zero points.

Their represented letter is nevertheless used for:

- Word formation
- Dictionary validation
- Accepted-vocabulary lookup
- Scoring multipliers as appropriate to the Alfapet rules

The engine must keep the physical tile identity and represented letter separate.

---

# 23. Commit operation

Committing a move is a distinct operation.

Conceptually:

```text
commitMove(gameState, pendingMove)
```

It should:

1. Move pending tiles into the committed board.
2. Remove the corresponding physical tiles from the player's rack.
3. Apply score.
4. Apply accepted-vocabulary changes.
5. Draw replacement tiles.
6. Add a completed move to history.
7. Clear the pending move.
8. Reset/update pass tracking.
9. Determine whether the game has ended.
10. Otherwise set the next player.

All of these operations should produce one coherent new game state.

A partially committed move must not be observable as a valid completed state.

---

# 24. Tile drawing

Tile drawing should be handled by the engine.

A player should never be able to request an arbitrary tile.

The engine draws from the configured tile bag.

If fewer tiles remain than needed to refill a rack, the player receives only the remaining tiles.

The tile bag state must be updated atomically with the game state.

---

# 25. Passing

A pass action should:

1. Verify that the correct player is acting.
2. Verify that there is no pending uncommitted move.
3. Update consecutive-pass tracking.
4. Record the pass.
5. Advance to the next player.
6. Check whether the end-game condition has been reached.

The engine should not permit a player to pass while an unresolved proposed move is awaiting their action.

---

# 26. Tile exchange

An exchange action should:

1. Verify that it is the player's turn.
2. Verify that there is no unresolved pending placement.
3. Verify the selected tiles belong to the player's rack.
4. Verify that exchange rules permit the exchange.
5. Remove the selected tiles from the rack.
6. Return them to the tile bag according to the configured rules.
7. Draw replacement tiles.
8. Record the exchange.
9. Advance to the next player.
10. Update end-game/pass state as appropriate.

The exact minimum tile-bag conditions must follow `game-rules.md`.

---

# 27. Turn management

The engine should have one authoritative current player.

Conceptually:

```text
currentPlayerId
```

Only that player may perform normal turn actions.

During opponent approval:

```text
currentPlayerId
```

may remain the original player while:

```text
turnState = WAITING_FOR_OPPONENT
```

The engine must additionally identify the player responsible for the approval action.

This avoids confusing "whose turn it is" with "who must respond to a pending proposal."

---

# 28. Game status

The game should have an explicit overall status.

For example:

```text
SETUP
ACTIVE
FINISHED
```

A finished game must reject further gameplay actions.

The completed game state should contain enough information to display:

- Final scores
- Winner
- Remaining tiles
- Final move history

---

# 29. End-game calculation

When an end-game condition is reached, the engine should:

1. Prevent further normal moves.
2. Calculate deductions for remaining rack tiles.
3. Apply any final bonuses/adjustments required by the Alfapet rules.
4. Calculate final scores.
5. Determine the winner.
6. Set the game status to `FINISHED`.
7. Record the final result.

The end-game implementation must follow `game-rules.md`.

---

# 30. Game history

The engine should record completed actions in structured form.

Possible action types include:

```text
WORD_MOVE
UNKNOWN_WORD_PROPOSAL
UNKNOWN_WORD_ACCEPTED
UNKNOWN_WORD_REJECTED
PASS
EXCHANGE
GAME_STARTED
GAME_FINISHED
```

A rejected proposal should not appear as an ordinary completed word move.

It should be represented as an event associated with the attempted move.

This allows the future UI to show a useful game history without reconstructing events from arbitrary state changes.

---

# 31. Errors

The engine should return structured errors rather than UI strings.

Conceptually:

```text
GameError
├── code
├── messageKey
└── details?
```

Examples:

```text
NOT_YOUR_TURN
GAME_NOT_ACTIVE
INVALID_TILE
TILE_NOT_IN_RACK
INVALID_PLACEMENT
MOVE_NOT_CONNECTED
FIRST_MOVE_MUST_COVER_CENTER
INVALID_WORD
FORBIDDEN_WORD
PROPOSAL_NOT_AVAILABLE
PROPOSAL_ALREADY_CONFIRMED
NOT_AUTHORIZED_TO_APPROVE
EXCHANGE_NOT_ALLOWED
INVALID_GAME_STATE
```

`messageKey` allows the UI to provide Swedish text without putting Swedish UI strings inside the engine.

---

# 32. Selectors / derived information

The engine or application layer may provide functions that derive information from game state.

Examples:

```text
getCurrentPlayer()
getPlayerRack()
getLegalActions()
getPendingMove()
getFormedWords()
getRemainingTileCount()
getWinner()
```

Derived information should preferably be calculated rather than duplicated in state.

For example, do not store:

```text
remainingTileCount
```

if it can safely be calculated from the tile bag.

However, performance-sensitive derived data may be cached later if there is a demonstrated need.

---

# 33. Deterministic testing

The engine must support deterministic tests.

Tests should be able to provide:

- A known board
- Known player racks
- Known tile bag
- Known scores
- Known dictionary
- Known random source

This makes tests such as the following possible:

```text
Given:
    Player 1 has S K O G
    Board is empty
    SKOG exists in dictionary

When:
    Player 1 plays SKOG

Then:
    Move is committed
    Correct score is awarded
    Player 2 becomes current player
```

And:

```text
Given:
    GRÖMP is not in dictionary

When:
    Player 1 proposes GRÖMP
    Player 2 rejects it

Then:
    Player 1 remains responsible for the pending move
    No score is awarded
    No tiles are drawn
    Proposed tiles remain editable
```

---

# 34. Property-based and edge-case testing

The engine should eventually include tests for unusual board states and combinations.

Examples:

- A move creates several crossing words.
- A blank creates a high-value letter.
- A blank sits on a letter multiplier.
- Multiple word multipliers are activated in one move.
- An accepted unknown word later forms a crossing word.
- An accepted unknown word is played again.
- A rejected move contains multiple unknown words.
- A rejected move is modified into a fully dictionary-valid move.
- A player empties their rack while the bag is empty.
- The game ends immediately after a move.
- A player passes repeatedly.
- The tile bag contains fewer tiles than needed to refill a rack.

These tests should be added as the corresponding functionality is implemented.

---

# 35. Engine API philosophy

The exact public API should remain small.

Prefer a small set of meaningful operations over exposing internal structures.

Conceptually:

```text
createGame()
getGameState()
dispatch(action)
```

or an equivalent design.

The UI/application layer should not be able to arbitrarily mutate:

```text
game.board
game.scores
game.tileBag
game.currentPlayer
```

All meaningful changes should pass through the engine's rules.

This becomes particularly important when the same engine is later executed on a trusted online server.

---

# 36. Online multiplayer compatibility

The engine should eventually support:

```text
GameState
    +
validated action
    ↓
new GameState
```

This makes it possible for an online server to:

1. Receive an action from a client.
2. Validate it using the game engine.
3. Produce the new state.
4. Persist it.
5. Send appropriate views/events to the players.

The client should never be authoritative over:

- Tile distribution
- Tile bag
- Scores
- Dictionary validity
- Move validity
- Accepted vocabulary
- Turn ownership
- Game completion

---

# 37. Important implementation principle

Do not implement the game engine as a collection of UI event handlers.

Avoid architecture like:

```text
onClickTile()
    → change React state
    → calculate score
    → modify board
    → check dictionary
    → show modal
```

Instead use:

```text
UI event
    ↓
Game action
    ↓
Game engine
    ↓
Validated state transition
    ↓
UI renders resulting state
```

This distinction should remain clear throughout development.

---

# 38. Relationship to other specifications

This document defines the conceptual game-engine model.

Use:

- `game-rules.md` for what the game should do.
- `dictionary.md` for word validity and dictionary policy.
- `architecture.md` for system boundaries.
- `tech-stack.md` for implementation technology.
- `ui-design.md` for how game state is presented.
- `tasks.md` for implementation work.

If an implementation detail conflicts with the game rules, the game rules take precedence.

If a future change deliberately changes a game rule, update `game-rules.md` before changing the engine.

---

# 39. Definition of done for the engine

The engine foundation is considered successful when it can run a complete game without any UI-specific logic.

At minimum it must support:

- Game creation
- Player setup
- Tile distribution
- Tile drawing
- Rack management
- Board placement
- Word detection
- Physical move validation
- Swedish dictionary validation
- Unknown-word proposals
- Player confirmation
- Opponent acceptance
- Opponent rejection
- Editing rejected proposals
- Accepted vocabulary
- Blank tiles
- Scoring
- Multipliers
- All-tiles bonus
- Passing
- Tile exchange
- End-game detection
- Final scoring
- Game history

All important rules should have automated tests.

The engine should be usable as a standalone TypeScript module before the web UI is considered complete.
