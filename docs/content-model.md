# Content Model

## 1. Purpose

This document defines the main data concepts used by the game and how they relate to one another.

For this project, "content model" means the structured domain data that represents:

- A game
- Players
- Tiles
- The board
- Moves
- Words
- Scores
- Dictionary results
- Accepted non-dictionary vocabulary
- Game history
- Future online/social entities

This document describes the model conceptually. Exact TypeScript types belong in the implementation and should follow `game-engine.md`.

---

## 2. Modeling principles

The data model should follow these principles:

1. Game state must be explicit and serializable.
2. Physical game objects should have stable identities where useful.
3. Committed state must be distinguishable from pending state.
4. Permanent configuration must be distinguishable from per-game state.
5. Derived values should not be duplicated unnecessarily.
6. UI-only state should not be stored in the core game model.
7. Future online entities should not complicate Version 1.
8. Private player information must be identifiable as private even though Version 1 runs locally.

---

# 3. Main model overview

The initial game can be thought of as:

```text
Game
├── Configuration
├── Players
│   └── Racks
├── Board
│   └── Cells
│       └── Tiles
├── Tile bag
├── Current turn
├── Pending move
├── Accepted vocabulary
├── Move history
└── Result
```

Configuration is largely static.

Game state changes as the game progresses.

---

# 4. Game

`Game` is the top-level domain object.

Conceptually:

```text
Game
├── id
├── version
├── configurationId
├── status
├── players
├── board
├── tileBag
├── currentPlayerId
├── turnState
├── pendingMove
├── acceptedVocabulary
├── history
├── consecutivePasses
└── result
```

## Responsibilities

The game contains everything needed to reconstruct an ongoing match.

It should be possible to serialize a game, store it, reload it, and continue playing.

The game should not contain browser-specific information.

---

# 5. Game ID

Every game should have a unique ID.

For local games, this may initially be generated in the browser.

For future online games, the server/database will generate or own the authoritative identifier.

The ID should not encode gameplay information.

---

# 6. Game version

Persisted game data should contain a schema/version identifier.

For example:

```text
version: 1
```

This allows future application versions to detect older saved-game formats and migrate or reject them deliberately.

Do not assume that serialized game state will remain structurally identical forever.

---

# 7. Game status

A game has an overall status.

Conceptually:

```text
SETUP
ACTIVE
FINISHED
```

Possible future states may include:

```text
ABANDONED
CANCELLED
```

but they are not required for Version 1.

---

# 8. Game configuration

A game references a configuration defining the rule set.

Conceptually:

```text
GameConfiguration
├── id
├── language
├── boardDefinition
├── tileSetDefinition
├── rackSize
├── dictionaryDefinition
├── wordRules
└── scoringRules
```

For Version 1:

```text
language = Swedish
rule family = Swedish Alfapet
```

The chosen rack size is part of the individual game's configuration because players choose between 6, 7, and 8 tiles before starting.

---

# 9. Language definition

Language-specific information should be represented separately from general game logic.

Conceptually:

```text
LanguageDefinition
├── code
├── name
├── alphabet
├── normalizationRules
├── dictionary
└── wordRules
```

For Swedish:

```text
code = "sv"
alphabet includes Å, Ä, Ö
```

Future languages may provide different alphabets, dictionaries, and word rules.

---

# 10. Player

A game player contains gameplay information.

Conceptually:

```text
Player
├── id
├── name
├── rack
└── score
```

For Version 1 there are exactly two players.

A player is not yet the same thing as a future registered `User`.

This distinction is important.

A local player might simply be:

```text
Player
    name = "August"
```

without having an account.

Later:

```text
Player
    userId = registered user
```

may associate a game participant with an online account.

---

# 11. Player ID

Every player within a game must have a stable ID.

Do not use the player's display name as the identifier.

Two players may theoretically choose identical display names.

For example:

```text
player-1
player-2
```

or generated IDs are preferable.

---

# 12. Rack

A rack is an ordered collection of tile IDs owned by a player.

Conceptually:

```text
Rack
└── tileIds[]
```

The rack should reference physical tiles rather than copying their properties.

The rack is private information.

In Version 1, privacy is enforced by the hot-seat UI.

In future online multiplayer, the server/API must ensure opponents do not receive each other's rack contents.

---

# 13. Tile

A tile represents one physical tile in the game.

