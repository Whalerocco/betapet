# Game Rules

## 1. Purpose

This document is the authoritative specification for the rules of the game.

The game follows the Swedish Alfapet rules described by Alga, with one deliberate modification:

> Words that are not accepted by the dictionary may still be played when the opponent explicitly accepts the proposed move.

The source used as the basis for the standard Alfapet rules is:

https://www.spelregler.org/alfapet-regler/

The implementation must follow this document rather than relying on generic Scrabble rules or assumptions about other versions of Alfapet, **except for the interim board-and-tile-set substitution recorded in [DEC-001](decisions.md) and described in sections 3 and 4 below.**

---

## 2. Players and setup

The initial version supports exactly two players.

Before starting a game, the players determine the rack size:

- 6 tiles
- 7 tiles
- 8 tiles

The selected rack size remains fixed for the entire game.

The corresponding all-tiles-played bonus is:

| Rack size | Bonus |
|---|---:|
| 6 | 40 points |
| 7 | 50 points |
| 8 | 60 points |

All letter tiles are placed in the tile bag and shuffled.

If optional special tiles are not supported in the initial implementation, they must not be included in the game.

The players draw one tile each to determine who starts. The player with the highest tile value starts. The other player starts second.

For the two-player implementation, turns alternate between the players.

---

## 3. Board

**Interim decision (see [DEC-001](decisions.md)):** the exact physical Swedish Alfapet board (17×17, per publicly available secondary sources) could not be verified from any available reliable source, and no photograph of the real board was available either. Per explicit project-owner direction, Version 1 uses the **standard 15×15 Scrabble board layout** instead, as an interim substitute. This may be replaced with a verified Alfapet board layout later if that data becomes available.

The board contains special scoring squares that affect the score when a newly placed tile covers them.

The board and all special-square positions must be represented as explicit game configuration/data rather than hard-coded into UI components.

The scoring-square types actually used on the current (Scrabble-derived) board are:

- Normal square
- Letter ×2
- Letter ×3
- Word ×2
- Word ×3
- Centre/start square (also scores as Word ×2, per standard Scrabble rules)

Letter ×4, Word ×4, and Letter ×−2 remain supported by the engine's data model (for a future verified Alfapet board) but are not present on the current board.

---

## 4. Tile distribution

**Interim decision (see [DEC-001](decisions.md)):** the complete Swedish Alfapet letter distribution and point values could not be verified from any available reliable source. Per explicit project-owner direction, Version 1 uses the **standard Swedish Scrabble tile distribution** instead, as an interim substitute. This may be replaced with a verified Alfapet distribution later if that data becomes available.

The tile set (100 tiles total) is:

| Letter | Count | Points | | Letter | Count | Points |
|---|---:|---:|---|---|---:|---:|
| A | 8 | 1 | | O | 5 | 2 |
| B | 2 | 4 | | P | 2 | 4 |
| C | 1 | 8 | | R | 8 | 1 |
| D | 5 | 1 | | S | 8 | 1 |
| E | 7 | 1 | | T | 8 | 1 |
| F | 2 | 3 | | U | 3 | 4 |
| G | 3 | 2 | | V | 2 | 3 |
| H | 2 | 2 | | X | 1 | 8 |
| I | 5 | 1 | | Y | 1 | 7 |
| J | 1 | 7 | | Z | 1 | 10 |
| K | 3 | 2 | | Ä | 2 | 3 |
| L | 5 | 1 | | Å | 2 | 4 |
| M | 3 | 2 | | Ö | 2 | 4 |
| N | 6 | 1 | | Blank | 2 | 0 |

Q and W are not present in the Swedish Scrabble set and are therefore not present in Betapet's tile set either.

The tile set must explicitly define, for each entry:

- Letter (or blank)
- Number of copies
- Point value

The complete tile distribution should be recorded in the project's language/game configuration rather than scattered throughout the source code.

---

