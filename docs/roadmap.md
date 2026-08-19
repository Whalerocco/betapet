# Roadmap

## 1. Purpose

This document defines the recommended implementation order for the game.

The roadmap is designed for Claude Code to work incrementally, with a playable and testable result at the end of each major phase.

The central strategy is:

> Build and verify the game rules first, then the local playable product, and only then add online infrastructure.

Do not jump ahead to online multiplayer before the local game is stable.

---

# 2. Product milestones

The project is divided into these major milestones:

```text
Milestone 0 — Project foundation
Milestone 1 — Core game engine
Milestone 2 — Dictionary and word rules
Milestone 3 — Complete local gameplay
Milestone 4 — Polished local web game
Milestone 5 — Online foundation
Milestone 6 — Online multiplayer
Milestone 7 — Friends, chat, and notifications
Milestone 8 — Additional languages and future expansion
```

Version 1 ends after Milestone 4.

---

# 3. Milestone 0 — Project foundation

## Goal

Create a clean project skeleton without implementing large amounts of gameplay prematurely.

## Work

Set up:

- Next.js
- TypeScript
- React
- CSS Modules
- ESLint
- Prettier
- Vitest
- React Testing Library
- Playwright
- npm scripts
- Git repository structure

Create the high-level source folders described in `tech-stack.md`.

For example:

```text
src/
├── app/
├── components/
├── game/
├── application/
└── data/
```

## Also establish

- Strict TypeScript configuration where practical
- Basic CI
- Test commands
- Build command
- Formatting/linting conventions

## Do not yet build

- Authentication
- Database
- Supabase
- Friends
- Chat
- Online multiplayer

## Exit criteria

Milestone 0 is complete when:

- The app starts locally.
- TypeScript compiles.
- Tests can run.
- Linting works.
- Production build succeeds.
- CI can execute the basic quality checks.

---

# 4. Milestone 1 — Core domain model

## Goal

Represent a complete game in pure TypeScript.

Implement the concepts from `content-model.md`.

## Initial types/concepts

Implement:

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
- Turn state
- Game result
- Structured history

## Important constraints

The model must remain independent of React.

Do not import browser APIs into the game domain.

## Tests

Add tests for important invariants:

```text
A tile cannot exist in two locations.
```

```text
Player IDs are unique.
```

```text
Tile IDs are unique.
```

```text
Only one pending move exists.
```

```text
Committed board cells cannot contain multiple tiles.
```

## Exit criteria

A complete game state can be created, serialized conceptually, and inspected in tests.

---

# 5. Milestone 1.1 — Verified Swedish configuration

## Goal

Encode the actual Swedish Alfapet game configuration.

This is an accuracy-critical task.

Verify rather than assume:

- Board dimensions
- Multiplier positions
- Tile distribution
- Tile values
- Blank tiles
- Rack-size choices
- All-tiles bonuses
- Starting-player rule
- Tile-exchange rules
- End-game rules
- Final scoring

Use the documented Alfapet rules and other reliable references where needed.

Do not substitute Scrabble values or board layout.

## Deliverables

Create structured configuration data for:

```text
Swedish board
Swedish tile set
Swedish scoring/rules configuration
```

## Tests

Test:

- Total tile count
- Count per letter
- Point values
- Board dimensions
- Known multiplier coordinates
- Rack bonuses

## Exit criteria

The engine can initialize a game from verified Swedish configuration without hard-coded rule values scattered through the code.

---

# 6. Milestone 1.2 — Tile bag and game setup

## Goal

Start a real game.

Implement:

- Tile creation
- Shuffle
- Initial draw
- Rack creation
- Starting player
- Rack-size configuration

## Deterministic testing

Randomness should be injectable or controllable in tests.

Tests should be able to use a known tile order.

This is important for repeatable engine tests.

## Exit criteria

A two-player game can be initialized deterministically in tests and randomly in normal use.

---

# 7. Milestone 1.3 — Pending tile placement

## Goal

Allow the engine to represent an editable move.

Implement actions for:

- Place tile
- Move pending tile
- Remove pending tile
- Assign blank letter
- Change pending blank letter

## Validate basic ownership

Prevent:

- Using opponent tiles
- Moving committed tiles
- Placing two tiles on the same occupied square
- Using one physical tile twice

## Exit criteria

Tests can construct and edit pending board placements safely.

---