Conceptually:

```text
Tile
├── id
├── letter
├── points
├── isBlank
└── representedLetter?
```

Normal tile example:

```text
id = "tile-42"
letter = "K"
points = configured K value
isBlank = false
```

Blank example:

```text
id = "tile-91"
letter = null
points = 0
isBlank = true
representedLetter = "Ö"
```

The exact Swedish point values come from the verified tile-set configuration.

---

# 14. Tile definition versus tile instance

The model should distinguish:

### Tile definition

Static configuration:

```text
TileDefinition
├── letter
├── points
└── count
```

### Tile instance

A physical tile in a specific game:

```text
Tile
├── id
├── definition
└── representedLetter?
```

For example, if the Swedish tile set contains several A tiles, they share the same definition but each has a unique physical ID.

This makes rack, bag, board, and move ownership unambiguous.

---

# 15. Tile bag

The tile bag contains tile IDs that have not yet been drawn.

Conceptually:

```text
TileBag
└── tileIds[]
```

The order can represent the shuffled draw order.

This makes game state serializable and deterministic after initial shuffle.

The engine should not need to reshuffle before every draw.

---

# 16. Board definition

The board definition is static configuration.

Conceptually:

```text
BoardDefinition
├── width
├── height
├── centreCoordinate
└── cells
```

Each configured cell contains:

```text
BoardCellDefinition
├── coordinate
└── multiplier
```

This data represents the physical Swedish Alfapet board.

It must be verified rather than copied from a Scrabble board.

---

# 17. Board state

The board state records committed tile occupancy.

Conceptually:

```text
BoardState
└── occupiedCells
    ├── coordinate
    └── tileId
```

The permanent multiplier belongs to the board definition.

The changing tile occupancy belongs to board state.

Keeping these separate makes it clear that a scoring square continues to exist even after it has been covered, although its multiplier is no longer activated by later moves.

---

# 18. Coordinate

Coordinates should use a simple internal model.

Conceptually:

```text
Coordinate
├── row
└── column
```

Coordinates should be value objects.

Two coordinates with the same row and column represent the same board position.

---

# 19. Orientation

Words and placements use:

```text
HORIZONTAL
VERTICAL
```

Diagonal orientation does not exist.

Orientation should be represented explicitly rather than inferred repeatedly when it has already been determined.

---

# 20. Pending move

The pending move represents tiles placed during the current turn that have not yet been committed.

Conceptually:

```text
PendingMove
├── playerId
├── placedTiles
├── formedWords
├── validation
├── scorePreview
└── status
```

The pending move is particularly important for the custom unknown-word flow.

---

# 21. Pending placed tile

A pending placed tile contains:

```text
PendingPlacedTile
├── tileId
├── coordinate
└── representedLetter?
```

For normal tiles, `representedLetter` is unnecessary.

For blank tiles, it records the letter selected by the player for the current proposal.

Before commitment, the player may change the represented letter if the pending tile remains editable.

After commitment, the representation becomes permanent.

---

# 22. Pending move status

A pending move may conceptually have states such as:

```text
EDITING
REQUIRES_PLAYER_CONFIRMATION
WAITING_FOR_OPPONENT
REJECTED
```

A fully normal move may be committed directly without needing to remain in a special approval state.

The exact state machine is defined in `game-engine.md`.

---

# 23. Formed word

A formed word is derived from the board plus pending placement.

Conceptually:

```text
FormedWord
├── normalizedText
├── orientation
├── coordinates
├── tileIds
└── validationResult
```

The text should be derived from tiles rather than trusted as independent user input.

---

# 24. Word validation result

Each newly formed word receives a validation result.

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

These statuses are described in `dictionary.md`.

---

# 25. Move validation result

A move-level validation result aggregates physical and lexical validation.

Conceptually:

```text
MoveValidationResult
├── physicalValidity
├── formedWords
├── wordResults
├── requiresApproval
└── errors
```

The move-level result determines whether the move:

- Cannot be played.
- Can be committed normally.
- Can be proposed to the opponent.

---

# 26. Score preview

The engine may calculate the score before the move is committed.

Conceptually:

```text
ScoreResult
├── wordScores
├── allTilesBonus
└── total
```

This is a preview until the move is actually accepted and committed.

A score preview must not change the player's real score.

---

# 27. Word score

