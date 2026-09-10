# Tasks

## 1. Purpose

This file is the implementation checklist for Claude Code.

Use it together with `roadmap.md` and the detailed specification documents. The roadmap defines sequencing and milestones; this file breaks that sequence into concrete tasks.

Claude should:

1. Work from top to bottom unless explicitly instructed otherwise.
2. Complete the smallest coherent task or task group.
3. Add or update tests with implementation changes.
4. Run relevant tests, type checking, linting, and builds.
5. Mark a task complete only when its acceptance criteria are satisfied.
6. Avoid implementing later-phase features early.
7. Ask before inventing gameplay behaviour when the documentation is genuinely ambiguous.

---

# 2. Task status convention

Use:

```text
[ ] Not started
[x] Complete
```

Do not mark a parent section complete until its required child tasks are complete.

---

# 3. Phase 0 — Project foundation

## T0.1 Initialize application

- [x] Create the Next.js application.
- [x] Enable TypeScript.
- [x] Establish the source structure from `tech-stack.md`.
- [x] Confirm the development server runs.

Acceptance:

```text
npm run dev
```

starts the application successfully.

---

## T0.2 Code quality tooling

- [x] Configure ESLint.
- [x] Configure Prettier if required by the selected setup.
- [x] Add useful npm scripts.
- [x] Enable appropriately strict TypeScript settings.

Acceptance:

- Lint command succeeds.
- Type checking succeeds on the initial project.

---

## T0.3 Unit-test tooling

- [x] Configure Vitest.
- [x] Configure React Testing Library.
- [x] Add one trivial passing test to verify setup.

Acceptance:

```text
npm test
```

or the chosen equivalent runs successfully.

---

## T0.4 End-to-end tooling

- [x] Configure Playwright.
- [x] Add a minimal smoke test.

Acceptance:

The smoke test can launch the application and verify the initial page.

---

## T0.5 Continuous integration

- [x] Add a basic CI workflow.
- [x] Run type checking.
- [x] Run linting.
- [x] Run unit tests.
- [x] Run production build.

Do not add deployment complexity unless separately requested.

---

# 4. Phase 1 — Core domain model

## T1.1 Define fundamental IDs and primitives

- [x] Define stable game ID type/pattern.
- [x] Define player ID.
- [x] Define tile ID.
- [x] Define coordinate.
- [x] Define orientation/direction where needed.

Keep domain types independent of React.

---

## T1.2 Define tile model

- [x] Define tile instance.
- [x] Support normal letter tiles.
- [x] Support blank tiles.
- [x] Ensure blank base score is zero.
- [x] Keep represented blank letter separate from physical tile identity.

Tests:

- Normal tile creation.
- Blank tile creation.
- Invalid tile data rejected where applicable.

---

## T1.3 Define board model

- [x] Define board dimensions/configuration.
- [x] Define board cells.
- [x] Define multiplier/special-square representation.
- [x] Define committed board occupancy.
- [x] Prevent more than one committed tile per cell.

---

## T1.4 Define player and rack model

- [x] Define player.
- [x] Define display name.
- [x] Define score.
- [x] Define rack ownership.
- [x] Keep player identity independent of display name.

---

## T1.5 Define tile bag

- [x] Define remaining tile storage.
- [x] Support deterministic ordering in tests.
- [x] Support random shuffle in normal play.
- [x] Implement draw operation.

Tests:

- Drawing reduces bag.
- Cannot draw more physical tiles than exist.
- Deterministic bag produces deterministic draws.

---

## T1.6 Define pending move

- [x] Define pending tile placement.
- [x] Associate pending move with proposing player.
- [x] Support blank represented letters.
- [x] Distinguish pending from committed tiles.
- [x] Define relevant pending-move statuses.

---

## T1.7 Define turn state

Represent mutually exclusive turn situations clearly.

At minimum support concepts equivalent to:

```text
PLAYER_TURN
REQUIRES_PLAYER_CONFIRMATION
WAITING_FOR_OPPONENT_APPROVAL
FINISHED
```

- [x] Define proposing player where relevant.
- [x] Define reviewing player where relevant.
- [x] Avoid relying only on `currentPlayerId` to represent review responsibility.

---

## T1.8 Define game history

- [x] Use structured history events.
- [x] Avoid storing presentation strings as authoritative history.
- [x] Include event ordering/sequence.
- [x] Support normal moves.
- [x] Support pass.
- [x] Support exchange.
- [x] Support unknown-word proposal.
- [x] Support acceptance/rejection.
- [x] Support game completion.

---

## T1.9 Define game result

- [x] Define final player scores.
- [x] Define winner or tie.
- [x] Store any final score adjustments required by rules.
- [x] Ensure active games do not contain completed results.

---

## T1.10 Define complete GameState

- [x] Combine domain concepts into authoritative state.
- [x] Keep UI-only state out.
- [x] Keep local handoff state out.
- [x] Ensure state can be serialized.

Tests should enforce important invariants from `content-model.md`.

---

# 5. Phase 1A — Swedish Alfapet configuration

## T2.1 Verify rule data

Before encoding values, verify the rule data against the sources documented for the project.

Verify:

- [x] Board size.
- [x] Board special-square layout.
- [x] Letter distribution.
- [x] Letter point values.
- [x] Number/value of blank tiles.
- [x] Allowed rack sizes.
- [x] Bonus for using the complete rack.
- [x] Starting-player rule.
- [x] Exchange rule.
- [x] Pass/end conditions.
- [x] Final scoring.

If reliable sources conflict materially, stop and surface the conflict.