# 8. Milestone 1.4 — Physical move validation

## Goal

Implement Alfapet placement rules independently of dictionary validity.

Validate:

- Alignment
- Gaps
- Board boundaries
- Existing tile collisions
- Connection rules
- First-move requirements
- Other physical rules defined in `game-rules.md`

## Important architecture

Keep physical validation separate from word validation.

Conceptually:

```text
placement
    ↓
physical validation
    ↓
word detection
    ↓
word validation
```

## Tests

Cover:

- Valid first move
- Invalid first move
- Horizontal move
- Vertical move
- Disconnected move
- Illegal gap
- Collision
- Extension of existing word
- Crossing move

## Exit criteria

The engine can reliably decide whether a tile placement is physically legal.

---

# 9. Milestone 1.5 — Word detection

## Goal

Given:

```text
committed board
+
pending placement
```

derive every newly formed word.

Implement:

- Main word detection
- Crossing-word detection
- Horizontal/vertical traversal
- Blank represented letters

## Tests

Use small explicit board states.

Verify cases such as:

```text
one main word
```

```text
main word + one crossing word
```

```text
main word + several crossing words
```

```text
extension of existing word
```

```text
single placed tile creating words in both directions
```

## Exit criteria

The engine derives words from board state rather than accepting client-supplied word strings.

---

# 10. Milestone 1.6 — Scoring

## Goal

Implement Swedish Alfapet scoring.

Scoring must use the verified configuration.

Implement:

- Tile point values
- Letter multipliers
- Word multipliers
- Negative multipliers if present in the verified board/rules
- Multiple words from one placement
- Blank = zero points
- Multiplier activation only for newly placed tiles
- All-tiles bonus according to rack size

## Tests

Create explicit scoring examples.

Include:

- Plain word
- Letter multiplier
- Word multiplier
- Crossing words
- Blank
- Multiple multipliers
- All-rack bonus

## Exit criteria

A valid placement can produce a deterministic `ScoreResult`.

---

# 11. Milestone 2 — Dictionary foundation

## Goal

Add Swedish word lookup without external runtime APIs.

Follow `dictionary.md`.

## Work

Select and document the dictionary source.

Verify:

- Licensing
- Swedish coverage
- Distribution requirements
- Update process

Build a preprocessing pipeline.

Conceptually:

```text
source data
    ↓
normalization
    ↓
filter/transform
    ↓
runtime lookup data
```

## Exit criteria

The application can efficiently determine whether a normalized Swedish word exists in the configured dictionary.

---

# 12. Milestone 2.1 — Word normalization

## Goal

Implement one canonical normalization path.

Handle:

- Case
- Swedish Å/Ä/Ö
- Unicode normalization
- Dictionary representation

The same normalization must be used for:

- Dictionary lookup
- Accepted vocabulary
- Explicit exceptions
- Forbidden-word handling

## Tests

Include:

```text
lowercase/uppercase equivalence
```

```text
Å Ä Ö
```

```text
Unicode-equivalent strings
```

## Exit criteria

Equivalent valid input forms map to one canonical lookup representation.

---

# 13. Milestone 2.2 — Word classification

## Goal

Implement the classifications defined in `dictionary.md`.

At minimum:

```text
DICTIONARY_WORD
ACCEPTED_IN_GAME
UNKNOWN_WORD
FORBIDDEN_WORD
```

Implement agreed rules concerning:

- Names
- Place names
- Countries
- Months
- Weekdays
- Abbreviations
- Explicit abbreviation exceptions
- Normal grammatical forms

Do not silently convert every missing dictionary entry into forbidden.

The unknown-word category is essential.

## Exit criteria

Every formed word receives a structured classification.

---

# 14. Milestone 2.3 — Accepted vocabulary

## Goal

Implement per-game accepted vocabulary.

When an unknown word is accepted by the opponent:

```text
word
    ↓
normalized
    ↓
stored for this game
```

Future uses in the same game return:

```text
ACCEPTED_IN_GAME
```

## Tests

Verify:

```text
accepted word valid later
```

```text
acceptance does not modify global dictionary
```

```text
acceptance in Game A does not affect Game B
```

## Exit criteria

Per-game vocabulary behaves deterministically.

---

# 15. Milestone 2.4 — Complete normal move pipeline

## Goal

Connect:

```text
pending placement
→ physical validation
→ word detection
→ word classification
→ scoring
→ commit
```