A word-level score may contain:

```text
WordScore
├── word
├── baseLetterScore
├── letterMultiplierEffects
├── wordMultiplierEffects
└── total
```

This detailed representation is useful for:

- Testing
- Debugging
- Future score explanations in the UI

It does not need to be persisted forever if it can be reliably reconstructed, but move history may retain it for convenience.

---

# 28. Accepted vocabulary

Accepted vocabulary belongs to an individual game.

Conceptually:

```text
AcceptedVocabulary
└── normalizedWords[]
```

Example:

```text
[
  "GRÖMP",
  "FLÄRP"
]
```

Words must be stored using the same normalization function as dictionary lookup.

The collection should behave as a set: duplicate entries have no additional meaning.

---

# 29. Accepted word metadata

The minimal implementation only needs the normalized word.

However, it may be useful to record metadata:

```text
AcceptedWord
├── word
├── acceptedAtMove
├── proposedByPlayerId
└── acceptedByPlayerId
```

This makes game history clearer and may help future replay/debugging.

If this metadata is stored, the actual validity lookup should still be simple and deterministic.

---

# 30. Move

A committed word move represents one completed gameplay action.

Conceptually:

```text
CommittedMove
├── id
├── turnNumber
├── playerId
├── placedTiles
├── formedWords
├── score
├── usedUnknownWordApproval
└── acceptedUnknownWords
```

Only accepted/committed tile placements become committed moves.

A rejected proposal is not a committed move.

---

# 31. Turn number

The game should maintain a deterministic ordering of completed turns/actions.

A simple turn or action sequence number is sufficient.

Do not use wall-clock timestamps as the only ordering mechanism.

Timestamps may be added later for online/social display, but gameplay ordering should be explicit.

---

# 32. Game history

Game history records meaningful events.

Conceptually:

```text
GameHistory
└── events[]
```

Possible event types include:

```text
GAME_STARTED
WORD_MOVE_COMMITTED
UNKNOWN_WORD_PROPOSED
UNKNOWN_WORD_ACCEPTED
UNKNOWN_WORD_REJECTED
PASS
TILES_EXCHANGED
GAME_FINISHED
```

History should be structured data, not preformatted Swedish sentences.

The UI can convert structured history into user-facing text.

---

# 33. History event

A generic history event may contain:

```text
HistoryEvent
├── id
├── sequence
├── type
├── playerId?
└── payload
```

The payload depends on event type.

For example:

```text
UNKNOWN_WORD_REJECTED
├── proposingPlayerId
├── reviewingPlayerId
└── words
```

---

# 34. Pass event

A pass event records:

```text
PassEvent
├── playerId
└── sequence
```

The game state separately tracks the consecutive-pass count required for end-game logic.

---

# 35. Exchange event

An exchange event may record:

```text
ExchangeEvent
├── playerId
├── tileCount
└── sequence
```

For privacy and future online fairness, public history should not necessarily expose which letters were exchanged.

The authoritative local/server state may retain physical tile IDs if needed for replay/debugging.

---

# 36. Game result

When the game is finished:

```text
GameResult
├── finalScores
├── winnerPlayerId?
├── remainingRackDeductions
└── endReason
```

Possible end reasons should be explicit.

Examples:

```text
NO_TILES_AND_NO_MORE_PLAY
CONSECUTIVE_PASSES
NO_PLAYER_CAN_PLAY
```

The exact rule interpretation comes from `game-rules.md`.

A tie should be representable, so `winnerPlayerId` may be absent or the model may explicitly represent multiple winners.

---

# 37. Private versus public game data

The model should distinguish between authoritative state and what a specific player is allowed to see.

### Authoritative game state

Contains:

- Both racks
- Tile bag
- All game information

### Player view

Contains only information visible to that player.

Conceptually:

```text
PlayerGameView
├── board
├── scores
├── ownRack
├── opponentRackCount
├── currentTurn
├── pendingPublicInformation
└── history
```

Version 1 may not require a formal player-view API immediately, but the model should not make one difficult to add.

This becomes essential for online multiplayer.

---

# 38. Local hot-seat session state

Some information belongs to the local application but not to the game rules.

Examples:

```text
LocalSessionState
├── activeScreenPlayerId?
├── handoffRequired
├── selectedTileId?
├── dragState?
└── openDialog?
```

This must not be mixed into `GameState`.