## 5. Rack

Each player has a rack containing the number of tiles selected during setup.

After a normal word move, the player draws enough tiles to restore the rack to the selected rack size, provided tiles remain in the bag.

The same principle applies after exchanging tiles: the player receives the same number of replacement tiles as tiles exchanged, subject to the rules for the remaining tile bag.

The rack is private information in the local hot-seat version.

---

## 6. Starting move

The first completed word must:

- Be placed horizontally or vertically.
- Cover the centre square.
- Form a valid word according to the word-validation rules.
- Use tiles from the current player's rack.

After the move is committed, the player draws replacement tiles as necessary.

The normal scoring rules apply, including any applicable centre-square word multiplier.

---

## 7. Subsequent moves

Every subsequent completed word must connect to the existing board.

New tiles may be placed:

- Horizontally
- Vertically

They may not be placed diagonally.

A move must form a complete word with the existing tiles.

A player may place one new word, but that move may create several words at the same time.

Every word created by the move must be considered when validating the move and calculating its score.

A newly placed tile that is adjacent to existing tiles must form a valid word in that direction as well.

No newly placed tile may be left disconnected from the existing word structure.

---

## 8. Tile placement

All tiles placed during one normal word move must form a single connected line, unless a special Alfapet tile/rule explicitly permits otherwise.

Tiles may extend an existing word.

For example:

    KABEL → ELKABEL

is a valid type of move if the newly placed tiles and resulting word satisfy all other rules.

A move can also cross an existing word, producing several words simultaneously.

The game engine must determine all words resulting from a proposed placement rather than trusting a word name supplied by the UI.

---

## 9. Words formed by a move

A move may create:

- One main word.
- One main word plus one or more crossing words.
- Several words when a new word is placed parallel to existing tiles.

Every newly formed word must be validated.

A word that already existed on the board before the move is not treated as newly created solely because the move intersects it.

The game engine should return the complete set of words affected by a proposed move so that validation and scoring operate on the same authoritative result.

---

## 10. Word length

Words consisting of one letter are not allowed.

Every completed word must contain at least two letters.

This restriction applies to both dictionary words and proposed non-dictionary words.

---

## 11. Standard dictionary validity

The initial language is Swedish.

The dictionary determines whether a newly formed word is a normal dictionary word.

The initial word rules are based on the Alfapet rule that most words are allowed automatically, except for:

- Proper names
- Abbreviations
- One-letter words

Per DEC-007, proper names and abbreviations are not automatically recognized as standard dictionary words, but they are not blocked outright either: they are treated as unknown words, so the proposing player may still attempt them and the opponent may accept or reject them, the same as any other word absent from the dictionary. One-letter words remain the sole category that cannot be attempted at all, since the game's minimum-word-length rule (section 10) is a structural constraint rather than a word-content judgment.

The project's `dictionary.md` will define the exact dictionary source, normalization rules, exceptions, and additional Swedish-language policy.

---

## 12. Allowed grammatical forms

Normal grammatical forms are allowed.

This includes, where represented as valid Swedish words by the chosen dictionary:

- Plurals
- Verb conjugations
- Inflected forms
- Other ordinary grammatical forms

Players do not need to agree separately on each ordinary grammatical form.

The dictionary is the normal authority for these words.

---

## 13. Explicitly allowed categories

The following categories are allowed even though they may be treated differently from ordinary lexical words in some contexts:

- Countries
- Months
- Weekdays

They must still satisfy the game's general word rules.

---

## 14. Non-standard word categories

The following are not valid *standard* dictionary words for gameplay, i.e. they are never auto-accepted the way an ordinary dictionary word is:

### Proper names

Personal names are not standard dictionary words.

Examples include names of people.

### Geographical names

Names of places and geographical entities are not standard dictionary words.

Examples include cities, regions, mountains, rivers, and similar proper geographical names.

### Abbreviations