The board size/layout, letter distribution, letter point values, and blank-tile count are the
standard Scrabble board and Swedish Scrabble tile set, not real Alfapet data. `decisions.md`
DEC-001 records an extensive, unsuccessful search (~10 sources, including two images that turned
out to depict Scrabble components) for genuine Alfapet data, after which the project owner
instructed Version 1 to use the Scrabble-derived values as an interim substitute. DEC-009 records
the project owner's later decision to stop treating that as interim and adopt it as Betapet's
actual, permanent board/tile configuration instead. These five items are checked because they are
now verified against that adopted reference — the standard Scrabble board and Swedish Scrabble
tile set, cross-checked by the tests in T2.2/T2.3 — not because real Alfapet data was found. A
verified Alfapet board/tile configuration may still be added later as an additional selectable
option (DEC-009's consequences); that is separate future work, not a correction of these items.

---

## T2.2 Encode Swedish tile configuration

- [x] Create data-driven tile definitions.
- [x] Encode every Swedish letter used by the game.
- [x] Encode quantities.
- [x] Encode point values.
- [x] Encode blanks.

Tests:

- Total tile count.
- Quantity per tile type.
- Known point values.
- Blank properties.

---

## T2.3 Encode board configuration

- [x] Encode dimensions.
- [x] Encode all special squares.
- [x] Keep board data separate from board-state occupancy.

Tests:

- Dimensions.
- Selected known coordinates.
- Counts of special-square types where useful.

---

## T2.4 Encode rack configuration

- [x] Support the agreed rack-size options: 6, 7, and 8.
- [x] Encode the correct all-tiles bonus for each supported rack size.
- [x] Avoid scattering these values through engine code.

---

# 6. Phase 1B — Game initialization

## T3.1 Create new game

- [x] Accept two player names.
- [x] Accept rack size.
- [x] Create stable player IDs.
- [x] Create tile instances.
- [x] Shuffle tile bag.
- [x] Draw initial racks.
- [x] Determine starting player according to rules.
- [x] Initialize score/history/turn state.

---

## T3.2 Deterministic initialization tests

- [x] Allow injected/random-seed or deterministic tile order.
- [x] Verify starting racks.
- [x] Verify remaining bag.
- [x] Verify starting-player behaviour.

---

# 7. Phase 1C — Pending placement actions

## T4.1 Place tile

- [x] Only current player can place a rack tile.
- [x] Tile must belong to that player.
- [x] Target must be available.
- [x] Tile becomes pending rather than committed.

---

## T4.2 Move pending tile

- [x] Move a pending tile to another valid empty coordinate.
- [x] Preserve tile identity.
- [x] Do not allow moving committed tiles.

---

## T4.3 Remove pending tile

- [x] Return pending tile to the player's rack.
- [x] Preserve blank identity/behaviour appropriately.

---

## T4.4 Blank selection

- [x] Require a represented letter when a blank is placed.
- [x] Support Swedish alphabet letters required by the game.
- [x] Allow changing represented letter while pending.
- [x] Lock represented letter after commit.

---

## T4.5 Placement invariants

Tests:

- [x] Opponent tile cannot be placed.
- [x] Same tile cannot be placed twice.
- [x] Occupied committed cell cannot be overwritten.
- [x] Two pending tiles cannot occupy one coordinate.
- [x] Committed tile cannot be moved.

---

# 8. Phase 1D — Physical move validation

## T5.1 Validate line alignment

- [x] All newly placed tiles must satisfy the configured same-line rule.
- [x] Reject illegal diagonal/mixed placements.

---

## T5.2 Validate gaps

- [x] Account for committed tiles between newly placed tiles.
- [x] Reject illegal empty gaps.

---

## T5.3 Validate board connection

- [x] Apply first-move connection/start requirements.
- [x] Apply later-move connection requirements.

---

## T5.4 Validate board boundaries and collisions

- [x] Reject out-of-range coordinates.
- [x] Reject illegal collisions.

---

## T5.5 Structured validation errors

Return machine-readable errors.

The UI should translate them into Swedish presentation text.

Do not make the engine depend on UI copy.

---

## T5.6 Physical-validation tests

Add cases for:

- [x] Valid first move.
- [x] Invalid first move.
- [x] Valid horizontal move.
- [x] Valid vertical move.
- [x] Illegal gap.
- [x] Disconnected placement.
- [x] Collision.
- [x] Extension.
- [x] Crossing placement.

---

# 9. Phase 1E — Word detection

## T6.1 Build temporary resulting board

- [x] Overlay pending tiles on committed board for analysis.
- [x] Do not commit during validation.

---

## T6.2 Detect main word

- [x] Detect horizontal main word.
- [x] Detect vertical main word.
- [x] Include adjacent committed tiles.

---

## T6.3 Detect crossing words

- [x] Check perpendicular words for each newly placed tile.
- [x] Ignore non-word single-letter fragments according to the defined rules.
- [x] Avoid duplicate word results.

---

## T6.4 Blank handling

- [x] Use represented blank letter when constructing words.
- [x] Preserve physical blank identity for scoring.

---

## T6.5 Word-detection tests

Cover:

- [x] Main word only.
- [x] Main + one crossing word.
- [x] Main + multiple crossing words.
- [x] Existing-word extension.
- [x] One tile creating words in both directions.
- [x] Blank inside word.

---

# 10. Phase 1F — Scoring

## T7.1 Score normal letters

- [x] Use configured Swedish point values.

---

## T7.2 Score special squares

- [x] Implement all special-square behaviour defined by the verified board.
- [x] Apply a square's effect only when appropriate for newly placed tiles.
- [x] Do not reactivate consumed multipliers for old tiles.

---

## T7.3 Score crossing words

- [x] Score every newly formed word.
- [x] Correctly reuse the newly placed tile in each applicable word calculation.

---

## T7.4 Score blanks

- [x] Blank contributes zero base tile points.
- [x] Represented letter still participates in word construction.

---

## T7.5 Complete-rack bonus

- [x] Apply the correct bonus when all rack tiles are used.
- [x] Respect selected rack size.

---

## T7.6 Score result

Return a structured result containing enough information for:

- Total score
- Per-word score
- Bonus details
- UI explanation/debugging

---

## T7.7 Scoring tests

Cover:

- [x] Plain word.
- [x] Letter multiplier.
- [x] Word multiplier.
- [x] Crossing words.
- [x] Blank.
- [x] Multiple special squares.
- [x] Complete-rack bonus.

Use verified expected values.

---

# 11. Phase 2 — Dictionary

## T8.1 Select Swedish dictionary source

- [x] Choose source.
- [x] Verify license.
- [x] Document attribution/distribution requirements.
- [x] Record dictionary version/source information.

Do not commit a dictionary with incompatible licensing.

---

## T8.2 Build preprocessing pipeline

- [x] Read source data.
- [x] Normalize entries.
- [x] Transform to runtime format.
- [x] Remove unwanted metadata if unnecessary.
- [x] Produce deterministic output.

---

## T8.3 Implement normalization

- [x] Case normalization.
- [x] Unicode normalization.
- [x] Correct Å/Ä/Ö handling.
- [x] Use one shared normalization function.

Tests:

- [x] Upper/lower case.
- [x] Swedish letters.
- [x] Unicode-equivalent strings.

---

## T8.4 Runtime dictionary lookup

- [x] Load dictionary efficiently.
- [x] Support exact normalized membership lookup.
- [x] Avoid network dependency during a local game.

---

# 12. Phase 2A — Word rules

## T9.1 Implement classification API

Return classifications equivalent to:

```text
DICTIONARY_WORD
ACCEPTED_IN_GAME
UNKNOWN_WORD
FORBIDDEN_WORD
```

---

## T9.2 Proper names

- [x] Names are not allowed.
- [x] Place names are not allowed.
- [x] Implement the strategy defined in `dictionary.md`.

Do not assume absence from the dictionary alone proves a word is a name.

---

## T9.3 Allowed categories

Ensure agreed categories can be legal, including:

- [x] Countries.
- [x] Months.
- [x] Weekdays.
- [x] Normal verb conjugations.
- [x] Plurals.

Their exact validity may depend on dictionary/rule data.

---

## T9.4 Abbreviations

- [x] Abbreviations are generally forbidden.
- [x] Support a maintained explicit exception list.
- [x] Keep exceptions data-driven.

---

## T9.5 Forbidden versus unknown tests

Verify:

- [x] Dictionary word → `DICTIONARY_WORD`.
- [x] Accepted game word → `ACCEPTED_IN_GAME`.
- [x] Missing but allowable proposal → `UNKNOWN_WORD`.
- [x] Explicitly forbidden form → `FORBIDDEN_WORD`.

---

# 13. Phase 2B — Accepted vocabulary

## T10.1 Store accepted words per game

- [x] Normalize before storage.
- [x] Scope to one game.
- [x] Preserve useful history metadata without creating conflicting sources of truth.

---

## T10.2 Accepted-word lookup

- [x] Check accepted vocabulary as part of classification.
- [x] Accepted word should not require repeated opponent approval.

---

## T10.3 Isolation tests

- [x] Accepted in Game A does not affect Game B.
- [x] Accepted word does not mutate global dictionary.
- [x] Case differences do not create duplicate accepted entries.

---

# 14. Phase 2C — Normal move pipeline

## T11.1 Submit pending move

Implement the pipeline:

```text
validate action
→ validate placement
→ detect words
→ classify words
→ calculate score
```

Do not mutate committed state during intermediate validation.

---

## T11.2 Commit dictionary-valid move

Atomically:

- [x] Commit pending tiles.
- [x] Apply score.
- [x] Draw replacements.
- [x] Update bag.
- [x] Record history.
- [x] Clear pending move.
- [x] Update pass/end counters.
- [x] Check game end.
- [x] Advance turn if game continues.

---

## T11.3 Normal move tests

Use `examples/normal-move-example.md`.

Verify:

- [x] Score applied once.
- [x] Pending tiles become committed.
- [x] Replacement tiles drawn.
- [x] Bag updated.
- [x] History created.
- [x] Turn advances.
- [x] Accepted vocabulary unchanged.

---

# 15. Phase 2D — Disputed-word mechanic

## T12.1 Detect unknown word in submitted move

- [x] Do not commit.
- [x] Calculate provisional score.
- [x] Store/return all unknown words.
- [x] Enter proposer-confirmation state.

---

## T12.2 Proposer chooses Ändra

- [x] Return to editable placement.
- [x] Preserve pending tiles.
- [x] Do not hand off turn.
- [x] Do not modify score/bag/history as if rejected by opponent.

---

## T12.3 Proposer chooses Spela ändå

- [x] Enter waiting-for-opponent state.
- [x] Identify proposing player.
- [x] Identify reviewing opponent.
- [x] Preserve complete proposed move.
- [x] Do not score or draw yet.

---

## T12.4 Opponent accepts

Atomically:

- [x] Verify correct reviewer.
- [x] Commit entire move.
- [x] Apply score once.
- [x] Draw replacements.
- [x] Add every unknown word in the move to accepted vocabulary.
- [x] Record history.
- [x] Advance normal turn to reviewer/opponent.
- [x] Check game end.

---

## T12.5 Opponent rejects

- [x] Verify correct reviewer.
- [x] Award no points.
- [x] Draw no tiles.
- [x] Add no accepted words.
- [x] Keep proposing player as turn owner.
- [x] Preserve all newly placed tiles as editable pending tiles.

---

## T12.6 Whole-move approval

- [x] Multiple unknown words are presented together.
- [x] Opponent accepts/rejects whole move.
- [x] No per-word partial acceptance.

---

## T12.7 Mixed word classifications

Test:

```text
dictionary + unknown
→ requires approval
```

```text
accepted-in-game + dictionary
→ no approval
```

```text
unknown + forbidden
→ cannot be proposed
```

---

## T12.8 Duplicate/stale action protection

- [x] Double acceptance cannot double-score. `commitMove` clears `pendingMove` and moves
      `turnState` out of `WAITING_FOR_OPPONENT_APPROVAL` as part of the same atomic transition
      that awards the score, so a second `acceptProposedMove` call against the resulting state
      already fails the same `turnState.type` guard used for "wrong player cannot review" below —
      no separate guard was needed, just a test proving it (`disputedWord.test.ts`, "duplicate/
      stale action protection (T12.8)").
- [x] Stale rejection cannot undo committed move. Same guard: once `acceptProposedMove` has
      committed, `turnState` is no longer `WAITING_FOR_OPPONENT_APPROVAL`, so a subsequent
      `rejectProposedMove` against that state is rejected before it can touch the board, score,
      or turn (tested alongside the item above).
- [x] Wrong player cannot review.

---

## T12.9 Full disputed-word tests

Use `examples/disputed-word-example.md` as the reference scenario.

---

# 16. Phase 2E — Other turn actions

## T13.1 Pass

- [x] Implement pass.
- [x] Record history.
- [x] Update relevant consecutive-pass state.
- [x] Advance turn.
- [x] Check end conditions.

---

## T13.2 Tile exchange

- [x] Select rack tiles.
- [x] Validate exchange is permitted.
- [x] Return/exchange tiles according to verified rules.
- [x] Draw replacements correctly.
- [x] Record history.
- [x] Advance turn.

Use deterministic tests.

---

## T13.3 Game end

Implement all verified end conditions.

- [x] Detect game end.
- [x] Calculate final score adjustments.
- [x] Create final result.
- [x] Determine winner/tie.
- [x] Prevent further gameplay actions.

---

# 17. Phase 3 — Local web UI

## T14.1 Start screen

Build the initial game entry screen.

- [x] New local game action.
- [x] Resume saved game when available.

---

## T14.2 Game setup

- [x] Player 1 name.
- [x] Player 2 name.
- [x] Rack size: 6 / 7 / 8.
- [x] Start game.
- [x] Input validation.

Use Swedish UI copy.

---

## T14.3 Board component

- [x] Render complete board.
- [x] Render special squares.
- [x] Render committed tiles.
- [x] Render pending tiles distinctly.
- [x] Support interaction on practical screen sizes.

---

## T14.4 Rack component

- [x] Render active player's rack.
- [x] Render letter values.
- [x] Support selecting tiles.
- [x] Support returning pending tiles.
- [x] Never intentionally render opponent rack in active-player view.

---

## T14.5 Tile placement interaction

- [x] Select rack tile and board square.
- [x] Move pending tile.
- [x] Remove pending tile.
- [x] Make touch interaction usable.

Do not require drag-and-drop as the only interaction.

---

## T14.6 Score/header area

Show:

- [x] Player names.
- [x] Scores.
- [x] Current turn/review status.
- [x] Remaining tile count.

Do not reveal bag contents.

---

## T14.7 Turn actions

Add:

- [x] `Spela`
- [x] `Passa`
- [x] `Byt brickor`

Enable/disable based on meaningful application/engine state.

---

# 18. Phase 3A — Blank tile UI

## T15.1 Blank chooser

When placing a blank:

- [x] Ask which letter it represents.
- [x] Include Swedish Å, Ä, Ö.
- [x] Store choice in pending placement.
- [x] Allow change while pending.

---

## T15.2 Blank rendering

- [x] Clearly display represented letter.
- [x] Preserve visual distinction if useful.
- [x] Do not show normal letter score for blank.

---

# 19. Phase 3B — Validation feedback

## T16.1 Physical validation errors

Map structured engine errors to clear Swedish UI messages.

Examples include:

- Misalignment
- Gap
- Disconnection
- Invalid first move

Keep presentation strings outside the engine.

---

## T16.2 Forbidden-word feedback

- [x] Explain that the move cannot be played.
- [x] Identify relevant forbidden word(s). `submitMove.ts` already reported the word via
      `error.details.word`; `describeGameError` (`errorMessages.ts`) now quotes it into the
      Swedish message (`Ordet "X" är inte tillåtet.`) instead of only showing the generic
      message, with a fallback for the rare case no word is present. `submitMove.ts` blocks the
      whole move on the first forbidden word found, so at most one word is ever reported per
      rejection — a UI list isn't needed.
- [x] Return user to editing.
- [x] Do not offer opponent approval.

---

# 20. Phase 3C — Unknown-word UI

## T17.1 Proposer warning

When unknown words are found:

Show:

- [x] Unknown word(s).
- [x] Explanation that they are absent from the dictionary.
- [x] Provisional score.
- [x] `Ändra`.
- [x] `Spela ändå`.

---

## T17.2 Opponent review screen

Show:

- [x] Proposed board.
- [x] Unknown word(s).
- [x] Proposer name.
- [x] Provisional score.
- [x] `Neka`.
- [x] `Godkänn`.

Do not show either rack during review.

---

## T17.3 Acceptance transition

After approval:

- [x] Explain that move was accepted.
- [x] Indicate whose turn begins.
- [x] Require explicit `Börja tur` before revealing reviewer/new current player's rack.

---

## T17.4 Rejection transition

After rejection:

- [x] Explain that move was rejected.
- [x] Hand device back to proposer.
- [x] Reveal proposer rack only after explicit continuation.
- [x] Restore rejected pending placement for editing.

---

# 21. Phase 3D — Local hot-seat session

## T18.1 Define local session state

Keep it separate from `GameState`.

Support concepts equivalent to:

```text
HANDOFF_TO_TURN
ACTIVE_TURN
HANDOFF_TO_REVIEW
REVIEW
HANDOFF_BACK_AFTER_REJECTION
RESUME_HANDOFF
```

Exact names may differ.

---

## T18.2 Normal handoff

After a completed turn:

- [x] Hide racks.
- [x] Show next player's name.
- [x] Require `Fortsätt`.
- [x] Reveal only next player's rack afterwards.

---

## T18.3 Review handoff

After `Spela ändå`:

- [x] Hide proposer rack.
- [x] Show reviewer handoff.
- [x] Require explicit continuation.
- [x] Open review without showing racks.

---

## T18.4 Privacy tests

Test that the wrong rack is not rendered during:

- [x] Normal handoff.
- [x] Opponent review.
- [x] Rejection handback.
- [x] Resume handoff.

Remember: local privacy is UX privacy, not strong security.

---

# 22. Phase 3E — Persistence

## T19.1 Saved-game schema

Create a versioned wrapper containing:

```text
schemaVersion
configurationVersion
savedAt
gameState
```

---

## T19.2 Save authoritative state

Persist after:

- [x] Game creation.
- [x] Pending placement changes.
- [x] Blank changes.
- [x] Move commit.
- [x] Unknown proposal confirmation.
- [x] Acceptance.
- [x] Rejection.
- [x] Pass.
- [x] Exchange.
- [x] Game end.

---

## T19.3 Load saved game

- [x] Parse safely.
- [x] Validate schema/configuration version.
- [x] Handle corrupt data gracefully.
- [x] Do not reveal rack immediately.

---

## T19.4 Resume normal turn

- [x] Determine correct player from game state.
- [x] Enter neutral handoff.
- [x] Restore pending placement.

---

## T19.5 Resume opponent review

- [x] Determine correct reviewer.
- [x] Enter neutral handoff.
- [x] Restore proposal exactly.

---

## T19.6 Resume after rejection

- [x] Return to proposing player.
- [x] Restore editable rejected placement.

---

## T19.7 New-game overwrite protection

If an unfinished game exists:

- [x] Warn before replacing it.
- [x] Replace only after confirmation.

---

## T19.8 Persistence tests

Cover refresh/reload scenarios described in `local-multiplayer.md`.

---

# 23. Phase 3F — History and final result

## T20.1 Move history UI

Render structured events as Swedish presentation.

Support at least:

- [x] Word move + score.
- [x] Pass.
- [x] Exchange.
- [x] Unknown-word proposal.
- [x] Acceptance.
- [x] Rejection.

---

## T20.2 Game-over screen

Show:

- [x] Final scores.
- [x] Final adjustments.
- [x] Winner or tie.
- [x] New-game action.

---

# 24. Phase 4 — UI polish

## T21.1 Apply final visual direction

Follow `ui-design.md`.

Improve:

- [x] Typography.
- [x] Spacing.
- [x] Board readability.
- [x] Tile appearance.
- [x] Score hierarchy.
- [x] Dialogs.
- [x] Handoff states.
- [x] History.

Do not sacrifice rule clarity for decoration.

---

## T21.2 Responsive design

Test and fix:

- [x] Desktop.
- [x] Tablet.
- [x] Mobile portrait.
- [x] Mobile landscape where practical.

---

## T21.3 Touch usability

- [x] Adequate touch targets.
- [x] No essential hover-only controls.
- [x] Board/rack interaction works without precise mouse input.

---

## T21.4 Accessibility

- [x] Semantic controls.
- [x] Visible keyboard focus.
- [x] Form labels.
- [x] Dialog focus management.
- [x] Keyboard-operable core actions.
- [x] Do not rely only on color.
- [x] Respect reduced-motion preferences where animations exist.

---

## T21.5 Drag-and-drop tile placement

Add drag-and-drop as an enhancement on top of the existing select-tile-then-select-square
interaction (ui-design.md section 11, tech-stack.md section 37).

- [x] Drag a rack tile onto an empty board square to place it.
- [x] Drag a pending tile to another empty square to move it.
- [x] Drag a pending tile back onto the rack to return it.
- [x] Support mouse and touch pointers.
- [x] Keep click/tap-to-place fully working; nothing becomes drag-only.
- [x] Do not introduce a drag-and-drop library unless native pointer handling becomes
      unnecessarily complex.
- [x] The `Board`/`Rack` components still only emit placement intent; the engine/application
      layer keeps deciding legality (ui-design.md section 52-53).

---

# 25. Phase 4A — End-to-end tests

## T22.1 Normal game flow

Automate:

```text
create game
→ start turn
→ play valid move
→ commit
→ handoff
→ next player begins
```

---

## T22.2 Unknown word accepted

Automate:

```text
unknown move
→ proposer confirms
→ review handoff
→ opponent accepts
→ move commits
→ opponent starts turn
```

---

## T22.3 Unknown word rejected

Automate:

```text
unknown move
→ proposer confirms
→ opponent rejects
→ handoff back
→ original pending tiles restored
→ proposer edits
```

---

## T22.4 Refresh recovery

Automate at least:

- [x] Refresh during normal pending move.
- [x] Refresh awaiting review.
- [x] Refresh after rejection.

---

## T22.5 Complete-game scenario

- [x] Drive a deterministic game into an end condition.
- [x] Verify final scoring/result.

---

# 26. Phase 4B — Version 1 release checks

Before declaring Version 1 complete:

- [x] Unit tests pass.
- [x] Integration tests pass. No separate integration-test tool/script is defined anywhere in
      `tech-stack.md`; this project's Vitest suite already includes tests that integrate several
      engine layers together in one run rather than testing a function in isolation — for
      example `submitMove.test.ts` (physical validation → word detection → classification →
      scoring → commit, across the normal, Crisscross, Replace, and Illegal-mode paths),
      `localGameStorage.test.ts`/`page.test.tsx` (setup UI → engine → persistence round-trip),
      and the resume-flow tests under `application/`. Those are what this checklist item refers
      to, and they pass as part of `npm test` (54 files, 411 tests, 2026-08-19).
- [x] End-to-end tests pass.
- [x] Type checking passes.
- [x] Linting passes.
- [x] Production build passes.
- [x] Swedish configuration has been verified, against the Scrabble-derived board/tile
      configuration DEC-009 adopted as Betapet's permanent Version 1 configuration (see T2.1) —
      not against the physical Alfapet game.
- [x] Dictionary license/source is documented.
- [x] No online/backend code is required for local play.
- [x] Manual two-person hot-seat test completed. Played on 2026-08-23 to 2026-08-26 and confirmed
      done by the project owner. What it produced is recorded in `known-bugs.md`: the all-tiles
      bonus paying for a move that left a tile in hand (DEC-018), an engine crash when taking back
      a replacing tile whose displaced tile had been re-played, tiles placed this turn refusing to
      be swapped (DEC-017), and the handoff screen after an acceptance (DEC-019). All fixed and
      re-confirmed in play.
- [x] Manual mobile/tablet test completed. Played on Android/Chrome over the LAN on 2026-08-23,
      confirmed OK by the project owner. Five defects came out of it, all fixed and re-confirmed
      on the device: the start-game handler crashing silently outside a secure context
      (`crypto.randomUUID`); the board being unusably small with no way to zoom; the history panel
      pushing the action buttons down the page as it grew; a Replace-displaced tile being
      indistinguishable from the rest of the hand; and tiles placed but not yet played refusing to
      be swapped (DEC-017). See `known-bugs.md` "in general" 2-6. `npm run playtest` exists so a
      device always gets the build that was last made — the one thing that wasted time in this
      round was a phone quietly running a cached bundle.

---

# 27. Phase 4C — Playtesting

## T23.1 Conduct real games

Test with real players.

Record problems involving:

- [x] Rules. Replace mode produced most of them — see `known-bugs.md` and DEC-015 to DEC-017.
- [x] Scoring. The all-tiles bonus rewarded holding a tile back (DEC-018), and a replace re-scored
      a word it had only re-lettered (DEC-016).
- [x] Dictionary coverage. Nothing reported.
- [x] Unknown-word flow. The handoff after an acceptance was removed as redundant (DEC-019).
- [x] Handoff privacy. Nothing reported; the remaining handoffs are covered by e2e tests.
- [x] Blank interaction. Dragging a blank was fixed earlier in the round.
- [x] Exchange/pass. Nothing reported.
- [x] Game end. The finished board is now shown on the game-over screen.
- [x] Responsive UI. The bulk of the mobile round: board zoom, rack sizing and rearranging, the
      layout order, the address bar, and text that vanished on iPhone.

---

## T23.2 Fix Version 1 issues

Prioritize:

```text
correctness
→ broken flows
→ confusing flows
→ accessibility
→ polish
```

Do not begin online multiplayer merely to avoid fixing local-game issues.

---

# 27a. Phase 4D — Local game modifiers (Crisscross, Replace, Illegal)

Follow `game-modifiers.md`. The open questions blocking this phase are resolved (DEC-008).

## T32.1 Modifier selection and compatibility validation

- [x] Add `modifiers` to `GameConfiguration` per `content-model.md` section 8.
- [x] Implement the compatibility check (`game-modifiers.md` section 5) as engine-level
      validation at game-configuration time, not only a UI-level restriction.
- [x] Add a settings/game-setup UI section for selecting modifiers before starting a game.
      `GameSetup.tsx` renders one checkbox per modifier with Swedish label/description, disables
      a checkbox that would create an `UNDECIDED` pair with the current selection (defense in
      depth around `validateModifierSelection`, which is also re-checked on submit), and shows an
      interaction note for Crisscross+Replace. The selection now flows all the way through
      `createGame`/`createSwedishGameConfiguration` into the running `GameConfiguration`, and is
      persisted/restored via `localGameStorage` (schema bumped to v2; a pre-modifiers v1 save is
      treated as INCOMPATIBLE rather than assumed to have none) so a resumed game keeps enforcing
      the modifiers it was created with instead of silently losing them.
- [x] Test that an incompatible combination is rejected by the engine even if a caller bypasses
      the UI. Now that Milestone 8.1 (Polyglot/Wild) has landed, Polyglot+Wild is a real
      `UNDECIDED` pair (DEC-010) — `modifiers.test.ts`'s "rejects Polyglot and Wild combined, per
      DEC-010" calls `validateModifierSelection` directly, independent of `GameSetup.tsx`.

---

## T32.2 Crisscross mode

- [x] Relax physical placement validation to allow a connected multi-branch cluster of new tiles,
      per `game-modifiers.md` section 6.
- [x] Verify word detection correctly derives and scores every word formed by a multi-branch
      placement, including two or more lines composed entirely of new tiles.
- [x] Test a T-shaped and a plus-shaped placement, each forming multiple new words.
- [x] Test that a disconnected new-tile island is still rejected.
- [x] Test first-move-must-cover-centre and connect-to-existing-board rules against the cluster
      as a whole, per section 6's clarification.

Corrected 2026-08-20 (DEC-014): the original connectivity check treated any existing board tile
as a valid bridge between two new-tile groups, which incorrectly accepted two unrelated groups
that never touched each other directly. `isCrisscrossConnected` now requires the newly placed
tiles' own lines to share a cell with each other; a regression test reproduces the exact reported
scenario (two groups bridged only through an existing crossing pair of words).

---

## T32.3 Replace mode

- [x] Allow a move to place a new tile on a committed board cell; move the displaced tile to the
      replacing player's rack, per `game-modifiers.md` section 7.
- [x] Implement the same-turn replace-chaining restriction on a freshly displaced tile, and its
      expiry after one full turn.
- [x] Reject a replace placement targeting a cell that is part of the current pending move.
- [x] Confirm multiplier squares do not reactivate on a replace placement.
- [x] Re-derive and validate/score the words affected by the replaced cell through the normal
      pipeline, including the disputed-word flow when applicable.
- [x] Implement the resolved open question on displaced blank-tile handling
      (`game-modifiers.md` section 11, item 2).
- [x] Test that earlier committed moves keep their already-awarded score after a later replace.

Also implemented, beyond the original checklist: the board and rack stay consistent at every
step (a displaced tile moves out of the board and into the rack immediately at placement time,
not deferred to commit — board.ts `removeCommittedTile` doc), and undoing a replace placement
(REMOVE_TILE, "Rensa", or moving a pending tile elsewhere) fully reverses the displacement,
restoring the original tile to the board and out of the rack. Replacing the board's only
remaining committed tile is handled correctly too (`isFirstMoveOverride` /
`physicalValidation.ts`) rather than being misread as the game's first move. Moving an
already-pending tile onto a *different* occupied cell (drag-relocating a replace placement) is
also supported (`movePendingTile.ts`'s `allowReplace` option, added 2026-08-20 after a reported
bug: it previously only supported moving onto an empty cell).

Settings/game-setup UI wiring for Replace mode (and every other modifier) now exists — see
T32.1, `GameSetup.tsx`.

Three further corrections came out of playtesting on 2026-08-21 (`known-bugs.md`, Replace 2-4):
a replace must change the cell's letter (DEC-015); the rack is refilled up to the configured rack
size rather than one tile per tile placed, which had been granting a permanent extra tile per
replace; and a word scores only if the move lengthened or created it (DEC-016), which supersedes
the plain "score the affected words through the normal pipeline" reading of the checklist item
above — the pipeline is still the same, but a word the move only re-lettered now totals 0.

---

## T32.4 Illegal mode

- [x] Block committing a move that forms a `DICTIONARY_WORD`, per `game-modifiers.md` section 8.
- [x] Route every move through the proposal/approval flow, per the resolved open question on
      partially-dictionary-valid multi-word moves (`game-modifiers.md` section 11, item 4).
- [x] Implement the resolved open question on `ACCEPTED_IN_GAME` word handling
      (`game-modifiers.md` section 11, item 3).
- [x] Confirm `FORBIDDEN_WORD` (one-letter words) remains blocked unchanged.
      `submitMove.illegalVsForbidden.test.ts` mocks `classifyWord` so a move can form both a
      FORBIDDEN_WORD and a DICTIONARY_WORD in the same submission, and asserts the move is
      rejected as FORBIDDEN_WORD, not `DICTIONARY_WORD_NOT_ALLOWED` — proving the ordering in
      `submitMove.ts` (forbidden-word check before the Illegal-mode check). A mock was needed
      because `detectFormedWords` still structurally never returns a single-letter word, so this
      combination remains unreachable via a real board placement; see T12.7/T12.8 for that
      pre-existing gap, which this task does not close.

---

# 28. Phase 5 — Online foundation

Do not start these tasks until the local Version 1 release gate is satisfied and the project owner explicitly moves work into the online phase.

The project owner opened this phase on 2026-08-26, after the hot-seat playtest round (section 44).
Work here started with the tasks that do not depend on the hosting decision — T24.5, and the parts
of T24.3 about keeping the engine framework-independent — so that choosing a stack stays a
separate, unhurried decision.

## T24.1 Reevaluate backend stack

- [x] Confirm current hosting/backend needs.
- [x] Reevaluate Supabase/PostgreSQL choice.
- [x] Document final decision.

Settled on 2026-09-09. **DEC-020** (accepted) chooses Neon Postgres in Frankfurt with Better Auth,
over the Supabase that `tech-stack.md` had assumed; the project owner's answers — no monthly cost,
EU data residency, no need for realtime — decided it, since the free-tier escape from Supabase's
seven-day inactivity pause was the paid plan. **DEC-021** chooses Vercel Hobby, also Frankfurt, so
the application sits beside its database. `tech-stack.md` sections 25-27, 29 and 31 now name the
stack rather than candidates.

Still open, and deliberately not decided here: the **database access layer** (an ORM or a plain
driver). It is a major dependency in its own right, and T24.2 is the first task that needs it.

---

## T24.2 Authentication

- [x] Add managed authentication.
- [x] Add minimal profile.
- [x] Do not build custom password storage.

Better Auth (DEC-020) over Drizzle and Neon (DEC-022), mounted at `/api/auth/[...all]`. Better
Auth owns the whole credential path — hashing, sessions, verification tokens — and its four tables
(`user`, `session`, `account`, `verification`) are generated rather than hand-written, in
`src/server/db/schema/auth.ts`, with the first migration in `drizzle/0000_auth_tables.sql`.

The profile is Better Auth's own `user` row: `name` is the display name and `image` the optional
avatar that `online-multiplayer.md` section 10 asks for, so there is no separate profile table to
drift out of step. `user.id` is the `User` of section 8 — an account across many matches, not a
`Player` within one.

Email and password is the only method for now. Section 9 says the first online version does not
need every method, and it is the only one that needs no external service while the project runs at
no cost (DEC-020). Magic links and OAuth are configuration on the same object. Email verification
is off deliberately: with no mail sender configured, requiring it would lock out every account it
created.

Nothing here touches the engine. The engine still knows only a `playerId`, and the ESLint boundary
that already kept it clear of React and components now covers `src/server/` too.

No sign-in or sign-up screen exists yet — those are Phase 6 (T25.x), and there is nothing for a
signed-in user to do until matches exist. What is testable without a database is tested in
`src/server/auth.test.ts`, in a new Node-environment `server` project alongside the engine's
(`vitest.config.mts`).

**Before this can run:** a Neon project must be created in Europe (Frankfurt), its connection
string and a generated `BETTER_AUTH_SECRET` put in `.env.local` (see `.env.example`), and
`npm run db:migrate` run once.

---

## T24.3 Server-side engine execution

- [x] Make shared engine usable server-side.
- [x] Keep engine independent from server framework.
- [x] Run authoritative actions on server. Done with the action API (T25.3, DEC-024): every
      gameplay transition now runs through `dispatchGameAction` on the server, against state
      loaded from the database, and only the engine's own output is persisted.

Both guarantees were being taken on trust, and now are not.

The engine's tests run in a Node environment rather than jsdom (`vitest.config.mts` splits the
suite into an `engine` project and a `ui` one). Under jsdom a stray dependency on a browser global
would have passed every test while leaving the engine unusable on a server; 469 engine tests now
run with no `window`, `document` or `localStorage` in existence.

An ESLint rule stops engine code importing React, Next, components or the application layer.
Running in Node does not catch that — importing React on a server works fine — but an engine that
imports a component has stopped being portable all the same. The dependency runs one way: UI and
application code build on the engine.

`serializeGameState`/`parseGameState` (`src/game/model/serialization.ts`) carry a game through
text and back, validating with the same invariant check every engine action relies on, so a state
that survives storage can be played on immediately. The round-trip tests assert that continuing a
restored game reaches the same state as continuing the original — a server has to continue a
match, not merely display it. `localGameStorage` predates these and still validates inline; it can
adopt them when persistence work begins in earnest.

---

## T24.4 Match persistence

- [x] Persist authoritative serialized game state.
- [x] Add match revision/version.
- [x] Store match metadata.
- [x] Use transactional updates.

Tables `match` and `match_player` (`src/server/db/schema/match.ts`, migration
`drizzle/0001_matches.sql`, applied), with the storage functions in `src/server/matches.ts`.
DEC-023 records the design and the alternatives.

The state is one `jsonb` column, read back through the engine's own `parseGameState`, so a row
that would not survive the invariant check is never handed to a caller — and never written in the
first place.

The revision is a compare-and-set, not a counter that is read and then incremented: state,
revision, status and whose-turn-it-is move in a single conditional UPDATE. That is what makes the
double-click of section 32 harmless — the second write matches no row and changes nothing.
Rejecting stale revisions in the *action* layer is still T25.4; what exists now is the mechanism
it will use.

Note that `GameState.version` is not this revision. It is the serialized format's schema version
(`content-model.md` section 6) and does not move as a game is played. Two different things called
version, one of which must never be used as the other.

Authorization is inside the queries rather than beside them (sections 37-38): every function takes
the acting user, and a non-participant is told the match does not exist rather than that it may
not be read.

Tested against the real database — 16 tests covering the revision guard, the stranger who cannot
read or write, a state the engine would reject, a game followed to FINISHED, and the match list's
"whose turn" flag. They skip when no `DATABASE_URL` is configured, so a checkout without one still
runs a green suite.

**Left for later, deliberately:** invitations (T25.1/T25.2 own the `GameInvitation` of section 13;
a match with no state is already an invitation as far as the schema is concerned), and unifying
`MatchConfiguration` with `SavedLocalGame` once match creation exists to unify them for.

---

## T24.5 Player-safe views

- [x] Return own rack.
- [x] Return opponent rack count only.
- [x] Hide tile-bag order.
- [x] Hide other private state.
- [x] Add authorization tests.

`toPlayerGameView` in `src/game/view/playerGameView.ts` derives what one player may be told from
the authoritative state (`online-multiplayer.md` sections 16-17). It lives in the engine rather
than in a server, so whatever backend is chosen later inherits the rule instead of restating it,
and so it can be tested as directly as any other rule.

A pending move is part of this and is not mentioned in the task list: its owner always sees it,
and the opponent only once it has been proposed to them for approval. Otherwise an opponent would
watch letters being tried out and know the hand before the move was ever played.

The authorization tests assert what is *absent*, including by serializing a view and sweeping the
JSON for identifiers that must never appear in it — a leak anywhere in the structure fails, not
only in the places someone thought to assert on. Leaking the full tile registry fails seven of
them.

Transport is still to come: nothing serves these views until T24.3/T24.4 have a server to serve
them from.

---

# 29. Phase 6 — Online matches

## T25.1 Create online match

- [x] Select opponent.
- [x] Select supported game configuration.
- [x] Create invitation/match.

`POST /api/matches` invites an opponent by email — the only identifier an account has until
friends and user search arrive in Milestone 7 (DEC-024). The body may choose rack size and
modifiers; it may not choose a ruleset, because Swedish Alfapet is the only one the first online
release offers (`online-multiplayer.md` section 12) and the stored `configurationId` exists to
keep a match on the rules it started with (section 49), not to let a client pick another.

A created match is an invitation: two seats, the agreed rules, no game. Seat ids are generated
now and handed to the engine when the game starts, because an invitation is sent to a person
rather than to a `PlayerId`.

At the API level only. The screens for choosing an opponent are Milestone 6, which is where the
roadmap puts making online play usable without developer tooling.

---

## T25.2 Match invitation

- [x] Accept.
- [x] Decline.
- [x] Start game after acceptance.

`POST /api/matches/:id/accept` and `.../decline`. Only the invited player can do either: the
inviter accepting on the opponent's behalf is refused, which is `online-multiplayer.md`
section 37 applied to the invitation itself.

Accepting is what creates the game (section 13). Who moves first is still drawn from the bag as
`game-rules.md` section 2 requires — inviting somebody is not a first-move advantage. Declining
cancels the match rather than deleting it, since section 15 has a status for it and the inviter
should be able to see what became of an invitation.

Again API only; the invitation list and its buttons are Milestone 6.

---

## T25.3 Online normal turns

Implement server-authoritative:

- [x] Submit move.
- [x] Pass.
- [x] Exchange.
- [x] Game end.

`POST /api/matches/:id/actions` takes one domain action and the revision the client believes it is
acting on. The pipeline is section 5's: authenticate, authorize, load the authoritative state, run
the shared engine, persist atomically, return a player-safe view.

Two properties are worth stating because they are what "without trusting the client" means here.
A request carries no `playerId` — which player the caller is comes from the session and the match's
seats, so the identity that section 37 forbids spoofing is never read from a request at all. And a
submitted move carries placements, which the server replays through the engine's own `placeTile`
against the authoritative state (section 19), so a tile the player does not hold is refused by the
rules rather than by a check written a second time. A test plays the opponent's tile and is
refused.

Game end needs no action of its own: the engine's end conditions run inside the actions that
trigger them, and the match's status follows the game's (DEC-023). Resignation is a separate
matter and belongs with section 46, which is not scheduled yet.

The unknown-word flow is untouched here — a submitted move that forms one still becomes a proposal
in the stored state, and Milestone 5.2 is where the review actions are added.

---

## T25.4 Concurrency

- [x] Reject stale revisions.
- [x] Prevent duplicate commits.
- [x] Handle multiple tabs safely.

All three are the one mechanism T24.4 built, now used: a stale revision comes back as a 409 naming
the current revision, so the client refetches rather than retrying blindly. A double-submitted
action is not merely idempotent but inert — the second write matches no row, so nothing scores,
draws or advances twice. Two tabs are the same case as two clicks.

---

# 30. Phase 6A — Online disputed words

## T26.1 Proposer flow

- [x] Server detects unknown words.
- [x] Client asks proposer.
- [x] `Spela ändå` persists proposal.

Submitting a move that forms an unknown word leaves the state in
`REQUIRES_PLAYER_CONFIRMATION`, and the opponent's view shows no pending move at all. That is
`online-multiplayer.md` section 21's requirement made structural: a proposal only becomes the
opponent's business once the proposer sends `CONFIRM_PROPOSAL`, the `Spela ändå` of the local
game. `CANCEL_PROPOSAL` backs out instead.

"Client asks proposer" is the server half of it — the state says plainly that confirmation is
required, and the view carries the unknown words and the score preview to ask with. The screen
that does the asking is Milestone 6.

---

## T26.2 Opponent review

- [x] Correct opponent sees review requirement.
- [x] Proposed board can be reconstructed.
- [x] Hidden racks remain private.

All three came from `toPlayerGameView` (T24.5) rather than from new code: a pending move is shown
to its owner always and to the opponent only once it has been proposed. Everything section 22 asks
to be stored — placements, blanks, formed words, unknown words, the score preview — is inside the
pending move in the serialized state, so nothing had to be stored twice or trusted from a client.
The score is the engine's, computed again on acceptance rather than taken from the proposer.

A test confirms the reviewer sees the three placed tiles and a count of the proposer's remaining
rack, and that the serialized view contains no tile bag.

---

## T26.3 Accept/reject

- [x] Server verifies reviewer.
- [x] Acceptance commits atomically.
- [x] Rejection restores proposer control.
- [x] Accepted vocabulary persists for match.

`ACCEPT_PROPOSED_MOVE` and `REJECT_PROPOSED_MOVE` go through the same pipeline as any other
action, so acceptance is one conditional UPDATE (DEC-023): score, board, draw, vocabulary and
turn either all land or none do. Section 24's list is the engine's existing behaviour, not
re-implemented here.

The reviewer is verified by the engine, which refuses anyone but the player the proposal is
waiting on — tested from both wrong angles: the proposer cannot accept their own proposal, and
the opponent cannot accept one that has not been confirmed yet.

Accepted vocabulary lives in the match's own state, so section 27 holds by construction. A test
plays the same nonsense word in a second match and finds it unknown there.

---

## T26.4 Reconnect tests

- [x] Proposal survives disconnect.
- [x] Review survives page reload.
- [x] Rejected placement returns to proposer.

There is nothing to survive a disconnect: no part of the flow lives in a browser, and every read
already comes from the database. The tests assert it rather than assume it — reopening the match
as the reviewer finds the proposal at the same revision.

Rejection returns the placement to the proposer as editable state (section 26), and the engine
puts it straight back to `EDITING` rather than through an unlock step. Submitting again therefore
has to cope with a pending move already being there, which is why a submission clears one first
(DEC-024): the client sends its whole intended placement, not a diff. A test rejects a three-tile
word and then submits two tiles instead.

---

# 31. Phase 6B — Match list

## T27.1 Match overview

Support sections/statuses such as:

- [x] `Din tur`
- [x] `Ord att granska`
- [x] `Väntar på motståndaren`
- [x] `Avslutade`

`listMatchesForUser` returns a category per match, derived per viewer — the same match is in
different piles for the two players — along with the opponent's name, which is what a list is
actually read by. `GET /api/matches` serves it.

Two categories beyond the four are included, since the list is otherwise a dead end: an
`INVITED` match is `INVITATION_RECEIVED` or `INVITATION_SENT` depending on who sent it, and a
declined one is `CANCELLED`. The task says "such as", and without them an invitation could not be
reached from the list it appears in.

This uncovered a real defect in T24.4's derived column, now **DEC-025**: it took whose turn it was
from `GameState.currentPlayerId`, which stays with the proposer while a proposed word awaits
review. The list would have told both players they were waiting for each other. It is now derived
from the turn state, with a second column recording whether the waiting player owes a move or a
verdict — which is exactly the distinction `Din tur` and `Ord att granska` draw.

The sections above began as data with no screen to show them. `tasks.md` had no entries for the
online interface at all, while `roadmap.md` section 33 requires that "users can independently
create and continue matches through the normal website UI" — a gap between the two documents that
was put to the project owner, who chose to build the interface in full. T27.2 below is the result,
added after the fact rather than planned in advance.

---

## T27.2 Online interface

Added on 2026-09-09 to close the gap described above (DEC-026).

- [x] Sign in and create an account.
- [x] Match list with the sections of T27.1, and the opponent's name.
- [x] Invite an opponent; accept or decline an invitation.
- [x] Play a match against the server: place, submit, pass, exchange.
- [x] The disputed-word flow from both sides: `Spela ändå`, and `Godkänn`/`Neka`.

`OnlineGameScreen` renders a `PlayerGameView`, where the hot-seat `GameScreen` renders a
`GameState`. That is the whole difference, and every presentational component is shared unchanged
between them — they were already written against plain data rather than engine state, so the two
games look identical while disagreeing entirely about who decides the rules.

Arranging tiles is local and unjudged: this client cannot ask the engine whether a placement is
legal, because it holds neither the bag nor the opponent's rack. It sends the finished placement
and the server answers (`online-multiplayer.md` section 19). An open match polls every 15 seconds,
since DEC-020 chose polling.

**Known differences from hot-seat play,** all following from the client not holding the game: no
drag-and-drop (tap a tile, then a square), and no live score preview while arranging — the score
arrives with the proposal or the committed move. Getting either honestly would mean a server-side
preview, not a client-side engine.

Verified in the browser against the real database: two accounts, an invitation, an acceptance from
the other account, and DUM played across the centre for 14 points — rack refilled, turn handed
over, history written, no console errors. The test accounts were deleted afterwards.

**Not built, and not pretended to be:** notifications and badges (Milestone 7.2), friends and user
search (Milestone 7 — an opponent is found by email until then), resignation (section 46), and
chat.

---

## T27.3 Deployment

Requested on 2026-09-10, which is the "separately requested" that T0.5 left open.

- [x] Deploy to Vercel, Frankfurt (DEC-021): `vercel.json` sets `regions: ["fra1"]`.
- [x] Set `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` on the project.
- [x] Apply the migrations in `drizzle/` to the Neon database.
- [x] Verify the live deployment.

Live at **https://betapet.vercel.app**. `tech-stack.md` section 31 records the configuration, and
DEC-021 carries a dated note on how it turned out.

Two things had to be built rather than merely switched on. `.vercelignore`, because the Vercel CLI
reads it *instead of* `.gitignore` and so tried to upload the 1.6 GB of raw dictionary sources on
the first attempt. And a `baseURL` in `createAuth()`, because Better Auth has to know its own
origin to build callbacks and set cookies: `BETTER_AUTH_URL` in production, `VERCEL_URL` on a
preview deployment whose URL cannot be known in advance, and the request's own origin locally.

Verified against the live site, not only the build: the home page and `/online` serve, an
unauthenticated `GET /api/matches` is `401 UNAUTHENTICATED`, and a sign-in attempt for an unknown
address is refused with `INVALID_EMAIL_OR_PASSWORD` — which is the answer that proves the function
reached the database. No account or match was created, so nothing had to be cleaned up afterwards.

---

# 32. Phase 7 — Friends

## T28.1 User discovery

- [x] Find another user using the chosen identity/search model.
- [x] Avoid exposing unnecessary personal data.

The identity/search model had never been chosen — `online-multiplayer.md` section 10 listed what
identity is *for* without saying what a user is found *by*, and section 11 said the social model
should be designed when this phase began. It was put to the project owner as three options: exact
email only, a unique handle, or display-name search. They chose the handle, and it is **DEC-027**.

Every account now has a `handle` — unique, chosen at sign-up, 3-20 characters of `a-z`, `0-9` and
`_`, a letter first, stored lowercase, shown as `@anna`. The rules are in `src/server/handles.ts`
and are about the person typing it in: no case to get wrong, and no character a keyboard might not
produce, which is why å, ä and ö are excluded from handles while remaining central to the game.

The second checkbox is why there is **no user search endpoint at all**. A handle is resolved by
sending a friend request to it, so a caller learns the name behind a handle it already had and
nothing about one it did not; no endpoint returns a list of users, and no endpoint returns an email
address. A handle nobody owns and a request that failed look identical from outside.

Handles are declared through Better Auth's `additionalFields`, so sign-up accepts one and the
unique constraint — the database, not the application — settles a race between two people claiming
the same handle. Existing accounts predate the column, so migration `0003` adds it nullable,
derives a handle for every existing row, and only then sets `NOT NULL`.

**Not built:** changing a handle. A handle is permanent for now, including a derived one, which is
the first thing to build if that stops being acceptable.

---

## T28.2 Friend requests

- [x] Send.
- [x] Accept.
- [x] Decline.
- [x] List friends.

One `friendship` row per pair of users, in whichever direction the first request went (**DEC-028**).
The direction is kept because a pending request is genuinely directed — only the addressee may
answer it — and stops meaning anything once accepted.

Two rules are the database's rather than the code's, because that is the only place they can hold
regardless of which path writes: a unique index over the *unordered* pair, so two rows for one pair
cannot exist even under a simultaneous double request, and a check constraint against befriending
oneself. Answering a request addressed to somebody else is a 404, not a refusal — anything else
would confirm it exists (section 38).

Three cases the tests pin down because they are the ones a naive model gets wrong. A request that
crosses one coming the other way is treated as an **acceptance**, since both people asked for the
same thing and leaving each waiting for the other could not be explained. A **declined** request is
kept as `DECLINED` rather than deleted, so it stops being pending for both sides without telling
the requester whether it was refused or merely unanswered, and a later request reuses the row in
whichever direction it is then sent. And the **requester cannot accept their own** request.

`listSocialGraph` is one query, not three: the other user is whichever end of the row this user is
not, so friends, incoming and outgoing all come out of a single pass.

`FriendsScreen` opens with the user's own handle, because reading it out to somebody is the first
thing anyone needs from that screen.

**Not built:** `BLOCKED`, which is a moderation feature whose rules Milestone 7 does not specify, so
the enum value is absent rather than present and unhonoured; and removing a friend, which the
milestone does not ask for.

---

## T28.3 Start match with friend

- [x] Create invitation directly from friend list.

Each friend in the list has a `Ny match` button, and `POST /api/matches` now names an opponent by
either `opponentEmail` or `opponentUserId` — never both, so the server is never left choosing which
one a client meant.

The two references are not equally trusted. An address is something the inviter had to know
already, so knowing it is the permission. An id is not: ids travel in responses, so one is accepted
only from a user the opponent has accepted as a friend. A stranger's id gets the same
`OPPONENT_NOT_FOUND` as an id that does not exist.

Inviting by email is unchanged and still works for somebody who is not a friend, which is what
keeps an opponent reachable before a friendship exists.

Verified against the running server as well as by the test suite, since sign-up with a handle goes
through Better Auth's own endpoint and no unit test covers that wiring: two accounts created, an
illegal handle refused as `INVALID_HANDLE`, a handle already taken in different case refused, a
request sent to `@E2EAnna` and matched to `e2eanna`, an unknown handle answered `USER_NOT_FOUND`,
the requester's own accept refused, the addressee's accepted, a match started from the friend list,
and the same call with a non-friend's id refused. The test accounts were deleted afterwards.

---

# 33. Phase 7A — Chat

## T29.1 Match chat

- [ ] Text-only messages.
- [ ] Match participants only.
- [ ] Persist messages separately from `GameState`.
- [ ] Render user text safely.
- [ ] Show chronological history.

---

# 34. Phase 7B — Notifications

## T30.1 In-app notifications

Support:

- [ ] Match invitation.
- [ ] Friend request.
- [ ] Your turn.
- [ ] Unknown word requires review.
- [ ] Move rejected.
- [ ] Game completed.

---

## T30.2 Optional realtime refresh

- [ ] Add realtime updates if useful.
- [ ] Do not make game correctness depend on an uninterrupted realtime connection.

---

# 35. Phase 8 — Additional languages

Full scope (per-language tile sets, boards, UI translations) still does not begin until Swedish
gameplay is mature, in its original roadmap position.

**Scoped-down slice pulled ahead of Milestone 5 (DEC-010):** T31.1 below is being done now, but
narrowed to dictionary/word-rules only — explicitly excluding tile distribution, tile values,
board differences, and UI translation, which stay out of scope until full Milestone 8 is
pursued. T31.2 below is superseded by that narrower scope: see "T31.2 (scoped)" below instead of
"add one full language."

## T31.1 Extract language/ruleset configuration (scoped to dictionary/word rules only)

Ensure clean separation of:

- [x] Dictionary. Confirmed by German's addition: `germanDictionary.ts` implements the same
      `Dictionary` interface (`src/game/dictionary/dictionary.ts`) Swedish uses, with zero changes
      to that interface or to `classifyWord.ts`.
- [x] Word rules. `germanWordClassificationRules.ts` builds the same `WordClassificationRules`
      shape as Swedish's, from German-specific allow-lists
      (`allowedCountriesDe.ts`/`allowedMonthsDe.ts`/`allowedWeekdaysDe.ts`/`allowedAbbreviationsDe.ts`).

Deliberately out of scope for this round (DEC-010) — remains for full Milestone 8 later:

```text
Tile distribution
Tile values
UI language
Board/rule differences
```

---

## T31.2 (scoped) Add dictionary support for German, French, English, and Spanish

Per DEC-010, not "one first additional language" with its own tile set/board, but dictionary-only
support for four languages, sufficient for Milestone 8.1's Polyglot/Wild modifiers:

- [x] German — `hippler/german-wordlist` (CC0-1.0), 675,423 words. See `src/data/dictionary/SOURCE-de.md`.
- [x] French — Lexique383 (CC BY-SA 4.0), 121,047 words. See `src/data/dictionary/SOURCE-fr.md`
      (including a resolved license-link discrepancy on the source's own site).
- [x] English — ENABLE (public domain), 172,823 words. See `src/data/dictionary/SOURCE-en.md`
      (switched from the originally-approved SCOWL, which turned out to need dictionary-compiler
      tooling to produce a flat word list; ENABLE needed none).
- [x] Spanish — Spanish Wiktionary via Wiktextract/kaikki.org (CC BY-SA + GFDL), 826,336 words,
      with real proper-noun/abbreviation exclusions derived from the source's own `pos` field
      (28,849 / 255 words respectively). See `src/data/dictionary/SOURCE-es.md`.

Verify and define each language's dictionary/word rules independently (dictionary source,
license, normalization, proper-noun/abbreviation handling, allowed countries/months/weekdays).

Do not reuse Swedish values accidentally.

---

# 35a. Phase 8A — Multi-language game modifiers (Polyglot, Wild)

Follow `game-modifiers.md`. ~~Do not begin until the open questions in its section 11 that apply
to these two modifiers have been resolved~~ Resolved by DEC-010 — see `game-modifiers.md`
section 11.

## T33.1 Polyglot mode

- [x] Configure a game with two or more selected languages. `GameConfiguration.polyglotLanguages`
      (`src/game/model/gameConfiguration.ts`), validated (≥2 languages required when `modifiers`
      has `"POLYGLOT"`) by `createGameConfiguration`. `GameSetup.tsx` now has a language-picker
      checklist (Swedish always included; German/French/English/Spanish selectable) shown once
      the Polyglot checkbox is checked, wired through `page.tsx`/`gameController.ts`/
      `localGameStorage.ts` (schema v3) end to end — see roadmap.md Milestone 8.1.
- [x] Evaluate dictionary membership as valid if any selected language's dictionary matches, per
      `game-modifiers.md` section 9. `classifyWordAcrossLanguages`
      (`src/game/dictionary/classifyWordAcrossLanguages.ts`) calls `classifyWord` once per
      language and combines results (`DICTIONARY_WORD` if any language matches); `submitMove.ts`
      uses it uniformly for both the single-language and Polyglot cases via
      `SubmitMoveOptions.polyglotClassificationRules`.
- [x] Test a word valid in one selected language but not another is classified `DICTIONARY_WORD`.
      `submitMove.test.ts` "submitMove: Polyglot mode", using real German+French dictionaries
      ("HAUS" is German, not French).
- [x] Confirm the Illegal + Polyglot interaction (DEC-010: illegal in every selected language) if
      Illegal mode is also selected. Composing the existing Illegal-mode gate with
      `classifyWordAcrossLanguages`'s "any language matches → DICTIONARY_WORD" already implies
      this with no extra code path (DEC-010's own rationale), confirmed by a dedicated test.

---

## T33.2 Wild mode

- [x] Configure a game with an ordered list of two or more languages.
      `GameConfiguration.wildLanguages` (`src/game/model/gameConfiguration.ts`), order-preserving,
      validated (≥2 languages required when `modifiers` has `"WILD"`) by `createGameConfiguration`.
      Setup UI shares Polyglot's language-picker pattern; order is the fixed canonical
      `ALL_LANGUAGE_CODES` order (Swedish first) rather than click order, to avoid needing a
      drag-to-reorder control for this first implementation — a documented simplification, not a
      spec requirement, and easy to revisit later without a breaking change (`wildLanguages` is
      already an ordered array regardless of how it's populated).
- [x] Rotate the active validating language after every full round, cycling back to the start.
      `activeWildLanguageIndex` (`src/game/engine/wildRotation.ts`) derives this from
      `state.history` — completed turns are `WORD_MOVE_COMMITTED`/`PASS`/`TILES_EXCHANGED`
      events (a rejected proposal does not count, since it returns control to the same player
      without completing a turn). `submitMove.ts` uses it to pick exactly one active language's
      rules from `options.wildClassificationRules` (unlike Polyglot's "any of several").
      `wildRotation.test.ts` covers round 0/1/2, wraparound, and the rejection-doesn't-count case
      directly against the pure function.
- [x] Confirm accepted vocabulary is scoped per Wild-mode language, not shared across rotation
      (DEC-010, superseded by DEC-012 after playtesting). `acceptedVocabulary.ts`'s
      `acceptedVocabularySet(state, languageCode?)` filters entries by the language they were
      accepted under; `submitMove.ts`/`acceptProposedMove.ts` pass the currently-active Wild
      language when checking/recording acceptance. Covered by `submitMove.test.ts`'s "DEC-012:
      per-language accepted vocabulary" cases (stays accepted after rotating back to the same
      language; is unknown again under a different language).
- [x] Test that a move is validated against whichever language was active at commit time, not the
      currently active language after later rotations. `submitMove.test.ts` "submitMove: Wild
      mode", using real German ("REN") and French ("PEU") dictionary words: the same crossing
      placement commits directly once "fr" becomes active but would require proposer
      confirmation while "de" is still active, and the earlier round's committed word/history
      entry is confirmed unchanged after the later rotation.

---

## T33.3 Polyglot and Wild combination

- [x] Keep Polyglot and Wild mutually exclusive in the compatibility table (DEC-010; not
      combined in this round).
- [ ] If a future decision resolves this differently, implement and test the agreed combined
      behaviour, and update the compatibility table in `game-modifiers.md`.

---

# 36. Cross-cutting task — Error handling

Throughout development:

- [ ] Use structured domain errors.
- [ ] Present understandable Swedish UI errors.
- [ ] Avoid exposing raw stack traces in production.
- [ ] Fail safely when persisted data is corrupt.
- [ ] Fail safely when dictionary/configuration assets cannot load.

---

# 37. Cross-cutting task — Serialization

Whenever state structures change:

- [ ] Update serialization.
- [ ] Update saved-game schema version when necessary.
- [ ] Add migration only when justified.
- [ ] Test loading representative saved state.
- [ ] Handle runtime structures such as `Set` explicitly.

---

# 38. Cross-cutting task — Rule tests

Every gameplay bug fix should normally include a regression test.

Prioritize tests around:

- Board placement
- Word detection
- Swedish letters
- Blanks
- Scoring
- Unknown words
- Forbidden words
- Accepted vocabulary
- Rejection
- Pass/exchange
- Game end

---

# 39. Cross-cutting task — No duplicated rule logic

During code review/refactoring, check that rules are not duplicated across:

```text
React components
application layer
game engine
server
```

The game engine should remain the authoritative implementation.

UI and future server code should invoke it rather than recreate it.

---

# 40. Cross-cutting task — No premature online infrastructure

Until Phase 5 is explicitly started, do not add:

- Authentication
- Supabase client
- Database
- Friend models
- Chat
- Notifications
- WebSockets/realtime infrastructure

Local Version 1 must remain independently playable.

---

# 41. Claude Code workflow

For each task or small group of related tasks:

```text
READ
    ↓
IMPLEMENT
    ↓
TEST
    ↓
TYPECHECK
    ↓
LINT
    ↓
REVIEW DIFF
```

Before coding, read the specification files relevant to that task.

Examples:

### Scoring task

Read:

```text
game-rules.md
game-engine.md
content-model.md
```

### Dictionary task

Read:

```text
dictionary.md
game-rules.md
```

### Local handoff task

Read:

```text
local-multiplayer.md
ui-design.md
content-model.md
```

### Disputed-word task

Read:

```text
game-engine.md
dictionary.md
local-multiplayer.md
examples/disputed-word-example.md
```

---

# 42. Stop conditions

Claude should stop and ask rather than guess when:

- Two specification files materially contradict each other.
- An Alfapet rule cannot be verified and affects gameplay.
- A dictionary licensing issue is unresolved.
- A requested implementation would violate an agreed core rule.
- A data migration could destroy an existing saved game.
- A major architecture change would invalidate the agreed plan.

Minor implementation details do not require constant confirmation.

Choose the simplest maintainable solution consistent with the specifications.

---

# 43. Immediate starting backlog

When implementation begins, start here:

```text
[ ] T0.1 Initialize application
[ ] T0.2 Code quality tooling
[ ] T0.3 Unit-test tooling
[ ] T0.4 End-to-end tooling
[ ] T0.5 Continuous integration

[ ] T1.1 Define fundamental IDs and primitives
[ ] T1.2 Define tile model
[ ] T1.3 Define board model
[ ] T1.4 Define player and rack model
[ ] T1.5 Define tile bag
[ ] T1.6 Define pending move
[ ] T1.7 Define turn state
[ ] T1.8 Define game history
[ ] T1.9 Define game result
[ ] T1.10 Define complete GameState

[ ] T2.1 Verify rule data
[ ] T2.2 Encode Swedish tile configuration
[ ] T2.3 Encode board configuration
[ ] T2.4 Encode rack configuration
```

Do not start UI implementation before these foundations are sufficiently stable.

---

# 44. Version 1 completion checklist

Version 1 is done only when all of the following are true:

```text
[x] Two-player local game setup works
[x] Swedish Alfapet configuration is verified
[x] Board placement rules work
[x] Word detection works
[x] Swedish dictionary lookup works
[x] Forbidden-word handling works
[x] Unknown-word handling works
[x] Proposer confirmation works
[x] Opponent acceptance works
[x] Opponent rejection works
[x] Rejected tiles remain editable
[x] Accepted words remain valid within the game
[x] Blank tiles work
[x] Scoring works
[x] Complete-rack bonuses work
[x] Pass works
[x] Tile exchange works
[x] Game-ending rules work
[x] Final scoring works
[x] Hot-seat privacy works
[x] Local persistence works
[x] Refresh recovery works
[x] Game history works
[x] Responsive UI works
[ ] Core accessibility requirements work
[x] Critical automated tests pass
[x] Production build passes
[x] Real two-person playtesting completed
```

Ticked 2026-08-26, after the hot-seat round the project owner confirmed complete. Every ticked
line is covered by the automated suites (604 unit tests, 43 end-to-end across Chromium and
WebKit) as well as by play, apart from the configuration line, which DEC-009 settled.

One line is deliberately left open: `known-bugs.md` item 12 records that `Tile` puts
`aria-pressed` on every tile it renders as a button, so a screen reader announces board tiles that
are not toggles as "not pressed". Nothing is unusable and the fix is small, but the line should
not be ticked while a known accessibility defect stands.

Only after this checklist is satisfied should online multiplayer become the primary development focus.