For example:

```text
handoffRequired = true
```

is a UI/privacy flow concern, not an Alfapet rule.

---

# 39. Persistence model

Version 1 should persist enough state to restore an interrupted local game.

Conceptually:

```text
SavedLocalGame
├── schemaVersion
├── savedAt
└── gameState
```

The saved game should contain authoritative gameplay state.

Ephemeral interaction state such as an in-progress animation does not need to be restored.

Whether an editable pending placement is persisted should be decided consistently; if persisted, it must restore without violating turn or privacy state.

---

# 40. Static game data

Static data should be kept separate from saved game state where practical.

Examples:

```text
Swedish board definition
Swedish tile definitions
Dictionary data
Allowed abbreviation exceptions
Language rules
```

A saved game may reference a configuration version rather than duplicating the entire dictionary.

However, enough version information should be stored to detect incompatible rule/data changes.

---

# 41. Configuration versioning

Because dictionary and rule changes can affect gameplay, a game should identify which configuration version it uses.

Conceptually:

```text
configurationId = "sv-alfapet-v1"
```

Future changes might produce:

```text
sv-alfapet-v2
```

Do not silently load an old game under substantially different rules without an explicit compatibility strategy.

---

# 42. Future User model

Online multiplayer will introduce a `User`.

Conceptually:

```text
User
├── id
├── displayName
├── createdAt
└── profile
```

A `User` is an account.

A `Player` is participation in a particular game.

The relationship is:

```text
User
  ↓
participates as
  ↓
Player
  ↓
Game
```

Do not merge these concepts prematurely.

Local Version 1 players do not require users/accounts.

---

# 43. Future friendship model

Future friend relationships may be represented separately:

```text
Friendship
├── userAId
├── userBId
└── status
```

Possible statuses could include:

```text
PENDING
ACCEPTED
BLOCKED
```

This is outside Version 1 and should not be implemented yet.

It is documented only to preserve clean domain boundaries.

---

# 44. Future online match model

A future online match may add persistence metadata around the core game state.

Conceptually:

```text
OnlineMatch
├── id
├── gameState
├── participants
├── createdAt
├── updatedAt
└── status
```

The core `GameState` should remain usable independently of this database wrapper.

---

# 45. Future invitation model

Game invitations may eventually be represented as:

```text
GameInvitation
├── id
├── senderUserId
├── recipientUserId
├── proposedGameConfiguration
└── status
```

This is not part of Version 1.

---

# 46. Future chat model

Chat should remain separate from game state.

Conceptually:

```text
ChatMessage
├── id
├── matchId
├── senderUserId
├── text
└── createdAt
```

Chat messages must not be embedded into the game-engine state-transition model.

This prevents social features from contaminating core gameplay logic.

---

# 47. Future notifications

Notifications should also remain outside the core game.

Conceptually:

```text
Notification
├── id
├── userId
├── type
├── relatedEntityId
├── createdAt
└── readAt?
```

Possible future notification types include:

- Your turn
- Unknown word awaiting approval
- Friend request
- Match invitation
- Game completed

None are required for Version 1.

---

# 48. Entity relationships

The initial model can be summarized as:

```text
Game
│
├── has 2 → Player
│            │
│            └── owns → Rack
│                        │
│                        └── references → Tile
│
├── has → BoardState
│          │
│          └── references → Tile
│
├── has → TileBag
│          │
│          └── references → Tile
│
├── has optional → PendingMove
│                   │
│                   ├── references → Tile
│                   └── derives → FormedWord
│
├── has → AcceptedVocabulary
│
├── has → GameHistory
│
└── has optional → GameResult
```

Future:

```text
User
 │
 ├── Friendship
 │
 ├── GameInvitation
 │
 └── participates in → OnlineMatch
                         │
                         ├── wraps → Game
                         └── has → ChatMessage
```

---

# 49. What should not be modeled as core content

Avoid putting these into the core domain model:

- CSS classes
- Pixel coordinates
- Drag animation state
- Hover state
- Modal visibility
- Button labels
- Translated UI strings
- HTTP response objects
- Database ORM objects
- Authentication tokens
- Chat messages
- Friend lists

These belong to other layers.

---

# 50. Serialization

All persisted core game-state values should be serializable.

Be careful with JavaScript-specific structures such as:

```text
Set
Map
class instances
```