Abbreviations are generally not standard dictionary words.

There may be an explicit exception list for abbreviations that the project has decided to treat as ordinary Swedish words (auto-accepted like any dictionary word).

The exception list must be maintained as explicit data and not inferred by the UI.

Per DEC-007, proper names, geographical names, and non-standard abbreviations are classified as `UNKNOWN_WORD`: the proposing player may attempt them, and the opponent decides whether to accept them, exactly like any other word absent from the dictionary. They are not `FORBIDDEN_WORD` and do not block the move outright.

### One-letter words

One-letter words are never allowed, under any circumstance. This is the one category that remains `FORBIDDEN_WORD` — it cannot be attempted, and opponent approval cannot rescue it. Unlike the categories above, this is a structural constraint (game-rules.md section 10) rather than a judgment about the word's content.

---

# 15. Custom non-dictionary-word rule

This is the game's main variation from standard Alfapet.

A word that is not found in the dictionary is not automatically rejected.

Instead, the player may propose the move to the opponent.

The process is:

1. The player creates a physically valid move.
2. The game engine determines all newly formed words.
3. The dictionary checks each newly formed word.
4. If all words are normal valid words, the move can be committed normally.
5. If one or more newly formed words are not in the dictionary, the game informs the current player.
6. The player chooses whether to abandon the move or propose it anyway.
7. If the player abandons it, they remain in their turn and may edit the proposed tiles.
8. If the player proposes it, the opponent must review the complete move.
9. The opponent either accepts or rejects the entire move.
10. If accepted, the move is committed normally.
11. If rejected, the move is not committed as a completed turn and control returns to the original player.

---

## 16. Multiple unknown words

If a single move creates multiple words and one or more are not in the dictionary, the entire move is treated as one proposed move.

For example:

    Main word: GRÖMP
    Crossing word: XXXXXX

If either word requires approval, the opponent decides on the complete move.

The opponent does not separately approve or reject individual words.

If the opponent accepts, all words in that move are accepted and the entire move is committed.

---

## 17. Accepted non-dictionary words

When an opponent accepts a proposed non-dictionary word:

- The move is committed.
- The normal score is awarded.
- The word is added to the accepted vocabulary of the current game.
- The word is thereafter considered valid for the remainder of that game.

Example:

1. Player 1 proposes `GRÖMP`.
2. `GRÖMP` is not in the dictionary.
3. Player 2 accepts it.
4. `GRÖMP` becomes an accepted word in this game.
5. Later, Player 2 may play `GRÖMP` without requiring another approval.

The accepted vocabulary belongs to the individual game.

It must not automatically modify the global dictionary.

An accepted word from one game is not automatically accepted in another game.

---

## 18. Rejected proposed moves

If the opponent rejects a proposed move:

- The move is not committed.
- No score is awarded for the proposed move.
- The normal completed-turn transition does not occur.
- The original player gets control of the turn again.
- The newly placed tiles remain available on the board as the player's current proposed placement.
- The player may remove or reposition their newly placed tiles.
- The player may modify the move and submit it again.

Tiles that were already committed to the board before the disputed move cannot be moved.

Only tiles belonging to the current uncommitted proposal may be edited.

The player may ultimately replace the rejected proposal with a different valid move, pass, or exchange tiles according to the normal rules.

---

## 19. No deliberate dictionary bypass

A word that is present in the dictionary cannot be deliberately submitted as a non-dictionary word.

The game engine should determine dictionary status itself.

The player cannot tell the game:

> "Treat this dictionary word as unknown."

The unknown-word approval flow exists only for words that the dictionary does not recognize.

---

## 20. Blank tiles

Blank tiles can represent any letter.

When a player places a blank tile, they must select the letter it represents.

Once the blank has been committed to the board, its represented letter remains fixed for the rest of the game.

A blank tile has zero points.

The represented letter is used when:

- Determining words
- Validating words
- Calculating crossing words
- Calculating scores

