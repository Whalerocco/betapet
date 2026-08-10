# Architecture

## 1. Purpose

This document defines the software architecture of the game.

The architecture should support the immediate goal of a complete local hot-seat game while leaving a clean path toward online multiplayer.

The central architectural principle is:

> The game engine must be independent of the user interface and the transport/storage layer.

The same game engine should eventually be usable by:

- The local web game
- An online multiplayer server
- Automated tests
- Potential future clients

---

## 2. High-level architecture

The application should be divided into distinct layers.

```text
┌──────────────────────────────────────────────┐
│                 Web Application              │
│                                              │
│  React UI                                    │
│  Screens / components / interaction          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             Application Layer               │
│                                              │
│  Game controller                             │
│  User interaction flow                       │
│  Local persistence                           │
│  UI-facing state                             │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 Game Engine                  │
│                                              │
│  Game state                                  │
│  Board                                       │
│  Tiles                                       │
│  Move validation                             │
│  Word detection                              │
│  Dictionary validation                       │
│  Scoring                                     │
│  Turn management                             │
│  Proposed moves                              │
│  Accepted vocabulary                         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                Game Configuration            │
│                                              │
│  Swedish board                               │
│  Swedish tiles                               │
│  Swedish scores                              │
│  Dictionary                                  │
│  Language-specific rules                     │
└──────────────────────────────────────────────┘
```

The game engine must not depend on the layers above it.

---

## 3. Game engine as the core

The game engine is the most important part of the application.

It should contain the complete implementation of game rules and should be possible to execute without a browser.

The engine should be responsible for:

- Creating games
- Managing players
- Managing the board
- Managing the tile bag
- Managing player racks
- Validating placements
- Identifying newly formed words
- Checking dictionary status
- Managing proposed non-dictionary moves
- Managing opponent approval
- Maintaining accepted vocabulary
- Calculating scores
- Applying bonuses
- Handling passing
- Handling tile exchange
- Detecting game end
- Calculating final scores
- Producing the next game state

The engine should not be responsible for:

- Rendering HTML
- Showing dialogs
- Animations
- Playing sounds
- Managing browser navigation
- Authentication
- Chat
- Database queries
- Sending network requests

---

## 4. State and actions

The game should be modelled as explicit state transformed by explicit actions.

Conceptually:

```text
GameState + Action → GameState
```

For example:

```text
GameState
    +
PlaceTile
    ↓
New GameState
```

or:

```text
GameState
    +
SubmitMove
    ↓
GameState requiring opponent approval
```

The exact implementation can use classes, functions, reducers, or another suitable TypeScript design, but the conceptual model should remain explicit.

Game actions should include operations such as:

- `startGame`
- `placeTile`
- `removeTile`
- `movePlacedTile`
- `submitMove`
- `cancelProposal`
- `acceptProposedMove`
- `rejectProposedMove`
- `pass`
- `exchangeTiles`
- `finishGame`

Names may be refined during implementation.

The important principle is that UI events should become explicit game actions rather than directly modifying game state.

---

## 5. Immutable or controlled state transitions

Game rules should preferably be implemented using pure functions and controlled state transitions.

A function that validates a move should not secretly modify the board.

A function that calculates a score should not change the player's score.

A function that checks a dictionary should not alter game state.

State mutation, if used internally for performance or implementation convenience, must remain controlled and must not leak into unrelated application layers.

The desired mental model is:

```text
Input state
    ↓
Validate action
    ↓
Calculate result
    ↓
Produce new state
```

This makes the engine easier to test and eventually makes server-authoritative multiplayer much easier.

---

## 6. Game state

The game state should contain all information necessary to reconstruct the current game.

At a conceptual level:

```text
GameState
├── gameId
├── rules/configuration
├── players
├── board
├── tileBag
├── currentPlayer
├── turnState
├── scores
├── pendingMove
├── acceptedVocabulary
├── moveHistory
└── gameStatus
```

