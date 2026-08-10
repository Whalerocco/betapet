# Vision

## Project overview

This project is a Swedish word-board game inspired by Alfapet.

The initial game should follow the Swedish Alfapet rules while introducing one important variation:

> A word that is not found in the dictionary may still be played if the player proposes it and the opponent accepts it.

The long-term goal is a polished web game that supports online multiplayer, friends, chat, persistent games, and additional languages.

The first version should deliberately remain small: two people should be able to play a complete game on the same device.

---

## Product vision

Create a word game that combines the familiar rules and strategy of Alfapet with a social element where players can decide whether unusual or unknown words are acceptable.

The game should feel like a proper digital board game rather than a technical demonstration.

The core experience should be:

1. Draw tiles.
2. Build words on the board.
3. Score points according to Alfapet rules.
4. Submit a move.
5. If every word is in the dictionary, the move proceeds normally.
6. If one or more words are not in the dictionary, the player may propose the complete move anyway.
7. The opponent decides whether to accept or reject the proposed move.
8. If accepted, the move is committed and the player receives the normal score.
9. If rejected, the newly placed tiles remain available on the board and the original player gets their turn back so they can modify the move.
10. An accepted non-dictionary word becomes valid for the remainder of that game.

---

## Initial product: Version 1

The first release should be a complete, playable local web game.

### Players

- Exactly two players.
- Both players use the same device.
- The game uses a hot-seat model.
- A player's rack must be hidden from the other player.
- The interface explicitly hands the device from one player to the other between turns.

### Language

- Swedish only.
- Swedish Alfapet letter distribution and scores.
- A Swedish dictionary/word list is used for normal dictionary validation.
- The architecture must allow additional languages to be added later without rewriting the game engine.

### Game rules

The initial version follows the Swedish Alfapet rules specified in `docs/game-rules.md`.

This includes the standard:
- Board
- Special squares
- Tile distribution
- Letter values
- Rack size
- Placement rules
- Word formation
- Scoring
- Bonuses
- Blank tiles
- Passing
- Tile exchange
- End-game rules
- Final scoring

The game should not silently substitute Scrabble rules for Alfapet rules.

### Dictionary behaviour

The dictionary is used to determine whether a word is normally recognized.

The following are important distinctions:

- A dictionary word is automatically accepted if the move is otherwise legal.
- A word absent from the dictionary is not automatically forbidden.
- A player may choose to propose a non-dictionary word.
- The opponent accepts or rejects the entire proposed move.
- If accepted, the word receives normal scoring.
- An accepted non-dictionary word becomes valid for the remainder of the current game.
- A dictionary word cannot be deliberately treated as a non-dictionary word.

The detailed definition of valid and invalid Swedish words is specified in `docs/dictionary.md`.

---

## The distinctive game mechanic

The non-dictionary-word system is a central feature of the game and should be treated as part of the core game rules rather than as a UI convenience.

### Example

Player 1 creates:

> GRÖMP

The dictionary does not contain the word.

The game tells Player 1:

> GRÖMP is not in the dictionary. Do you want to play it anyway?

If Player 1 chooses to continue, control passes to the opponent for a decision.

The opponent sees:

> Your opponent wants to play GRÖMP.
>
> The word is not in the dictionary.
>
> Accept or reject?

### Accepted

If the opponent accepts:

- The move is committed.
- The player receives the normal score.
- GRÖMP is added to the game's accepted vocabulary.
- GRÖMP is considered valid for the rest of that game.
- The turn proceeds normally.

### Rejected

If the opponent rejects:

- The move is not committed as a completed turn.
- The newly placed letters remain available on the board.
- The original player gets their turn back.
- They may remove or reposition their newly placed tiles as permitted by the game interface.
- They may submit a modified move or otherwise complete their turn according to the normal rules.

The opponent approves or rejects the complete proposed move as one unit. They do not vote separately on individual words created by the move.

---

## Design principles

### 1. Rules first

The game should implement explicit, testable rules rather than relying on UI behaviour.

Game rules belong in the game engine and its supporting configuration/data.

### 2. Engine independent of UI

The core game engine must not depend on React, browser APIs, DOM elements, or visual components.

This allows the same engine to support:

- Local play
- Future online multiplayer
- Automated tests
- Potential future clients

### 3. Local first

Do not build the online multiplayer system before the local game is complete and enjoyable.

The first milestone is a complete game on one device.

### 4. Future-proof, not over-engineered

The architecture should allow future multiplayer and additional languages, but the first implementation should not contain unnecessary infrastructure for features that do not yet exist.

### 5. Explicit game state

Game state should be represented explicitly and be serializable.

This is important for:
- Saving local games
- Testing
- Replaying games
- Future online synchronization
- Server-authoritative multiplayer

### 6. Test the rules

The game engine should have automated tests for the rules, particularly the unusual proposed-word mechanic.

The game should be able to prove through tests that:
- Valid moves are accepted.
- Invalid placements are rejected.
- All words created by a move are detected.
- Unknown words trigger the proposal flow.
- Accepted unknown words are committed and scored normally.
- Accepted unknown words remain valid later in the same game.
- Rejected moves return control to the original player.
- Rejected moves do not incorrectly award points or consume a completed turn.

---

## Long-term product

Once the local version is stable, the game can evolve into a full online multiplayer website.

Potential features include:

### Accounts

- User registration
- Login
- Profiles
- Game history

### Multiplayer

- Create a match
- Invite another player
- Friend list
- Active games
- Turn notifications
- Reconnection
- Persistent game state

### Social features

- In-game chat
- Friends
- Rematch
- Game history
- Player statistics

### Languages

The architecture should eventually support:

- Swedish
- English
- Other languages

Each language should be able to define its own:
- Dictionary
- Letter set
- Tile distribution
- Tile values
- Language-specific word rules

The game engine should remain largely language-independent.

---

## Non-goals for Version 1

The following are deliberately outside the scope of the initial implementation:

- Online multiplayer
- User accounts
- Authentication
- Friends
- Matchmaking
- Online game invitations
- Chat
- Notifications
- Player statistics
- Multiple languages
- Payments or monetization
- Public leaderboards

These may be considered later once the local game is complete.

---

## Success criteria for Version 1

Version 1 is successful when two people can sit down with one computer and play a complete Swedish Alfapet game from beginning to end without needing to manually intervene in the game state.

A successful game should:

- Correctly implement the Swedish Alfapet rules.
- Correctly handle Swedish tiles and scoring.
- Correctly validate word placement.
- Correctly identify all words created by a move.
- Correctly identify dictionary and non-dictionary words.
- Support the proposed-word mechanism.
- Allow the opponent to accept or reject a proposed move.
- Keep rejected tiles available for the original player to edit.
- Remember accepted non-dictionary words for the current game.
- Correctly calculate scores and bonuses.
- Correctly handle blank tiles.
- Correctly handle passing and tile exchange.
- Correctly detect the end of the game and calculate final scores.
- Keep each player's rack hidden during the other player's turn.
- Persist the local game sufficiently to avoid losing an ongoing game through an accidental page refresh.
- Have automated tests covering the important game rules.

Most importantly, the game should already feel like a complete game even though it is only local.

---

## Development philosophy

Build the project in small, verifiable steps.

At each stage:

1. Define the behaviour.
2. Implement it in the appropriate layer.
3. Add automated tests.
4. Verify the UI if applicable.
5. Keep the documentation synchronized.
6. Only then move to the next feature.

Do not allow the future online version to distract from making the local version excellent.

The first goal is simple:

> **Make two people want to play another game.**