Implement the normal dictionary-valid path from `examples/normal-move-example.md`.

## Atomic commit

A successful commit should update all relevant state in one engine transition:

- Board
- Rack
- Score
- Tile bag
- History
- Turn
- Pass counters
- Game-end state

## Exit criteria

A complete normal game turn can be executed entirely in engine tests.

---

# 16. Milestone 2.5 — Disputed-word state machine

## Goal

Implement the defining custom mechanic.

Follow `examples/disputed-word-example.md`.

Required flow:

```text
SUBMIT
  ↓
UNKNOWN_WORD
  ↓
PROPOSER CONFIRMATION
  ├── edit
  └── play anyway
          ↓
WAITING FOR OPPONENT
     ├── reject
     └── accept
```

## Acceptance

Must:

- Commit whole move
- Score once
- Draw replacements
- Add unknown words to accepted vocabulary
- Advance turn

## Rejection

Must:

- Award no points
- Draw no tiles
- Add no accepted vocabulary
- Preserve pending placement
- Return turn ownership to proposer

## Tests

This milestone requires extensive engine tests.

## Exit criteria

The entire disputed-word flow works without any React/UI dependency.

---

# 17. Milestone 2.6 — Pass, exchange, and game end

## Goal

Complete the engine's turn types.

Implement:

- Pass
- Tile exchange
- Exchange restrictions
- Consecutive-pass/end conditions
- Tile exhaustion conditions
- Final rack deductions
- Winner/tie result

Use verified rules from `game-rules.md`.

## Exit criteria

A complete game can start, progress, and finish entirely through engine actions.

---

# 18. Milestone 3 — Minimal local UI

## Goal

Make the engine playable in the browser before investing heavily in visual polish.

Build:

- Start screen
- Game setup
- Basic board
- Basic rack
- Score display
- Tile selection
- Tile placement
- `Spela`
- `Passa`
- `Byt brickor`

Use simple styling initially.

## Principle

Prefer:

```text
ugly but complete
```

over:

```text
beautiful but rules incomplete
```

at this stage.

## Exit criteria

Two people can play ordinary dictionary-valid turns through the website.

---

# 19. Milestone 3.1 — Blank tile UI

## Goal

Add the blank-letter interaction.

When a blank is placed:

```text
choose represented letter
```

Support:

```text
A–Z Å Ä Ö
```

Allow changing it while pending.

Lock it after commitment.

## Exit criteria

Blank tiles work correctly from UI through engine and scoring.

---

# 20. Milestone 3.2 — Unknown-word UI

## Goal

Expose the disputed-word engine state clearly.

Implement:

- Unknown-word warning
- List of all unknown words in the move
- Score preview
- `Ändra`
- `Spela ändå`

Then implement opponent review:

- Proposed board
- Unknown word(s)
- Score preview
- `Godkänn`
- `Neka`

## Exit criteria

The complete disputed-word mechanic can be played through the browser.

---

# 21. Milestone 3.3 — Hot-seat privacy

## Goal

Make shared-device play practical.

Implement the handoff model from `local-multiplayer.md`.

Required handoffs:

- Normal turn to next player
- Proposer to opponent reviewer
- Reviewer back to proposer after rejection
- Resume after refresh

At handoff boundaries:

```text
no rack is visible
```

## Exit criteria

Players can pass the device without accidentally exposing the next/previous player's rack.

---

# 22. Milestone 3.4 — Local persistence

## Goal

Make refresh/restart recoverable.

Use:

```text
localStorage
```

Persist:

- Game state
- Pending placement
- Awaiting-review state
- Configuration/schema version

On resume:

```text
saved state
    ↓
validate
    ↓
privacy-safe handoff
    ↓
correct player/reviewer
```

## Tests

Cover:

- Refresh during normal turn
- Refresh with pending placement
- Refresh awaiting opponent review
- Refresh after rejection
- Corrupt/incompatible save

## Exit criteria

An accidental refresh does not destroy an ongoing game or expose a rack.

---

# 23. Milestone 3.5 — Game history and game-over UI

## Goal

Complete the local gameplay loop.

Add:

- Structured history presentation
- Accepted-word events
- Pass/exchange events
- Final scoring
- Winner/tie screen
- Start-new-game flow

## Exit criteria

Players can complete an entire game and understand the final result.

---