The exact TypeScript representation belongs in `game-engine.md` and the implementation.

The state should not contain UI-only information such as:

- Whether a modal is currently animated
- Which CSS class is applied
- Which screen is visible
- Mouse coordinates
- Drag-and-drop animation state

UI state should remain outside the game state.

---

## 7. Board representation

The board should be represented as a two-dimensional grid.

Each board cell should be able to represent:

- Its coordinates
- Its permanent scoring-square type
- Whether a tile is currently occupying it
- The tile occupying it, if any

Conceptually:

```text
Board
├── width
├── height
└── cells[x][y]
```

The special square is a property of the board cell, not of the tile.

A tile placed on a multiplier square does not permanently become a multiplied tile. The scoring calculation determines whether the square is being covered for the first time.

This distinction is important for later moves.

---

## 8. Tile representation

A tile should contain enough information to distinguish:

- Its physical identity
- Its represented letter
- Its point value
- Whether it is a blank

A blank tile needs special treatment.

For example, a blank may conceptually have:

```text
isBlank: true
representedLetter: "Ö"
points: 0
```

The represented letter is chosen when the blank is placed.

Once the blank is committed, its represented letter cannot change.

The physical tile identity should remain distinguishable so that the game can correctly manage the tile bag and player racks.

---

## 9. Tile bag

The tile bag contains physical tile instances rather than just counts.

This allows:

- Random drawing
- Exact remaining-tile tracking
- Deterministic tests with a supplied random generator/seed
- Future game replay
- Debugging

The initial implementation should use a controlled randomization mechanism rather than making randomness impossible to reproduce in tests.

The game engine should not depend on `Math.random()` being called directly throughout the code.

A random-number abstraction should be used where appropriate.

---

## 10. Player representation

A player should contain game-related information such as:

- Player ID
- Display name
- Rack
- Score
- Relevant turn information

A player's private information should not be unnecessarily exposed to the other player by the UI.

In the local game, both players' information technically exists in the same browser state, but the interface must enforce the hot-seat privacy model.

In a future online game, private information must also be protected at the server/API level rather than relying only on UI hiding.

---

## 11. Proposed moves

A proposed move is a first-class concept.

This is necessary because the game has a state in which:

- A player has placed tiles.
- Those tiles are not yet committed.
- The move may contain one or more non-dictionary words.
- The opponent must approve or reject it.

Conceptually:

```text
pendingMove
├── playerId
├── placedTiles
├── formedWords
├── dictionaryResults
├── score
└── status
```

A pending move should contain enough information to reconstruct what the player proposed.

The authoritative board state should distinguish between:

```text
Committed tiles
```

and:

```text
Tiles belonging to the current uncommitted proposal
```

This distinction is particularly important after rejection.

---

## 12. Rejected moves

When a proposed move is rejected:

```text
Opponent rejects
        ↓
Pending move remains editable
        ↓
Original player gets control
        ↓
Player modifies/removes proposed tiles
        ↓
Player submits again
```

The engine must ensure that the player cannot modify tiles that were committed before the current proposal.

A rejected proposal is not the same thing as undoing an earlier completed turn.

It is an uncommitted turn being returned to its owner.

---

## 13. Accepted vocabulary

Each game has its own accepted vocabulary.

Conceptually:

```text
acceptedVocabulary: Set<string>
```

This contains words that were not present in the normal dictionary but were accepted by the opponent during this particular game.

Dictionary validation should therefore effectively be:

```text
word is valid if:

    word exists in dictionary
        OR
    word exists in acceptedVocabulary
```

However, the engine must still enforce all non-dictionary word restrictions that cannot be overridden by opponent approval.

For example, a physically illegal move must never become legal merely because the opponent accepts a word.

The accepted vocabulary belongs to one game and must not modify the global dictionary.

---

## 14. Word-validation pipeline

Word validation should be divided into distinct stages.

Conceptually:

```text
Proposed board placement
        ↓
Physical move validation
        ↓
Identify all newly formed words
        ↓
Validate word structure/rules
        ↓
Dictionary lookup
        ↓
Accepted-vocabulary lookup
        ↓
Validation result
```

This allows the engine to distinguish:

### Physically invalid

Examples:

- Disconnected placement
- Diagonal placement
- Illegal gaps
- Using a tile not in the player's rack
- Invalid first move

These moves are rejected immediately.

### Physically valid but dictionary-unknown

These may enter the opponent-approval flow.

### Fully valid

These can be committed normally.

---

## 15. Scoring architecture

Scoring should be implemented separately from move validation.

The scoring system should receive enough information to determine:

- Newly formed words
- Which tiles were newly placed
- Which multiplier squares those tiles cover
- Which tiles are blanks
- Rack size
- Whether the all-tiles bonus applies

The scoring function should produce a score result without directly changing the player's score.

Only after the move is accepted/committed should that score be applied to the game state.

This prevents rejected proposals from accidentally awarding points.

---

## 16. Turn-state machine

The game has several distinct states.

The exact names can be refined, but the architecture should represent states conceptually similar to:

```text
GAME_SETUP
    ↓
PLAYER_TURN
    ↓
MOVE_BEING_CREATED
    ↓
MOVE_REQUIRES_PLAYER_CONFIRMATION
    ↓
WAITING_FOR_OPPONENT_APPROVAL
    ↓
    ├── APPROVED → MOVE_COMMITTED
    │                  ↓
    │              NEXT_PLAYER
    │
    └── REJECTED → PLAYER_TURN
```

Other transitions include:

```text
PLAYER_TURN
    ├── Pass → NEXT_PLAYER
    ├── Exchange → NEXT_PLAYER
    └── Valid move → MOVE_COMMITTED
```

The engine should make illegal state transitions impossible or return explicit errors.

---

## 17. Move history

The game should keep a structured move history.

A history entry should contain enough information to understand what happened without relying on UI logs.

Conceptually:

```text
MoveHistoryEntry
├── move number
├── player
├── action type
├── placed tiles
├── formed words
├── score
├── dictionary status
├── approval status
└── resulting state information
```

For an accepted unknown word, the history should record that it required opponent approval.

For a rejected proposal, the history may record the proposal/rejection as an event rather than as a completed move.

The exact representation can be refined in `game-engine.md`.

Move history will later support:

- Game history UI
- Debugging
- Replays
- Online synchronization
- Potential statistics

---

## 18. Local persistence

Version 1 should support recovery of an ongoing local game after an accidental browser refresh.

The application layer may persist the serializable game state in browser storage.

The game engine itself should not directly access browser storage.

Conceptually:

```text
Game Engine
    ↑
Application layer
    ↑
Browser persistence
```

The stored state should be versioned so that future changes to the game-state structure can be handled deliberately.

---

## 19. Online multiplayer architecture

Online multiplayer is not part of the first implementation, but the architecture must allow it.

The eventual model should be server-authoritative.

Conceptually:

```text
             Browser A
                 │
                 │ actions
                 ▼
          ┌──────────────┐
          │ Game Server  │
          │              │
          │ Game Engine  │
          └──────┬───────┘
                 │
                 │ state/events
                 ▼
             Browser B
```

The server should be responsible for authoritative game state.

Clients should submit actions such as:

```text
PlaceTile
SubmitMove
AcceptMove
RejectMove
Pass
ExchangeTiles
```

rather than directly telling the server:

> "The score is now 127."

The server should calculate the resulting state itself.

This prevents clients from cheating and ensures both players operate on the same rules.

---

## 20. Randomness in online games

The server should eventually control random events such as:

- Tile-bag shuffling
- Tile drawing

Clients should never be authoritative over the tile bag.

The architecture should therefore keep random game events inside the game engine/server boundary.

For local games, the same engine can use a local random source.

