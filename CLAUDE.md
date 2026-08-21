# CLAUDE.md

## Project

This repository contains a Swedish Alfapet-inspired word-board game that will initially run as a local hot-seat web game and later evolve into an online multiplayer game.

The distinctive game mechanic is that words not found in the configured dictionary may still be played if the player proposes them and the opponent accepts them.

The initial version supports:
- Swedish as the base language, with German, French, English, and Spanish dictionaries reachable through the Polyglot and Wild modifiers (see "Word validation" below)
- Two players sharing one device
- Hot-seat play with hidden racks
- The standard Swedish Alfapet rules
- Swedish Alfapet tile distribution and scoring
- Blank tiles
- Dictionary validation in the game's configured language
- Opponent approval of non-dictionary words
- Accepted non-dictionary words becoming valid for the remainder of the current game
- Optional game modifiers selected before the game starts (`docs/game-modifiers.md`)

The long-term version may add online multiplayer, accounts, friends, chat, and persistent games.

## Source of truth

Before implementing or changing game behaviour, read the relevant files in `docs/`.

The authority hierarchy is:

1. `docs/game-rules.md` — authoritative game rules
2. `docs/game-modifiers.md` — authoritative rules for the optional modifiers (Crisscross, Replace, Illegal, Polyglot, Wild). Each modifier is an explicit, opt-in override of a numbered `game-rules.md` section, so for a game that selected it, this document wins over `game-rules.md` on exactly the points it overrides — and nothing else.
3. `docs/game-engine.md` — authoritative description of game-engine behaviour and state
4. `docs/dictionary.md` — authoritative dictionary and word-validity rules
5. `docs/decisions.md` — the decision log. An `ACCEPTED` DEC entry is binding: it records a resolved rule or design question, and later documents are expected to match it. When a DEC entry and a specification file disagree, the disagreement is a bug in one of them — identify it rather than picking a side silently.
6. Other `docs/` files — architecture, UI, roadmap, and implementation guidance
7. Source code — implementation of the above specifications

`docs/known-bugs.md` tracks defects the project owner found in play, including ones whose fix requires a rule correction. Fixed entries are struck through with a dated note naming the fix. A reported bug there is authoritative about the *intended* behaviour even where a specification currently says otherwise — that is how DEC-014 and DEC-015 arose.

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

Do not substitute generic Scrabble rules for Alfapet rules, with one deliberate, permanent exception: the board layout and tile distribution use the standard Scrabble board and Swedish Scrabble tile set, per `docs/decisions.md` DEC-001 and DEC-009. Real Alfapet board/tile data could not be verified after an extensive search (DEC-001), and the project owner has since explicitly decided (DEC-009) to adopt the Scrabble-derived configuration as Betapet's actual Version 1 configuration rather than keep treating it as a temporary placeholder awaiting replacement. Turn structure, scoring formulas, the word-approval flow, and all other rules remain Alfapet-derived. A real Alfapet board/tile configuration may be added later as an additional selectable option (for example a pregame choice), but that addition is not designed or scheduled yet — do not build toward it prematurely. Do not extend this exception to any other rule without the same kind of explicit project-owner decision.

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
- After playing tiles, the player refills the rack up to the chosen rack size, as far as the bag allows. This is not the same as "one drawn per tile played": under Replace mode a displaced tile has already returned to the same rack, so drawing per tile placed would grow the rack past its size.

The exact board, tile distribution, scoring, special squares, rack size, bonuses, and end-game behaviour must be taken from the project specification rather than guessed.

## Word validation

Swedish is the base language, and a game validates against Swedish unless a modifier says otherwise. Dictionaries and word-classification rules also exist for German, French, English, and Spanish; today they are reached only through Polyglot mode, which validates against several selected languages at once, and Wild mode, which rotates the active language every full round (`docs/game-modifiers.md` sections 9-10). Validation code must therefore take its language from the game configuration rather than assuming Swedish. The board and tile set stay the same Swedish-derived configuration regardless of the dictionary language.

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

## Scope

Keep changes focused on the current task.

Do not make unrelated refactors simply because they are possible.

Do not remove working functionality without a reason.

Before considering a task complete:
1. Run the relevant tests.
2. Check the application for obvious runtime errors.
3. Review the changed files.
4. Update the documentation the change affects — the specification file for a deliberate rule change, `docs/decisions.md` for a resolved rule or design question, `docs/known-bugs.md` for a reported bug that is now fixed, `docs/tasks.md` for a completed task.
5. Confirm that the implementation matches the relevant specification.
6. Report any assumptions or unresolved issues.

## Git

Do not commit or push unless asked to. Making the change and committing it are separate steps; finish the work, report it, and wait.

When asked to commit:
- Work on `main` unless told otherwise. This project's history is intentionally linear on `main`, without feature branches.
- Put the code, specification, decision-log, and known-bugs changes for one task in the same commit. A rule fix whose spec update lands in a later commit leaves the repository self-contradictory in between.
- Write a one-line summary naming the area touched, in the style already in the log — for example `Add Polyglot and Wild game modifiers (engine, UI, persistence)` or `Post-playtest fixes: Crisscross connectivity, blank-tile flow, score preview`. Add a body only when the *why* is not obvious from the summary.
- Never push without being asked separately. Being asked to commit is not being asked to push: `origin` is a GitHub remote, and pushing sends the work off this machine.

The Next.js agent-rules block at the end of this file is written and re-added by `next dev`. Commit it along with the rest rather than trying to remove it.

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