The blank itself still contributes zero points even when it represents a high-value letter.

The UI must make it clear which letter a blank tile represents.

---

## 21. Scoring: basic letter values

Each letter has the point value specified by the Swedish Alfapet tile set.

The score of a word is calculated from the point values of its letters.

Blank tiles contribute zero points.

Special scoring squares modify the score of newly placed tiles according to the rules below.

---

## 22. Letter multipliers

When a newly placed letter covers a letter-scoring square:

- Letter ×2 doubles that tile's value.
- Letter ×3 triples that tile's value.
- Letter ×4 quadruples that tile's value.
- Letter ×−2 doubles the tile's value and subtracts that amount from the word's other letter points according to the Alfapet scoring rule.

Letter multipliers only apply when a tile is newly placed on the corresponding square.

A tile already present on the board does not activate the square again.

---

## 23. Word multipliers

After calculating the applicable letter points, word multipliers are applied.

- Word ×2 doubles the word score.
- Word ×3 triples the word score.
- Word ×4 quadruples the word score.

Word multipliers only apply when the corresponding square is covered by a newly placed tile.

A previously covered multiplier square cannot be reused.

---

## 24. Multiple words and shared tiles

If a newly placed tile belongs to two words, its points are counted in both words.

This includes a tile placed on a letter multiplier or negative letter multiplier square.

Each newly formed word is scored independently according to the applicable letter and word multipliers.

The total score for the move is the sum of all newly formed word scores.

---

## 25. All-tiles bonus

If a player places all tiles currently on their rack in one word move, they receive an additional bonus.

The bonus depends on the selected rack size:

- 6 tiles → 40 points
- 7 tiles → 50 points
- 8 tiles → 60 points

The bonus is added after all normal letter, word, and negative scoring has been calculated.

The bonus is only awarded when the player actually places the complete rack in one word move.

For example, if a player has only two tiles remaining near the end of a game while playing with a seven-tile rack, placing those two tiles does not qualify for the seven-tile bonus.

---

## 26. Tile exchange

A player may exchange one or more tiles from their rack.

The player:

1. Selects the tiles to exchange.
2. Returns them to the tile bag.
3. The bag is shuffled.
4. The player draws the same number of replacement tiles.

An exchange counts as the player's turn.

The player does not place a word during an exchange.

The implementation must enforce the physical game's constraints concerning whether enough tiles remain to perform an exchange.

---

## 27. Passing

A player may pass instead of playing a word.

Passing counts as a turn.

A player may pass even when they could legally play a word.

The game tracks consecutive passes for the end-game rule.

The exact handling of consecutive passes is specified in the end-game section.

---

## 28. Tiles cannot normally be moved after a completed turn

Once a move has been committed:

- Its tiles are fixed.
- The player cannot move them.
- The opponent cannot move them.
- Scoring squares affected by those tiles are permanently considered used.

The only exception is an uncommitted proposed move that has been rejected by the opponent. Such newly placed tiles remain editable by the original player until they commit a new move.

---

## 29. Game end

The standard Alfapet rules specify that the game can end when:

1. There are no letter tiles left in the bag.
2. No player can place any new words.
3. All players have passed twice in succession.

The implementation must model these conditions explicitly.

Because this is a two-player game, the consecutive-pass condition means both players have passed in succession for two rounds.

The exact interaction between an empty tile bag and the player who has just emptied their rack must follow the chosen Alfapet rule interpretation and be represented consistently in the implementation.

---

## 30. Final scoring

When the game ends, each player's remaining rack tiles are valued.

The point value of the tiles remaining on a player's rack is deducted from that player's final score.

The player with the highest final score wins.

The final score calculation must be deterministic and recorded as part of the completed game state.

---

## 31. Turn lifecycle