---

## 21. Online private information

In the local version, hiding a rack is primarily a UI responsibility.

In online multiplayer, it becomes a security responsibility.

A future server API should never send Player A the contents of Player B's rack.

The architecture should therefore distinguish between:

```text
Complete authoritative GameState
```

and:

```text
Player-specific GameView
```

A future online client should receive only the information that player is allowed to see.

---

## 22. Chat separation

Future chat functionality must remain separate from game rules.

Conceptually:

```text
Game
├── Game state
├── Moves
└── Players

Chat
├── Messages
├── Sender
├── Timestamp
└── Game/conversation reference
```

Chat must not be part of the authoritative game-state transition system.

---

## 23. Language configuration

The engine should be designed around a configurable game/rule set.

A future configuration might conceptually contain:

```text
GameConfiguration
├── language
├── boardDefinition
├── tileDefinition
├── dictionary
├── wordRules
└── scoringRules
```

For the initial version:

```text
language = Swedish
game rules = Swedish Alfapet
```

Future languages should provide their own configuration rather than requiring Swedish conditionals throughout the engine.

Avoid code such as:

```text
if language === "swedish" ...
```

inside general game logic unless the behaviour genuinely cannot be expressed through configuration.

---

## 24. UI boundary

The UI should interact with the game through application-level actions and selectors/view models.

The UI may decide:

- Which buttons to display
- Which modal to show
- How to animate a tile
- How to arrange the board
- How to display scores
- How to hide private information

The UI must not independently decide:

- Whether a move is legal
- Whether a word is valid
- How many points a move receives
- Whether a multiplier applies
- Whether a player gets another turn
- Whether a game has ended

Those decisions belong to the engine.

---

## 25. Error handling

Game-rule errors should be explicit and understandable.

Examples:

```text
INVALID_PLACEMENT
TILE_NOT_IN_RACK
MOVE_NOT_CONNECTED
FIRST_MOVE_MUST_COVER_CENTER
WORD_NOT_ALLOWED
NOT_ENOUGH_TILES_FOR_EXCHANGE
INVALID_TURN
INVALID_GAME_STATE
```

The engine should provide structured error information.

The UI can then translate these errors into Swedish user-facing messages.

This keeps game logic independent from presentation language.

---

## 26. Testing architecture

The game engine should be testable without rendering the application.

Tests should be able to construct a known game state and execute actions against it.

For example:

```text
given:
    known board
    known rack
    known tile bag
    known dictionary

when:
    player submits move

then:
    expected game state
    expected score
    expected turn state
```

Tests should use deterministic tile bags/randomness whenever exact outcomes matter.

Important test categories include:

- Board placement
- Word extraction
- Dictionary validation
- Blank tiles
- Multipliers
- Scoring
- Tile drawing
- Exchange
- Passing
- End game
- Unknown-word proposals
- Approval
- Rejection
- Accepted vocabulary
- Hot-seat state transitions

---

## 27. Suggested project boundaries

A possible project structure is:

```text
src/
├── app/
│   └── ...
├── components/
│   └── ...
├── game/
│   ├── engine/
│   ├── model/
│   ├── rules/
│   ├── scoring/
│   ├── dictionary/
│   └── configuration/
├── application/
│   ├── game-controller/
│   ├── persistence/
│   └── ...
├── data/
│   └── ...
└── tests/
    └── ...
```

The exact directory structure can be adjusted once the technology stack is finalized.

The important boundary is that the core game logic remains isolated from the web framework.

---

## 28. Architecture priorities

When making architectural decisions, prioritize in this order:

1. Correct game rules
2. Testability
3. Clear game-state transitions
4. Separation of game engine and UI
5. Maintainability
6. Good local-game user experience
7. Future online multiplayer compatibility
8. Future language support

Do not sacrifice a simple, understandable implementation merely to support hypothetical future requirements.

The architecture should be prepared for the future without building the future prematurely.
