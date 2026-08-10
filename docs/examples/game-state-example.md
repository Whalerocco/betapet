# Game State Example

## 1. Purpose

This example shows what a complete Version 1 game state might look like during an ongoing local game.

It is illustrative rather than a final TypeScript schema.

Claude should use this example together with:

- `content-model.md`
- `game-engine.md`
- `game-rules.md`
- `dictionary.md`
- `local-multiplayer.md`

If this example conflicts with those specification files, the specification files take precedence.

---

## 2. Scenario

Assume:

- The game is Swedish.
- Two players are playing locally on one device.
- The players are August and Anna.
- The game uses 7-tile racks.
- Several turns have already been completed.
- It is currently August's turn.
- August has placed three tiles on the board but has not submitted the move yet.
- One of the pending tiles is a blank representing `Ö`.
- An earlier non-dictionary word, `GRÖMP`, was accepted by Anna and is therefore valid for the rest of this game.

The example intentionally includes both committed and pending tiles.

---

# 3. Conceptual game state

A serialized state could conceptually look like this:

```json
{
  "version": 1,
  "id": "game-001",
  "configurationId": "sv-alfapet-v1",
  "status": "ACTIVE",

  "players": [
    {
      "id": "player-1",
      "name": "August",
      "score": 74,
      "rack": {
        "tileIds": [
          "tile-31",
          "tile-44",
          "tile-52",
          "tile-63"
        ]
      }
    },
    {
      "id": "player-2",
      "name": "Anna",
      "score": 68,
      "rack": {
        "tileIds": [
          "tile-17",
          "tile-23",
          "tile-39",
          "tile-48",
          "tile-55",
          "tile-70",
          "tile-82"
        ]
      }
    }
  ],

  "tiles": {
    "tile-05": {
      "id": "tile-05",
      "letter": "S",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-06": {
      "id": "tile-06",
      "letter": "K",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-07": {
      "id": "tile-07",
      "letter": "O",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-08": {
      "id": "tile-08",
      "letter": "G",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },

    "tile-31": {
      "id": "tile-31",
      "letter": "R",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-44": {
      "id": "tile-44",
      "letter": "A",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-52": {
      "id": "tile-52",
      "letter": "N",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-63": {
      "id": "tile-63",
      "letter": "T",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },

    "tile-91": {
      "id": "tile-91",
      "letter": null,
      "points": 0,
      "isBlank": true
    },
    "tile-72": {
      "id": "tile-72",
      "letter": "F",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    },
    "tile-73": {
      "id": "tile-73",
      "letter": "R",
      "points": "<from Swedish tile configuration>",
      "isBlank": false
    }
  },

  "board": {
    "occupiedCells": [
      {
        "coordinate": {
          "row": 7,
          "column": 7
        },
        "tileId": "tile-05"
      },
      {
        "coordinate": {
          "row": 7,
          "column": 8
        },
        "tileId": "tile-06"
      },
      {
        "coordinate": {
          "row": 7,
          "column": 9
        },
        "tileId": "tile-07"
      },
      {
        "coordinate": {
          "row": 7,
          "column": 10
        },
        "tileId": "tile-08"
      }
    ]
  },

  "tileBag": {
    "tileIds": [
      "tile-101",
      "tile-102",
      "tile-103",
      "tile-104",
      "tile-105"
    ]
  },

  "currentPlayerId": "player-1",

  "turnState": {
    "type": "PLAYER_TURN",
    "playerId": "player-1"
  },

  "pendingMove": {
    "playerId": "player-1",
    "status": "EDITING",
    "placedTiles": [
      {
        "tileId": "tile-72",
        "coordinate": {
          "row": 6,
          "column": 8
        }
      },
      {
        "tileId": "tile-91",
        "coordinate": {
          "row": 5,
          "column": 8
        },
        "representedLetter": "Ö"
      },
      {
        "tileId": "tile-73",
        "coordinate": {
          "row": 4,
          "column": 8
        }
      }
    ],
    "formedWords": [],
    "validation": null,
    "scorePreview": null
  },

  "acceptedVocabulary": [
    {
      "word": "GRÖMP",
      "acceptedAtSequence": 6,
      "proposedByPlayerId": "player-1",
      "acceptedByPlayerId": "player-2"
    }
  ],

  "history": [
    {
      "id": "event-001",
      "sequence": 1,
      "type": "GAME_STARTED",
      "payload": {
        "startingPlayerId": "player-1"
      }
    },
    {
      "id": "event-002",
      "sequence": 2,
      "type": "WORD_MOVE_COMMITTED",
      "playerId": "player-1",
      "payload": {
        "words": ["SKOG"],
        "score": 12
      }
    },
    {
      "id": "event-003",
      "sequence": 3,
      "type": "PASS",
      "playerId": "player-2",
      "payload": {}
    },
    {
      "id": "event-004",
      "sequence": 4,
      "type": "UNKNOWN_WORD_PROPOSED",
      "playerId": "player-1",
      "payload": {
        "words": ["GRÖMP"]
      }
    },
    {
      "id": "event-005",
      "sequence": 5,
      "type": "UNKNOWN_WORD_ACCEPTED",
      "playerId": "player-2",
      "payload": {
        "proposingPlayerId": "player-1",
        "words": ["GRÖMP"]
      }
    },
    {
      "id": "event-006",
      "sequence": 6,
      "type": "WORD_MOVE_COMMITTED",
      "playerId": "player-1",
      "payload": {
        "words": ["GRÖMP"],
        "score": 18,
        "usedUnknownWordApproval": true
      }
    }
  ],

  "consecutivePasses": 0,

  "result": null
}
```

