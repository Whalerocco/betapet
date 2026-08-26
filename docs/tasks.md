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

- [ ] Confirm current hosting/backend needs.
- [ ] Reevaluate Supabase/PostgreSQL choice.
- [ ] Document final decision.

---

## T24.2 Authentication

- [ ] Add managed authentication.
- [ ] Add minimal profile.
- [ ] Do not build custom password storage.

---

## T24.3 Server-side engine execution

- [ ] Make shared engine usable server-side.
- [ ] Keep engine independent from server framework.
- [ ] Run authoritative actions on server.

---

## T24.4 Match persistence

- [ ] Persist authoritative serialized game state.
- [ ] Add match revision/version.
- [ ] Store match metadata.
- [ ] Use transactional updates.

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

- [ ] Select opponent.
- [ ] Select supported game configuration.
- [ ] Create invitation/match.

---

## T25.2 Match invitation

- [ ] Accept.
- [ ] Decline.
- [ ] Start game after acceptance.

---

## T25.3 Online normal turns

Implement server-authoritative:

- [ ] Submit move.
- [ ] Pass.
- [ ] Exchange.
- [ ] Game end.

---

## T25.4 Concurrency

- [ ] Reject stale revisions.
- [ ] Prevent duplicate commits.
- [ ] Handle multiple tabs safely.

---

# 30. Phase 6A — Online disputed words

## T26.1 Proposer flow

- [ ] Server detects unknown words.
- [ ] Client asks proposer.
- [ ] `Spela ändå` persists proposal.

---

## T26.2 Opponent review

- [ ] Correct opponent sees review requirement.
- [ ] Proposed board can be reconstructed.
- [ ] Hidden racks remain private.

---

## T26.3 Accept/reject

- [ ] Server verifies reviewer.
- [ ] Acceptance commits atomically.
- [ ] Rejection restores proposer control.
- [ ] Accepted vocabulary persists for match.

---

## T26.4 Reconnect tests

- [ ] Proposal survives disconnect.
- [ ] Review survives page reload.
- [ ] Rejected placement returns to proposer.

---

# 31. Phase 6B — Match list

## T27.1 Match overview

Support sections/statuses such as:

- [ ] `Din tur`
- [ ] `Ord att granska`
- [ ] `Väntar på motståndaren`
- [ ] `Avslutade`

---

# 32. Phase 7 — Friends

## T28.1 User discovery

- [ ] Find another user using the chosen identity/search model.
- [ ] Avoid exposing unnecessary personal data.

---

## T28.2 Friend requests

- [ ] Send.
- [ ] Accept.
- [ ] Decline.
- [ ] List friends.

---

## T28.3 Start match with friend

- [ ] Create invitation directly from friend list.

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
