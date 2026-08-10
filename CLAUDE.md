# CLAUDE.md

## Project

This repository contains a Swedish Alfapet-inspired word-board game that will initially run as a local hot-seat web game and later evolve into an online multiplayer game.

The distinctive game mechanic is that words not found in the configured dictionary may still be played if the player proposes them and the opponent accepts them.

The initial version supports:
- Swedish only
- Two players sharing one device
- Hot-seat play with hidden racks
- The standard Swedish Alfapet rules
- Swedish Alfapet tile distribution and scoring
- Blank tiles
- Swedish dictionary validation
- Opponent approval of non-dictionary words
- Accepted non-dictionary words becoming valid for the remainder of the current game

The long-term version may add online multiplayer, accounts, friends, chat, persistent games, and additional languages.

## Source of truth

Before implementing or changing game behaviour, read the relevant files in `docs/`.

The authority hierarchy is:

1. `docs/game-rules.md` — authoritative game rules
2. `docs/game-engine.md` — authoritative description of game-engine behaviour and state
3. `docs/dictionary.md` — authoritative dictionary and word-validity rules
4. Other `docs/` files — architecture, UI, roadmap, and implementation guidance
5. Source code — implementation of the above specifications

Do not invent game rules when the specification is silent. If an implementation decision could affect gameplay, stop and identify the ambiguity rather than silently choosing a rule.

## Core architectural principles

### Keep the game engine independent

The game rules and game engine must be independent of the web UI.

The engine should not depend on React, browser APIs, DOM elements, or UI state.

The intended separation is:

    Web UI
       ↓
    Application/game controller
       ↓
    Game engine
       ↓
    Rules, board, tiles, dictionary, scoring

This is required because the same engine should eventually support both local and online multiplayer.

### Model the game as state and actions

Prefer explicit game state and well-defined actions over scattered mutable UI state.

Examples of game actions include:
- Start game
- Place tile
- Remove tile
- Submit move
- Confirm proposed unknown word
- Accept proposed move
- Reject proposed move
- Commit move
- Pass
- Exchange tiles
- End game

A move should be processed by the game engine and produce a new valid game state.

### Separate proposed and committed moves

A submitted move is not necessarily immediately committed.

This is especially important for non-dictionary words:

    Player creates move
        ↓
    Move is validated
        ↓
    Unknown word found
        ↓
    Player confirms they want to propose it
        ↓
    Opponent accepts or rejects
        ↓
    Accept → commit move
    Reject → return control to original player

When a proposed move is rejected, the newly placed tiles remain available on the board for the original player to modify or remove. They have not been committed as a completed turn.

## Initial game rules

The first version follows the Swedish Alfapet rules specified in `docs/game-rules.md`.

Do not substitute generic Scrabble rules for Alfapet rules, with one tracked exception: the board layout and tile distribution currently use the standard Scrabble board and Swedish Scrabble tile set as an interim substitute, per `docs/decisions.md` DEC-001, because the real Alfapet data could not be verified. Turn structure, scoring formulas, the word-approval flow, and all other rules remain Alfapet-derived. Do not extend this exception to any other rule without the same kind of explicit project-owner decision.

Important known rules include:
- The first move must cover the centre square.
- Subsequent moves must connect to existing tiles.
- A move may create multiple words.
- All newly formed words must be considered when validating a move.
- Letter and word multiplier squares only apply when covered for the first time.
- Blank tiles have zero points and permanently represent the chosen letter.
- Players may exchange one or more tiles instead of playing a word.
- Passing is allowed.
- The game-ending rules and final scoring follow the specified Alfapet rules.
- The player receives the same number of replacement tiles as tiles played/exchanged, up to the chosen rack size.

The exact board, tile distribution, scoring, special squares, rack size, bonuses, and end-game behaviour must be taken from the project specification rather than guessed.

## Word validation

The initial language is Swedish.

Normal dictionary validity and game validity are separate concepts.

A word that is not in the dictionary is not automatically impossible to play. Instead:

1. The game reports that the word is not in the dictionary.
2. The player may choose to propose it anyway.
3. The opponent may accept or reject the entire move.
4. If accepted, the move receives normal scoring.
5. The accepted non-dictionary word becomes valid for the remainder of that game.
6. If rejected, the move is not committed and control returns to the original player.

A move containing several newly formed words is treated as one unit for opponent approval. The opponent does not approve individual words separately.

Dictionary rules concerning proper names, geographical names, abbreviations, allowed grammatical forms, and exceptions are specified in `docs/dictionary.md`.

A dictionary word cannot be deliberately submitted through the unknown-word approval mechanism.

## Hot-seat privacy

The first version is played by two players on the same device.

The UI must prevent one player from seeing the other player's rack.

At the end of a turn, the game should enter an explicit handoff state before revealing the next player's information.

For example:

    Player 1's turn is complete.

    Pass the device to Player 2.

    [Continue]

Only after continuing should Player 2's rack and relevant private information be shown.

The same principle applies when the opponent needs to approve a proposed unknown word.

## Technology

Use the technology specified in `docs/tech-stack.md`.

Do not introduce a different framework, database, state-management system, or major dependency without a clear reason and explicit approval.

Prefer a small number of well-maintained dependencies.

## Testing

Game rules are high priority and should be covered by automated tests.

When implementing game-engine functionality:
- Add tests for normal behaviour.
- Add tests for invalid moves.
- Add tests for edge cases.
- Add regression tests for discovered bugs.
- Test the unknown-word approval flow explicitly.
- Test that rejected proposed moves return control to the original player without committing the move.
- Test that accepted unknown words become valid for the remainder of the game.
- Test scoring independently from UI behaviour.

Do not rely solely on manual browser testing for game rules.

## Development approach

Build incrementally.

The initial goal is a complete, playable local game — not the online version.

Do not implement accounts, friends, chat, matchmaking, or online multiplayer until the roadmap explicitly calls for them.

Do not prematurely build infrastructure for future features if it makes the initial implementation substantially more complicated.

At the same time, avoid architectural decisions that would make the eventual online version require rewriting the game engine.

## Code quality

Prefer:
- Clear TypeScript types
- Small, focused functions
- Explicit game-state transitions
- Pure functions for game rules where practical
- Deterministic behaviour where possible
- Descriptive names
- Automated tests
- Simple abstractions

Avoid:
- Hidden global state
- Duplicating game rules in UI components
- Magic numbers for tile values or board rules
- UI components directly implementing game rules
- Unnecessary abstractions
- Large functions that combine UI, validation, scoring, and state mutation

## Working with specifications

When a task refers to a document in `docs/`, read that document before implementing the task.

If source code conflicts with the specification, assume the specification is correct unless the task explicitly asks to change the specification.

If the specification itself appears inconsistent, identify the inconsistency before changing code.

Keep documentation and implementation synchronized when a deliberate specification change is made.

## Git and scope

Keep changes focused on the current task.

Do not make unrelated refactors simply because they are possible.

Do not remove working functionality without a reason.

Before considering a task complete:
1. Run the relevant tests.
2. Check the application for obvious runtime errors.
3. Review the changed files.
4. Confirm that the implementation matches the relevant specification.
5. Report any assumptions or unresolved issues.

## Future multiplayer

Online multiplayer is a future phase.

When implementing the local version, keep in mind that eventually:
- The server should be authoritative over online game state.
- Clients should send game actions rather than directly modifying authoritative state.
- Game state should be serializable.
- Turn transitions should be explicit.
- Proposed unknown-word moves and opponent approval must be representable as persistent game states.

Do not implement the online infrastructure yet unless explicitly instructed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