---

# 4. Important note about tile locations

The abbreviated JSON above is intended to demonstrate structure, not provide a fully enumerated legal game snapshot.

In a real state, every physical tile must have exactly one location.

Conceptually:

```text
Tile
   ├── tile bag
   ├── Player 1 rack
   ├── Player 2 rack
   ├── pending move
   └── committed board
```

Never two at once.

The example only expands some tile records to remain readable.

Production code and tests must enforce the tile-location invariant described in `content-model.md`.

---

# 5. Pending tiles and the rack

Notice that the pending tiles:

```text
tile-72
tile-91
tile-73
```

are not listed in August's rack.

This example models pending tiles as having moved from:

```text
RACK
```

to:

```text
PENDING_MOVE
```

while the move is being edited.

An alternative implementation could retain rack ownership and derive pending placement separately, but it must never logically duplicate a physical tile.

Choose one consistent representation.

The implementation should follow the final TypeScript model selected for the engine.

---

# 6. Committed board

The committed board currently contains:

```text
S K O G
```

at:

```text
row 7, columns 7–10
```

These tiles are permanent.

August cannot move them during the current turn.

The pending move is separate from this committed board state.

---

# 7. Visual board

The UI derives the visual board from:

```text
committed board
+
pending move
```

Conceptually:

```text
      R
      Ö
      F
      K
S K O G
```

The exact letters/coordinates here are illustrative.

The important point is that the UI can render pending and committed tiles together while the engine still distinguishes them.

---

# 8. Blank tile

`tile-91` is a blank.

Its physical definition is:

```text
letter = null
points = 0
isBlank = true
```

During the pending move:

```text
representedLetter = "Ö"
```

The blank therefore behaves as `Ö` for:

- Word construction
- Dictionary lookup
- Accepted-vocabulary lookup

but contributes zero base tile points.

Because the move is still pending, August may change the represented letter before commitment.

---

# 9. Current player

The authoritative game state says:

```json
"currentPlayerId": "player-1"
```

and:

```json
{
  "type": "PLAYER_TURN",
  "playerId": "player-1"
}
```

Therefore August owns the current normal turn.

This does not by itself determine who may currently see the device.

That is controlled by local session state.

---

# 10. Local session state is separate

A local application state might currently be:

```json
{
  "mode": "ACTIVE_TURN",
  "expectedViewerPlayerId": "player-1"
}
```

This is not stored inside the authoritative game engine state.

At a handoff it might instead be:

```json
{
  "mode": "HANDOFF_TO_TURN",
  "expectedViewerPlayerId": "player-1"
}
```

The game state may be identical while the local UI controls whether August's rack is actually visible.

---

# 11. Player-safe view

During August's active local turn, the application might derive:

```json
{
  "currentPlayer": {
    "id": "player-1",
    "name": "August",
    "score": 74,
    "rack": [
      "tile-31",
      "tile-44",
      "tile-52",
      "tile-63"
    ]
  },

  "opponent": {
    "id": "player-2",
    "name": "Anna",
    "score": 68,
    "rackCount": 7
  },

  "board": "...",
  "pendingMove": "...",
  "remainingTileCount": 5
}
```

Anna's tile identities are omitted.

For Version 1, this is primarily a clean architecture/privacy pattern.

For future online multiplayer, the same distinction becomes a security requirement.

---

# 12. Accepted vocabulary

The state contains:

```text
GRÖMP
```

because Anna previously accepted it.

Therefore a later move forming exactly:

```text
GRÖMP
```

should produce:

```text
ACCEPTED_IN_GAME
```

rather than:

```text
UNKNOWN_WORD
```

No new opponent approval is required.

---

# 13. Accepted-word metadata

The example stores:

```text
word
acceptedAtSequence
proposedByPlayerId
acceptedByPlayerId
```

This metadata is useful for history and debugging.

However, the validation system only needs efficient access to the normalized accepted word.

The implementation may therefore maintain:

```text
Set<string>
```

for lookup while retaining richer history separately.

Avoid maintaining two sources of truth that can disagree.

---

# 14. History

History contains structured events rather than Swedish presentation strings.

For example:

```json
{
  "type": "PASS",
  "playerId": "player-2"
}
```

The UI can render:

```text
Anna passade.
```

Likewise:

```json
{
  "type": "UNKNOWN_WORD_ACCEPTED",
  "playerId": "player-2",
  "payload": {
    "words": ["GRÖMP"]
  }
}
```

can become:

```text
Anna godkände GRÖMP.
```

This allows future UI-language changes without changing saved history.

---

# 15. Derived values

Some information should be derived rather than stored.

For example:

```text
remainingTileCount
```

can be calculated as:

```text
tileBag.tileIds.length
```

Likewise, the opponent's rack count is:

```text
opponent.rack.tileIds.length
```

Do not duplicate these values in authoritative state unless there is a demonstrated reason.

---

# 16. State after submit

Suppose August now selects:

```text
Spela
```

The engine validates the pending placement.

A validation result might conceptually become:

```json
{
  "physicalValidity": "VALID",
  "formedWords": [
    {
      "word": "FÖRK",
      "orientation": "VERTICAL"
    }
  ],
  "wordResults": [
    {
      "word": "FÖRK",
      "normalizedWord": "FÖRK",
      "status": "UNKNOWN_WORD"
    }
  ],
  "requiresApproval": true
}
```

The exact example word is intentionally artificial.

The point is the state transition.

---

# 17. State requiring player confirmation

After validation detects an unknown word, the pending move may become:

```json
{
  "playerId": "player-1",
  "status": "REQUIRES_PLAYER_CONFIRMATION",
  "placedTiles": ["..."],
  "formedWords": [
    {
      "word": "FÖRK"
    }
  ],
  "validation": {
    "requiresApproval": true
  },
  "scorePreview": {
    "total": 14
  }
}
```

The UI then asks August:

```text
"FÖRK" finns inte i ordlistan.

Vill du spela läggningen ändå?
```

---

# 18. State awaiting opponent approval

If August selects:

```text
Spela ändå
```

the authoritative state changes to something conceptually like:

```json
{
  "currentPlayerId": "player-1",
  "turnState": {
    "type": "WAITING_FOR_OPPONENT_APPROVAL",
    "proposingPlayerId": "player-1",
    "reviewingPlayerId": "player-2"
  },
  "pendingMove": {
    "playerId": "player-1",
    "status": "WAITING_FOR_OPPONENT",
    "placedTiles": ["..."],
    "formedWords": [
      {
        "word": "FÖRK"
      }
    ],
    "scorePreview": {
      "total": 14
    }
  }
}
```

Notice:

```text
currentPlayerId = player-1
```

may still identify August as owner of the unresolved turn.

But:

```text
reviewingPlayerId = player-2
```

identifies Anna as the person who must act now.

This distinction is critical.

---

# 19. Local handoff for review

The application layer then uses a local state such as:

```json
{
  "mode": "HANDOFF_TO_REVIEW",
  "expectedViewerPlayerId": "player-2"
}
```

The UI shows:

```text
Anna behöver ta ställning till Augusts läggning.

Lämna över enheten till Anna.

[ Fortsätt ]
```

No rack is shown.

---

# 20. State after acceptance

If Anna accepts, the engine should atomically produce a state where:

- Pending tiles are committed.
- August receives the score.
- August draws replacement tiles.
- `FÖRK` is added to accepted vocabulary.
- Pending move is cleared.
- Anna becomes the next normal player.
- History is updated.

Conceptually:

```json
{
  "currentPlayerId": "player-2",
  "turnState": {
    "type": "PLAYER_TURN",
    "playerId": "player-2"
  },
  "pendingMove": null,
  "acceptedVocabulary": [
    "GRÖMP",
    "FÖRK"
  ]
}
```

The exact persisted accepted-vocabulary representation may contain richer metadata.

---

# 21. State after rejection

If Anna rejects instead:

- The score is unchanged.
- No replacement tiles are drawn.
- `FÖRK` is not added to accepted vocabulary.
- August remains responsible for the turn.
- The proposed tiles remain editable.

Conceptually:

```json
{
  "currentPlayerId": "player-1",
  "turnState": {
    "type": "PLAYER_TURN",
    "playerId": "player-1"
  },
  "pendingMove": {
    "playerId": "player-1",
    "status": "REJECTED",
    "placedTiles": ["..."]
  }
}
```

The local application then enters:

```text
HANDOFF_BACK_AFTER_REJECTION
```

before showing August's rack again.

---

# 22. Persistence example

The local application should not save raw `GameState` without version information.

Conceptually:

```json
{
  "schemaVersion": 1,
  "configurationVersion": "sv-alfapet-v1",
  "savedAt": "2026-08-10T18:30:00.000Z",
  "gameState": {
    "...": "..."
  }
}
```

The timestamp above is illustrative.

Gameplay ordering must use explicit event/turn sequences rather than relying on `savedAt`.

---

# 23. Serialization of sets

If the runtime model uses:

```ts
Set<string>
```

for accepted vocabulary, JSON serialization must convert it explicitly.

Runtime:

```ts
new Set(["GRÖMP", "FÖRK"])
```

Serialized:

```json
["GRÖMP", "FÖRK"]
```

Loaded state must reconstruct the expected runtime representation.

Do not assume JSON preserves `Set`.

---

# 24. Invariants demonstrated

A real state based on this example must preserve:

```text
Each tile has exactly one location.
```

```text
Only one unresolved pending move exists.
```

```text
Pending tiles belong to the player who owns the pending move.
```

```text
Committed board tiles cannot be edited.
```

```text
Accepted words use normalized Swedish text.
```

```text
A finished game must contain a final result.
```

```text
An active game must not contain a completed final result.
```

---

# 25. What is intentionally omitted

This example does not attempt to provide:

- The complete Swedish tile distribution
- Exact tile point values
- The complete board multiplier layout
- A full dictionary
- Every tile in the physical bag
- Every history payload field
- Final TypeScript syntax

Those belong to verified configuration and implementation.

Do not infer missing Alfapet values from this example.

---

# 26. Implementation guidance

When implementing the real state model:

1. Start from the domain rules, not from this JSON literally.
2. Use discriminated unions for mutually exclusive states where useful.
3. Ensure serialization is explicit.
4. Keep local UI/session state outside `GameState`.
5. Enforce tile-location invariants in tests.
6. Derive player-safe views rather than exposing full state indiscriminately.
7. Keep pending moves separate from committed board occupancy.
8. Keep dictionary/global configuration separate from per-game accepted vocabulary.

---

# 27. Definition of success

This example has served its purpose if Claude can answer questions such as:

- Where is a tile stored while it is pending?
- How is a blank represented?
- Where is accepted vocabulary stored?
- How does a rejected proposal differ from a committed move?
- Who owns the turn while an opponent is reviewing an unknown word?
- Why is local handoff state not part of the game engine?
- What data should be persisted?
- What information should be hidden from the opponent?

The exact implementation may differ in shape, but these semantic distinctions must remain.