# 24. Milestone 4 — UI polish

## Goal

Turn the functional local game into a pleasant finished Version 1 product.

Follow `ui-design.md`.

Improve:

- Board layout
- Tile appearance
- Multiplier readability
- Pending-tile styling
- Score hierarchy
- Dialogs
- Handoff screens
- History panel
- Responsive layout

Maintain a clean Scandinavian board-game feel.

## Exit criteria

The game feels intentionally designed rather than like a development prototype.

---

# 25. Milestone 4.1 — Responsive interaction

## Goal

Ensure the game works across realistic devices.

Test:

- Desktop
- Tablet
- Mobile

Prioritize:

- Board readability
- Rack usability
- Touch targets
- No hover-only functionality
- No fixed-desktop assumptions

## Drag-and-drop tile placement

The select-tile-then-select-square interaction (ui-design.md section 11) remains the baseline
and must keep working on its own.

Add drag-and-drop as the optional enhancement anticipated by `ui-design.md` section 11 and
`tech-stack.md` section 37:

- Drag a rack tile directly onto an empty board square.
- Drag a pending tile to another empty square to move it.
- Drag a pending tile back onto the rack to return it.
- Support both mouse and touch pointers.
- Do not require a drag-and-drop library unless native pointer handling becomes unnecessarily
  complex (tech-stack.md section 37).
- Keep the click/tap interaction as a fully working fallback; dragging must not be the only way
  to place, move, or return a tile.

## Exit criteria

The game is comfortable on desktop/tablet and usable on mobile.

Tiles can be placed, moved, and returned either by click/tap or by drag-and-drop.

---

# 26. Milestone 4.2 — Accessibility

## Goal

Improve keyboard and assistive-technology support.

Implement/check:

- Semantic buttons
- Form labels
- Focus visibility
- Keyboard tile selection
- Dialog focus management
- Non-color-only indicators
- Reduced-motion support

## Exit criteria

Core gameplay is usable without a mouse and important state is not communicated only through color.

---

# 27. Milestone 4.3 — End-to-end coverage

## Goal

Protect the major user journeys before declaring local Version 1 complete.

Playwright should cover at least:

### Normal move

```text
start
→ play valid word
→ handoff
→ next player
```

### Unknown accepted

```text
unknown word
→ proposer confirms
→ reviewer accepts
→ move commits
```

### Unknown rejected

```text
unknown word
→ proposer confirms
→ reviewer rejects
→ proposer regains editable placement
```

### Persistence

```text
make progress
→ refresh
→ resume safely
```

### Game completion

```text
game reaches end condition
→ final score shown
```

## Exit criteria

Critical flows pass reliably in automated tests.

---

# 28. Version 1 release gate

Do not move to online multiplayer merely because the UI looks finished.

Version 1 is ready when:

- Swedish configuration is verified.
- Normal rules are tested.
- Dictionary integration works.
- Unknown/forbidden distinction works.
- Disputed-word mechanic works completely.
- Rejected moves remain editable.
- Blanks work.
- Scoring is verified.
- Pass/exchange work.
- Games can finish correctly.
- Hot-seat privacy works.
- Refresh recovery works.
- Core end-to-end tests pass.
- Production build succeeds.

At this point, deploy the local version and test it with real players.

---

# 29. Milestone 4.4 — Real playtesting

## Goal

Use actual games to discover rule/UI problems before building online infrastructure.

Observe:

- Confusing interactions
- Dictionary false negatives
- Forbidden-word classification problems
- Scoring mistakes
- Handoff friction
- Mobile issues
- Slow/common actions
- Disputed-word misunderstandings

Fix core issues before expanding scope.

## Important

Do not respond to every playtest suggestion by adding features.

Prioritize correctness and friction in the existing game.

---

# 29a. Milestone 4.5 — Local game modifiers: Crisscross, Replace, Illegal

## Goal

Add the first optional gameplay modifiers a game can be configured with at setup, without requiring additional language dictionaries or tile sets.

Follow `game-modifiers.md`.

## Modifiers introduced in this milestone

- Crisscross mode — place a connected multi-branch cluster of new tiles in one move.
- Replace mode — place a tile on top of an already-played tile; the displaced tile returns to a rack.
- Illegal mode — only non-dictionary words may be played, still subject to opponent approval.

## Also implement