If they are used internally, define explicit serialization/deserialization.

For example:

```text
acceptedVocabulary: Set<string>
```

may serialize as:

```json
{
  "acceptedVocabulary": ["GRÖMP", "FLÄRP"]
}
```

and reconstruct the set when loaded.

Do not rely on JSON automatically preserving custom class behaviour.

---

# 51. Validation on load

Saved state should not be trusted blindly.

When loading persisted game state:

- Check schema version.
- Check required fields.
- Check configuration compatibility.
- Reject obviously corrupted data.
- Reconstruct required domain structures.

For local Version 1 this can remain lightweight.

For future online games, server-side validation becomes mandatory.

---

# 52. IDs

Stable IDs should be used for:

- Games
- Players
- Tiles
- Moves/history events

Future online entities will additionally require IDs for:

- Users
- Matches
- Invitations
- Messages

Do not use array indexes as permanent identifiers when objects can move or be reordered.

---

# 53. Time

Core gameplay should not depend on wall-clock time in Version 1.

Turn order should be represented by explicit sequence/turn values.

Timestamps may be used for:

- Save metadata
- Future online history
- Chat
- Invitations
- Notifications

but should not determine whether a move is valid.

---

# 54. Derived data

Prefer deriving values when practical.

Examples:

```text
remaining tile count
    = tileBag.tileIds.length

opponent rack count
    = opponent.rack.tileIds.length
```

Do not store duplicate values unless there is a strong reason.

Duplicated state creates opportunities for inconsistency.

---

# 55. Invariants

The data model must preserve important invariants.

Examples:

- A physical tile exists in exactly one gameplay location at a time.
- A tile cannot simultaneously be in the bag and a player's rack.
- A committed tile cannot simultaneously be in a rack.
- A pending tile must belong to the player who is making the pending move.
- A board cell cannot contain two committed tiles.
- Player IDs within a game are unique.
- Tile IDs within a game are unique.
- Accepted vocabulary contains normalized words.
- A finished game has a result.
- An active game does not have a final result.
- Only one unresolved pending move exists at a time.

Tests should explicitly protect important invariants.

---

# 56. Tile location model

Conceptually, every physical tile is in one of:

```text
BAG
PLAYER_1_RACK
PLAYER_2_RACK
PENDING_MOVE
BOARD
```

This is a useful invariant even if the implementation does not store an explicit `location` field.

The engine should make it impossible for a tile to exist in two locations simultaneously.

---

# 57. Data model and replay

A structured game history plus deterministic state transitions should make future replay possible.

Replay is not required for Version 1.

However, avoid storing history only as Swedish text such as:

```text
"August lade SKOG för 14 poäng."
```

Instead store structured data and generate that sentence in the UI.

Structured history can later support:

- Replay
- Different languages
- Statistics
- Debugging
- Online synchronization

---

# 58. Data model and online authority

In future online multiplayer:

```text
Database/server
    owns
Authoritative GameState
```

Clients receive appropriate views of that state.

Clients submit actions.

They should not submit arbitrary replacement game states.

The data model should therefore remain suitable for server-side validation and persistence.

---

# 59. Version 1 implementation scope

Version 1 needs concrete implementations for:

- Game
- Game configuration
- Player
- Rack
- Tile definition
- Tile instance
- Tile bag
- Board definition
- Board state
- Coordinate
- Pending move
- Pending placed tile
- Formed word
- Word validation result
- Move validation result
- Score result
- Accepted vocabulary
- Committed move/history
- Game result
- Local saved-game wrapper

Version 1 does **not** need implementations for:

- User
- Friendship
- Game invitation
- Online match database wrapper
- Chat message
- Notification

These future entities are documented only to establish boundaries.

---

# 60. Definition of done

The Version 1 content model is successful when:

- A complete game can be represented as structured data.
- The game can be serialized and restored.
- Every physical tile has an unambiguous location.
- Pending tiles are distinct from committed board tiles.
- Blank representation is preserved correctly.
- Dictionary results are structured.
- Accepted vocabulary is game-specific.
- Scores and final results are represented explicitly.
- Game history is structured rather than preformatted text.
- UI-only state remains outside the game model.
- Future registered users remain conceptually separate from game players.
- Future chat/social models remain outside the game engine.
- The model can later be persisted on a server without redesigning the core game concepts.