A normal turn follows this conceptual lifecycle:

    Player turn
        ↓
    Player creates placement
        ↓
    Game validates physical placement
        ↓
    Game identifies all newly formed words
        ↓
    Dictionary validation
        ↓
    ┌───────────────────────────────┐
    │ All words accepted normally?  │
    └───────────────┬───────────────┘
                    │
             Yes    │    No
              ↓    │     ↓
        Commit move │ Player decides
              │     │ whether to propose
              │     │ unknown words
              │     ↓
              │   ┌─────────┐
              │   │ Propose │
              │   └────┬────┘
              │        ↓
              │   Opponent review
              │      ↙     ↘
              │  Reject     Accept
              │    ↓          ↓
              │  Return     Commit
              │  to player    move
              ↓
        Calculate score
              ↓
        Draw replacement tiles
              ↓
        Next player's turn

A proposed move must not be treated as a completed turn until it has been accepted.

---

## 32. Separation between physical legality and dictionary legality

The game must distinguish between:

### Physical/game-rule validity

Examples:
- Correct orientation
- Correct connection to the existing board
- Correct use of rack tiles
- No illegal gaps
- Centre square used on first move
- All newly created words identified correctly

and:

### Dictionary validity

Examples:
- Word exists in the configured Swedish dictionary.
- Word is not classified as a proper name (DEC-007: this makes the word `UNKNOWN_WORD`, not a hard block).
- Word is not classified as a non-standard abbreviation (DEC-007: likewise `UNKNOWN_WORD`).
- Word is not a one-letter word (this remains `FORBIDDEN_WORD`).

A move that is physically legal but contains an unknown or non-standard-category dictionary word can enter the custom opponent-approval flow.

A move that is physically illegal cannot be rescued by opponent approval.

Opponent approval does not override board-placement rules.

---

## 33. Future extensibility

Although the first implementation is Swedish-only, the rules should be represented so that language/game configuration can eventually be changed.

A future language/game configuration may define:

- Language
- Dictionary
- Tile distribution
- Tile values
- Board
- Word rules
- Language-specific exceptions

The core engine should not contain Swedish-specific assumptions unless those assumptions are part of the configured Swedish rule set.

---

## 34. Rule authority and unresolved verification

This document deliberately distinguishes between rules that are established by the supplied Alfapet reference and data that must be verified from the physical Swedish Alfapet game before implementation.

**Resolved by interim substitution (see [DEC-001](decisions.md)), not by verification against the physical Alfapet game:**

- Exact board dimensions and placement of every special square — using the standard Scrabble board instead (section 3).
- Complete tile distribution, exact point value of every letter, and number of blank tiles — using the standard Swedish Scrabble tile set instead (section 4).

These may be replaced with verified Alfapet data later; see DEC-001's revisit condition.

**Still genuinely unresolved and must be verified before the corresponding code is finalized:**

- Whether any special tiles (black/stop tiles, arrow tiles) are part of the base game or optional variants. (Current default: excluded from Version 1, per section 2's "if optional special tiles are not supported... they must not be included.")
- Exact constraints on exchanging tiles when the bag is nearly empty.
- Exact end-game interpretation where the bag becomes empty.
- Any other physical-game detail not explicitly established by the reference.

Do not fill these remaining values in by assuming the equivalent Scrabble values or board without the same kind of explicit project-owner decision recorded in DEC-001.

The verified/decided values should be stored as explicit game configuration and tested.

---

## 35. Reference

Primary rule reference supplied for this project:

SpelRegler — “Alfapet regler”, described on the page as the official Alfapet rules from Alga:

https://www.spelregler.org/alfapet-regler/

The source states, among other things, the 6/7/8-tile setup, centre-square opening, horizontal/vertical placement, multiple words per move, letter and word multipliers, the −2 letter squares, all-tiles bonuses, blank-tile behaviour, exchange/pass rules, word restrictions, and game-ending/final-scoring rules.

The project specification intentionally adds the custom opponent-approval mechanism for words not found in the dictionary.