- A settings/game-setup UI section for selecting modifiers before starting a game.
- `GameConfiguration.modifiers`, per `content-model.md`.
- Engine-level validation of modifier combinations using the compatibility table in `game-modifiers.md` — this must not be a UI-only check.

Resolved by DEC-008: displaced-tile ownership and blank handling for Replace mode; accepted-word and partial-move handling for Illegal mode.

## Do not yet build

- Polyglot mode.
- Wild mode.
- Non-rule UI/device preferences (see `game-modifiers.md` section 3) — this milestone is scoped to gameplay modifiers only.

## Exit criteria

A local game can be started with any compatible combination of Crisscross, Replace, and Illegal mode. Each modifier's rule changes behave as specified in `game-modifiers.md` and are covered by engine tests, including tests for their interactions where the compatibility table flags one.

---

# 30. Milestone 5 — Online foundation

Only begin after Version 1 is stable.

Follow `online-multiplayer.md`.

## Work

Introduce:

- Backend/database
- Authentication
- User/profile model
- Server-side shared game engine
- Authoritative match persistence
- Player-safe game views
- Match revisions/concurrency handling

Potential stack:

```text
PostgreSQL
Supabase
```

Reevaluate this choice at implementation time.

## Exit criteria

Two authenticated test users can access a server-stored match without exposing hidden state.

---

# 31. Milestone 5.1 — Server action API

## Goal

Move authoritative gameplay transitions to the server.

Implement server actions/endpoints for:

- Create match
- Get match
- Submit normal move
- Pass
- Exchange tiles

The server must:

- Authenticate
- Authorize
- Load state
- Run shared engine
- Persist atomically
- Return player-safe state

## Exit criteria

Normal online turns work correctly without trusting the client.

---

# 32. Milestone 5.2 — Online disputed words

## Goal

Port the custom mechanic to separate devices.

Implement:

```text
unknown detected
→ proposer confirmation
→ persisted review request
→ opponent review
→ accept/reject
```

Support reconnecting while a proposal is unresolved.

## Exit criteria

The complete disputed-word flow works asynchronously across two authenticated users.

---

# 33. Milestone 6 — Match invitations and match list

## Goal

Make online play usable without developer tooling.

Add:

- Invite opponent
- Accept/decline invitation
- Active match list
- `Din tur`
- `Väntar på motståndaren`
- `Ord att granska`
- Finished matches

## Exit criteria

Users can independently create and continue matches through the normal website UI.

---

# 34. Milestone 7 — Friends

## Goal

Add the social relationship layer.

Implement:

- Find user
- Send friend request
- Accept/decline
- Friend list
- Start match with friend

Do not couple friendship logic to the game engine.

## Exit criteria

Users can maintain a friend list and start matches with friends.

---

# 35. Milestone 7.1 — Chat

## Goal

Add basic in-match communication.

Initial chat:

- Text only
- Match participants only
- Persisted
- Chronological

Do not put chat inside `GameState`.

## Exit criteria

Two players can exchange messages within a match.

---

# 36. Milestone 7.2 — Notifications and realtime

## Goal

Make asynchronous play convenient.

Add useful indicators/notifications for:

- Your turn
- Word awaiting review
- Move rejected
- Invitation
- Friend request
- Game completed

Realtime updates may improve responsiveness when both users are online.

Correctness must still rely on persistent server state.

## Exit criteria

Users can tell what requires their attention without repeatedly opening every match.

---

# 37. Milestone 8 — Additional languages

Only begin after Swedish gameplay is mature.

The architecture should allow:

```text
LanguageDefinition
GameConfiguration
Dictionary
Tile set
Board/rules if language-specific
UI translations
```

Potential first addition:

```text
English
```

But do not assume English uses the same:

- Tile distribution
- Point values
- Dictionary
- Word rules
- Board configuration

Each language/ruleset should be explicit.

---

# 37a. Milestone 8.1 — Multi-language game modifiers: Polyglot, Wild

## Goal

Extend the modifier system introduced in Milestone 4.5 with the two modifiers that only make sense once more than one language/dictionary configuration exists.

Follow `game-modifiers.md`.

## Modifiers introduced in this milestone

- Polyglot mode — a word is valid if it exists in any of several selected languages.
- Wild mode — the active validating language rotates every full round.

## Before implementation

Resolve the open questions in `game-modifiers.md` section 11 that apply to these two modifiers (accepted-vocabulary scope for Wild mode, and whether/how Polyglot and Wild can combine). Record the resolution in `decisions.md`, and update the compatibility table in `game-modifiers.md` if the Polyglot/Wild exclusion changes.

## Exit criteria

A local game configured with two or more languages can be started with Polyglot mode, Wild mode, or neither, and their rule changes behave as specified in `game-modifiers.md`. Polyglot and Wild mode remain mutually exclusive unless the corresponding open question has been explicitly resolved.

---

# 38. Future possibilities

Possible later features include:

- Rankings
- Statistics
- Match archive
- Replay
- Spectators
- Tournaments
- Timed modes
- AI opponent
- Native/mobile packaging
- Push notifications
- Personal word statistics
- More languages

These are deliberately outside the current roadmap.

They should not influence Version 1 implementation unless needed to preserve a clean architecture.

---

# 39. Development discipline

Claude should work milestone by milestone.

For each implementation task:

1. Read the relevant specification files.
2. Identify the smallest coherent change.
3. Implement it.
4. Add/update tests.
5. Run relevant tests.
6. Run type checking/linting where appropriate.
7. Fix failures before continuing.
8. Avoid unrelated refactoring.

Do not implement several roadmap phases in one large change unless explicitly requested.

---

# 40. Documentation discipline

If implementation reveals a genuine contradiction or missing rule:

1. Do not silently invent behaviour.
2. Identify the ambiguity.
3. Ask the project owner when it materially affects gameplay.
4. Update the relevant specification after a decision.

Do not continuously redesign the documentation for minor implementation preferences.

The existing plan should remain stable.

---

# 41. Accuracy priorities

When tradeoffs arise, prioritize:

```text
1. Correct game rules
2. Deterministic state transitions
3. Testability
4. Data/privacy boundaries
5. Maintainability
6. User experience
7. Visual polish
8. Extra features
```

Visual polish must not hide incorrect gameplay.

---

# 42. What Claude should not do early

Before Version 1 is complete, do not spend time on:

- Supabase setup
- Authentication
- Database schema
- Friend system
- Chat
- Notifications
- Realtime sockets
- Rankings
- AI
- Internationalization framework
- Complex design system
- Premature optimization

The first objective is a correct, enjoyable local Swedish game.

---

# 43. Recommended first implementation sequence

Once Claude Code begins implementation, the recommended first sequence is:

```text
1. Initialize project/tooling
2. Create domain types
3. Encode verified Swedish configuration
4. Implement deterministic tile bag
5. Implement game initialization
6. Implement pending placement
7. Implement physical move validation
8. Implement word detection
9. Implement scoring
10. Integrate dictionary
11. Implement word classification
12. Implement normal move commit
13. Implement disputed-word state machine
14. Implement pass/exchange/end-game
15. Build minimal UI
16. Add hot-seat handoff
17. Add persistence
18. Add UI polish
19. Add end-to-end tests
20. Playtest
```

This sequence should be preferred over starting with a visually complete board.

---

# 44. Version 1 definition of done

Version 1 is complete when two people can visit the website on one device and:

1. Enter their names.
2. Choose the allowed rack size.
3. Start a Swedish Alfapet-style game.
4. Place and edit tiles.
5. Use blank tiles.
6. Play dictionary-valid words.
7. Receive correct scoring.
8. Attempt unknown words.
9. Confirm they want to propose an unknown-word move.
10. Hand the device to the opponent privately.
11. Have the opponent accept or reject the complete move.
12. Continue editing after rejection without losing the placed tiles.
13. Reuse an accepted unknown word later in the same game.
14. Pass.
15. Exchange tiles.
16. Complete the game under the configured end rules.
17. See final scores and winner/tie.
18. Refresh the browser without losing the game.
19. Play without seeing the opponent's rack during normal hot-seat use.

The product should also have automated coverage for its critical rules and flows.

---

# 45. Roadmap principle

The project should grow in this order:

```text
Correct rules
    ↓
Reliable engine
    ↓
Playable local game
    ↓
Polished local game
    ↓
Real playtesting
    ↓
Server authority
    ↓
Online matches
    ↓
Social features
    ↓
Expansion
```

Do not reverse this order.

The unusual disputed-word mechanic is the core product idea. It should be proven thoroughly in the smallest local version before adding the complexity of accounts, networking, friends, and chat.
