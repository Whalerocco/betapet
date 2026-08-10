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

- [ ] Create the Next.js application.
- [ ] Enable TypeScript.
- [ ] Establish the source structure from `tech-stack.md`.
- [ ] Confirm the development server runs.

Acceptance:

```text
npm run dev
```

starts the application successfully.

---

## T0.2 Code quality tooling

- [ ] Configure ESLint.
- [ ] Configure Prettier if required by the selected setup.
- [ ] Add useful npm scripts.
- [ ] Enable appropriately strict TypeScript settings.

Acceptance:

- Lint command succeeds.
- Type checking succeeds on the initial project.

---

## T0.3 Unit-test tooling

- [ ] Configure Vitest.
- [ ] Configure React Testing Library.
- [ ] Add one trivial passing test to verify setup.

Acceptance:

```text
npm test
```

or the chosen equivalent runs successfully.

---

## T0.4 End-to-end tooling

- [ ] Configure Playwright.
- [ ] Add a minimal smoke test.

Acceptance:

The smoke test can launch the application and verify the initial page.

---

## T0.5 Continuous integration

- [ ] Add a basic CI workflow.
- [ ] Run type checking.
- [ ] Run linting.
- [ ] Run unit tests.
- [ ] Run production build.

Do not add deployment complexity unless separately requested.

---

# 4. Phase 1 — Core domain model

## T1.1 Define fundamental IDs and primitives

- [ ] Define stable game ID type/pattern.
- [ ] Define player ID.
- [ ] Define tile ID.
- [ ] Define coordinate.
- [ ] Define orientation/direction where needed.

Keep domain types independent of React.

---

## T1.2 Define tile model

- [ ] Define tile instance.
- [ ] Support normal letter tiles.
- [ ] Support blank tiles.
- [ ] Ensure blank base score is zero.
- [ ] Keep represented blank letter separate from physical tile identity.

Tests:

- Normal tile creation.
- Blank tile creation.
- Invalid tile data rejected where applicable.

---

## T1.3 Define board model

- [ ] Define board dimensions/configuration.
- [ ] Define board cells.
- [ ] Define multiplier/special-square representation.
- [ ] Define committed board occupancy.
- [ ] Prevent more than one committed tile per cell.

---

## T1.4 Define player and rack model

- [ ] Define player.
- [ ] Define display name.
- [ ] Define score.
- [ ] Define rack ownership.
- [ ] Keep player identity independent of display name.

---

## T1.5 Define tile bag

- [ ] Define remaining tile storage.
- [ ] Support deterministic ordering in tests.
- [ ] Support random shuffle in normal play.
- [ ] Implement draw operation.

Tests:

- Drawing reduces bag.
- Cannot draw more physical tiles than exist.
- Deterministic bag produces deterministic draws.

---

## T1.6 Define pending move

- [ ] Define pending tile placement.
- [ ] Associate pending move with proposing player.
- [ ] Support blank represented letters.
- [ ] Distinguish pending from committed tiles.
- [ ] Define relevant pending-move statuses.

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

- [ ] Define proposing player where relevant.
- [ ] Define reviewing player where relevant.
- [ ] Avoid relying only on `currentPlayerId` to represent review responsibility.

---

## T1.8 Define game history

- [ ] Use structured history events.
- [ ] Avoid storing presentation strings as authoritative history.
- [ ] Include event ordering/sequence.
- [ ] Support normal moves.
- [ ] Support pass.
- [ ] Support exchange.
- [ ] Support unknown-word proposal.
- [ ] Support acceptance/rejection.
- [ ] Support game completion.

---

## T1.9 Define game result

- [ ] Define final player scores.
- [ ] Define winner or tie.
- [ ] Store any final score adjustments required by rules.
- [ ] Ensure active games do not contain completed results.

---

## T1.10 Define complete GameState

- [ ] Combine domain concepts into authoritative state.
- [ ] Keep UI-only state out.
- [ ] Keep local handoff state out.
- [ ] Ensure state can be serialized.

Tests should enforce important invariants from `content-model.md`.

---

# 5. Phase 1A — Swedish Alfapet configuration

## T2.1 Verify rule data

Before encoding values, verify the Alfapet rules against the sources documented for the project.

Verify:

- [ ] Board size.
- [ ] Board special-square layout.
- [ ] Letter distribution.
- [ ] Letter point values.
- [ ] Number/value of blank tiles.
- [ ] Allowed rack sizes.
- [ ] Bonus for using the complete rack.
- [ ] Starting-player rule.
- [ ] Exchange rule.
- [ ] Pass/end conditions.
- [ ] Final scoring.

Do not use Swedish Scrabble values as substitutes.

If reliable sources conflict materially, stop and surface the conflict.

---

## T2.2 Encode Swedish tile configuration

- [ ] Create data-driven tile definitions.
- [ ] Encode every Swedish letter used by the game.
- [ ] Encode quantities.
- [ ] Encode point values.
- [ ] Encode blanks.

Tests:

- Total tile count.
- Quantity per tile type.
- Known point values.
- Blank properties.

---

## T2.3 Encode board configuration

- [ ] Encode dimensions.
- [ ] Encode all special squares.
- [ ] Keep board data separate from board-state occupancy.

Tests:

- Dimensions.
- Selected known coordinates.
- Counts of special-square types where useful.

---

## T2.4 Encode rack configuration

- [ ] Support the agreed rack-size options: 6, 7, and 8.
- [ ] Encode the correct all-tiles bonus for each supported rack size.
- [ ] Avoid scattering these values through engine code.

---

# 6. Phase 1B — Game initialization

## T3.1 Create new game

- [ ] Accept two player names.
- [ ] Accept rack size.
- [ ] Create stable player IDs.
- [ ] Create tile instances.
- [ ] Shuffle tile bag.
- [ ] Draw initial racks.
- [ ] Determine starting player according to rules.
- [ ] Initialize score/history/turn state.

---

## T3.2 Deterministic initialization tests

- [ ] Allow injected/random-seed or deterministic tile order.
- [ ] Verify starting racks.
- [ ] Verify remaining bag.
- [ ] Verify starting-player behaviour.

---

# 7. Phase 1C — Pending placement actions

## T4.1 Place tile

- [ ] Only current player can place a rack tile.
- [ ] Tile must belong to that player.
- [ ] Target must be available.
- [ ] Tile becomes pending rather than committed.

---

## T4.2 Move pending tile

- [ ] Move a pending tile to another valid empty coordinate.
- [ ] Preserve tile identity.
- [ ] Do not allow moving committed tiles.

---

## T4.3 Remove pending tile

- [ ] Return pending tile to the player's rack.
- [ ] Preserve blank identity/behaviour appropriately.

---

## T4.4 Blank selection

- [ ] Require a represented letter when a blank is placed.
- [ ] Support Swedish alphabet letters required by the game.
- [ ] Allow changing represented letter while pending.
- [ ] Lock represented letter after commit.

---

## T4.5 Placement invariants

Tests:

- [ ] Opponent tile cannot be placed.
- [ ] Same tile cannot be placed twice.
- [ ] Occupied committed cell cannot be overwritten.
- [ ] Two pending tiles cannot occupy one coordinate.
- [ ] Committed tile cannot be moved.

---

# 8. Phase 1D — Physical move validation

## T5.1 Validate line alignment

- [ ] All newly placed tiles must satisfy the configured same-line rule.
- [ ] Reject illegal diagonal/mixed placements.

---

## T5.2 Validate gaps

- [ ] Account for committed tiles between newly placed tiles.
- [ ] Reject illegal empty gaps.

---

## T5.3 Validate board connection

- [ ] Apply first-move connection/start requirements.
- [ ] Apply later-move connection requirements.

---

## T5.4 Validate board boundaries and collisions

- [ ] Reject out-of-range coordinates.
- [ ] Reject illegal collisions.

---

## T5.5 Structured validation errors

Return machine-readable errors.

The UI should translate them into Swedish presentation text.

Do not make the engine depend on UI copy.

---

## T5.6 Physical-validation tests

Add cases for:

- [ ] Valid first move.
- [ ] Invalid first move.
- [ ] Valid horizontal move.
- [ ] Valid vertical move.
- [ ] Illegal gap.
- [ ] Disconnected placement.
- [ ] Collision.
- [ ] Extension.
- [ ] Crossing placement.

---

# 9. Phase 1E — Word detection

## T6.1 Build temporary resulting board

- [ ] Overlay pending tiles on committed board for analysis.
- [ ] Do not commit during validation.

---

## T6.2 Detect main word

- [ ] Detect horizontal main word.
- [ ] Detect vertical main word.
- [ ] Include adjacent committed tiles.

---

## T6.3 Detect crossing words

- [ ] Check perpendicular words for each newly placed tile.
- [ ] Ignore non-word single-letter fragments according to the defined rules.
- [ ] Avoid duplicate word results.

---

## T6.4 Blank handling

- [ ] Use represented blank letter when constructing words.
- [ ] Preserve physical blank identity for scoring.

---

## T6.5 Word-detection tests

Cover:

- [ ] Main word only.
- [ ] Main + one crossing word.
- [ ] Main + multiple crossing words.
- [ ] Existing-word extension.
- [ ] One tile creating words in both directions.
- [ ] Blank inside word.

---

# 10. Phase 1F — Scoring

## T7.1 Score normal letters

- [ ] Use configured Swedish point values.

---

## T7.2 Score special squares

- [ ] Implement all special-square behaviour defined by the verified board.
- [ ] Apply a square's effect only when appropriate for newly placed tiles.
- [ ] Do not reactivate consumed multipliers for old tiles.

---

## T7.3 Score crossing words

- [ ] Score every newly formed word.
- [ ] Correctly reuse the newly placed tile in each applicable word calculation.

---

## T7.4 Score blanks

- [ ] Blank contributes zero base tile points.
- [ ] Represented letter still participates in word construction.

---

## T7.5 Complete-rack bonus

- [ ] Apply the correct bonus when all rack tiles are used.
- [ ] Respect selected rack size.

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

- [ ] Plain word.
- [ ] Letter multiplier.
- [ ] Word multiplier.
- [ ] Crossing words.
- [ ] Blank.
- [ ] Multiple special squares.
- [ ] Complete-rack bonus.

Use verified expected values.

---

# 11. Phase 2 — Dictionary

## T8.1 Select Swedish dictionary source

- [ ] Choose source.
- [ ] Verify license.
- [ ] Document attribution/distribution requirements.
- [ ] Record dictionary version/source information.

Do not commit a dictionary with incompatible licensing.

---

## T8.2 Build preprocessing pipeline

- [ ] Read source data.
- [ ] Normalize entries.
- [ ] Transform to runtime format.
- [ ] Remove unwanted metadata if unnecessary.
- [ ] Produce deterministic output.

---

## T8.3 Implement normalization

- [ ] Case normalization.
- [ ] Unicode normalization.
- [ ] Correct Å/Ä/Ö handling.
- [ ] Use one shared normalization function.

Tests:

- [ ] Upper/lower case.
- [ ] Swedish letters.
- [ ] Unicode-equivalent strings.

---

## T8.4 Runtime dictionary lookup

- [ ] Load dictionary efficiently.
- [ ] Support exact normalized membership lookup.
- [ ] Avoid network dependency during a local game.

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

- [ ] Names are not allowed.
- [ ] Place names are not allowed.
- [ ] Implement the strategy defined in `dictionary.md`.

Do not assume absence from the dictionary alone proves a word is a name.

---

## T9.3 Allowed categories

Ensure agreed categories can be legal, including:

- [ ] Countries.
- [ ] Months.
- [ ] Weekdays.
- [ ] Normal verb conjugations.
- [ ] Plurals.

Their exact validity may depend on dictionary/rule data.

---

## T9.4 Abbreviations

- [ ] Abbreviations are generally forbidden.
- [ ] Support a maintained explicit exception list.
- [ ] Keep exceptions data-driven.

---

## T9.5 Forbidden versus unknown tests

Verify:

- [ ] Dictionary word → `DICTIONARY_WORD`.
- [ ] Accepted game word → `ACCEPTED_IN_GAME`.
- [ ] Missing but allowable proposal → `UNKNOWN_WORD`.
- [ ] Explicitly forbidden form → `FORBIDDEN_WORD`.

---

# 13. Phase 2B — Accepted vocabulary

## T10.1 Store accepted words per game

- [ ] Normalize before storage.
- [ ] Scope to one game.
- [ ] Preserve useful history metadata without creating conflicting sources of truth.

---

## T10.2 Accepted-word lookup

- [ ] Check accepted vocabulary as part of classification.
- [ ] Accepted word should not require repeated opponent approval.

---

## T10.3 Isolation tests

- [ ] Accepted in Game A does not affect Game B.
- [ ] Accepted word does not mutate global dictionary.
- [ ] Case differences do not create duplicate accepted entries.

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

- [ ] Commit pending tiles.
- [ ] Apply score.
- [ ] Draw replacements.
- [ ] Update bag.
- [ ] Record history.
- [ ] Clear pending move.
- [ ] Update pass/end counters.
- [ ] Check game end.
- [ ] Advance turn if game continues.

---

## T11.3 Normal move tests

Use `examples/normal-move-example.md`.

Verify:

- [ ] Score applied once.
- [ ] Pending tiles become committed.
- [ ] Replacement tiles drawn.
- [ ] Bag updated.
- [ ] History created.
- [ ] Turn advances.
- [ ] Accepted vocabulary unchanged.

---

# 15. Phase 2D — Disputed-word mechanic

## T12.1 Detect unknown word in submitted move

- [ ] Do not commit.
- [ ] Calculate provisional score.
- [ ] Store/return all unknown words.
- [ ] Enter proposer-confirmation state.

---

## T12.2 Proposer chooses Ändra

- [ ] Return to editable placement.
- [ ] Preserve pending tiles.
- [ ] Do not hand off turn.
- [ ] Do not modify score/bag/history as if rejected by opponent.

---

## T12.3 Proposer chooses Spela ändå

- [ ] Enter waiting-for-opponent state.
- [ ] Identify proposing player.
- [ ] Identify reviewing opponent.
- [ ] Preserve complete proposed move.
- [ ] Do not score or draw yet.

---

## T12.4 Opponent accepts

Atomically:

- [ ] Verify correct reviewer.
- [ ] Commit entire move.
- [ ] Apply score once.
- [ ] Draw replacements.
- [ ] Add every unknown word in the move to accepted vocabulary.
- [ ] Record history.
- [ ] Advance normal turn to reviewer/opponent.
- [ ] Check game end.

---

## T12.5 Opponent rejects

- [ ] Verify correct reviewer.
- [ ] Award no points.
- [ ] Draw no tiles.
- [ ] Add no accepted words.
- [ ] Keep proposing player as turn owner.
- [ ] Preserve all newly placed tiles as editable pending tiles.

---

## T12.6 Whole-move approval

- [ ] Multiple unknown words are presented together.
- [ ] Opponent accepts/rejects whole move.
- [ ] No per-word partial acceptance.

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

- [ ] Double acceptance cannot double-score.
- [ ] Stale rejection cannot undo committed move.
- [ ] Wrong player cannot review.

---

## T12.9 Full disputed-word tests

Use `examples/disputed-word-example.md` as the reference scenario.

---

# 16. Phase 2E — Other turn actions

## T13.1 Pass

- [ ] Implement pass.
- [ ] Record history.
- [ ] Update relevant consecutive-pass state.
- [ ] Advance turn.
- [ ] Check end conditions.

---

## T13.2 Tile exchange

- [ ] Select rack tiles.
- [ ] Validate exchange is permitted.
- [ ] Return/exchange tiles according to verified rules.
- [ ] Draw replacements correctly.
- [ ] Record history.
- [ ] Advance turn.

Use deterministic tests.

---

## T13.3 Game end

Implement all verified end conditions.

- [ ] Detect game end.
- [ ] Calculate final score adjustments.
- [ ] Create final result.
- [ ] Determine winner/tie.
- [ ] Prevent further gameplay actions.

---

# 17. Phase 3 — Local web UI

## T14.1 Start screen

Build the initial game entry screen.

- [ ] New local game action.
- [ ] Resume saved game when available.

---

## T14.2 Game setup

- [ ] Player 1 name.
- [ ] Player 2 name.
- [ ] Rack size: 6 / 7 / 8.
- [ ] Start game.
- [ ] Input validation.

Use Swedish UI copy.

---

## T14.3 Board component

- [ ] Render complete board.
- [ ] Render special squares.
- [ ] Render committed tiles.
- [ ] Render pending tiles distinctly.
- [ ] Support interaction on practical screen sizes.

---

## T14.4 Rack component

- [ ] Render active player's rack.
- [ ] Render letter values.
- [ ] Support selecting tiles.
- [ ] Support returning pending tiles.
- [ ] Never intentionally render opponent rack in active-player view.

---

## T14.5 Tile placement interaction

- [ ] Select rack tile and board square.
- [ ] Move pending tile.
- [ ] Remove pending tile.
- [ ] Make touch interaction usable.

Do not require drag-and-drop as the only interaction.

---

## T14.6 Score/header area

Show:

- [ ] Player names.
- [ ] Scores.
- [ ] Current turn/review status.
- [ ] Remaining tile count.

Do not reveal bag contents.

---

## T14.7 Turn actions

Add:

- [ ] `Spela`
- [ ] `Passa`
- [ ] `Byt brickor`

Enable/disable based on meaningful application/engine state.

---

# 18. Phase 3A — Blank tile UI

## T15.1 Blank chooser

When placing a blank:

- [ ] Ask which letter it represents.
- [ ] Include Swedish Å, Ä, Ö.
- [ ] Store choice in pending placement.
- [ ] Allow change while pending.

---

## T15.2 Blank rendering

- [ ] Clearly display represented letter.
- [ ] Preserve visual distinction if useful.
- [ ] Do not show normal letter score for blank.

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

- [ ] Explain that the move cannot be played.
- [ ] Identify relevant forbidden word(s).
- [ ] Return user to editing.
- [ ] Do not offer opponent approval.

---

# 20. Phase 3C — Unknown-word UI

## T17.1 Proposer warning

When unknown words are found:

Show:

- [ ] Unknown word(s).
- [ ] Explanation that they are absent from the dictionary.
- [ ] Provisional score.
- [ ] `Ändra`.
- [ ] `Spela ändå`.

---

## T17.2 Opponent review screen

Show:

- [ ] Proposed board.
- [ ] Unknown word(s).
- [ ] Proposer name.
- [ ] Provisional score.
- [ ] `Neka`.
- [ ] `Godkänn`.

Do not show either rack during review.

---

## T17.3 Acceptance transition

After approval:

- [ ] Explain that move was accepted.
- [ ] Indicate whose turn begins.
- [ ] Require explicit `Börja tur` before revealing reviewer/new current player's rack.

---

## T17.4 Rejection transition

After rejection:

- [ ] Explain that move was rejected.
- [ ] Hand device back to proposer.
- [ ] Reveal proposer rack only after explicit continuation.
- [ ] Restore rejected pending placement for editing.

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

- [ ] Hide racks.
- [ ] Show next player's name.
- [ ] Require `Fortsätt`.
- [ ] Reveal only next player's rack afterwards.

---

## T18.3 Review handoff

After `Spela ändå`:

- [ ] Hide proposer rack.
- [ ] Show reviewer handoff.
- [ ] Require explicit continuation.
- [ ] Open review without showing racks.

---

## T18.4 Privacy tests

Test that the wrong rack is not rendered during:

- [ ] Normal handoff.
- [ ] Opponent review.
- [ ] Rejection handback.
- [ ] Resume handoff.

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

- [ ] Game creation.
- [ ] Pending placement changes.
- [ ] Blank changes.
- [ ] Move commit.
- [ ] Unknown proposal confirmation.
- [ ] Acceptance.
- [ ] Rejection.
- [ ] Pass.
- [ ] Exchange.
- [ ] Game end.

---

## T19.3 Load saved game

- [ ] Parse safely.
- [ ] Validate schema/configuration version.
- [ ] Handle corrupt data gracefully.
- [ ] Do not reveal rack immediately.

---

## T19.4 Resume normal turn

- [ ] Determine correct player from game state.
- [ ] Enter neutral handoff.
- [ ] Restore pending placement.

---

## T19.5 Resume opponent review

- [ ] Determine correct reviewer.
- [ ] Enter neutral handoff.
- [ ] Restore proposal exactly.

---

## T19.6 Resume after rejection

- [ ] Return to proposing player.
- [ ] Restore editable rejected placement.

---

## T19.7 New-game overwrite protection

If an unfinished game exists:

- [ ] Warn before replacing it.
- [ ] Replace only after confirmation.

---

## T19.8 Persistence tests

Cover refresh/reload scenarios described in `local-multiplayer.md`.

---

# 23. Phase 3F — History and final result

## T20.1 Move history UI

Render structured events as Swedish presentation.

Support at least:

- [ ] Word move + score.
- [ ] Pass.
- [ ] Exchange.
- [ ] Unknown-word proposal.
- [ ] Acceptance.
- [ ] Rejection.

---

## T20.2 Game-over screen

Show:

- [ ] Final scores.
- [ ] Final adjustments.
- [ ] Winner or tie.
- [ ] New-game action.

---

# 24. Phase 4 — UI polish

## T21.1 Apply final visual direction

Follow `ui-design.md`.

Improve:

- [ ] Typography.
- [ ] Spacing.
- [ ] Board readability.
- [ ] Tile appearance.
- [ ] Score hierarchy.
- [ ] Dialogs.
- [ ] Handoff states.
- [ ] History.

Do not sacrifice rule clarity for decoration.

---

## T21.2 Responsive design

Test and fix:

- [ ] Desktop.
- [ ] Tablet.
- [ ] Mobile portrait.
- [ ] Mobile landscape where practical.

---

## T21.3 Touch usability

- [ ] Adequate touch targets.
- [ ] No essential hover-only controls.
- [ ] Board/rack interaction works without precise mouse input.

---

## T21.4 Accessibility

- [ ] Semantic controls.
- [ ] Visible keyboard focus.
- [ ] Form labels.
- [ ] Dialog focus management.
- [ ] Keyboard-operable core actions.
- [ ] Do not rely only on color.
- [ ] Respect reduced-motion preferences where animations exist.

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

- [ ] Refresh during normal pending move.
- [ ] Refresh awaiting review.
- [ ] Refresh after rejection.

---

## T22.5 Complete-game scenario

- [ ] Drive a deterministic game into an end condition.
- [ ] Verify final scoring/result.

---

# 26. Phase 4B — Version 1 release checks

Before declaring Version 1 complete:

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end tests pass.
- [ ] Type checking passes.
- [ ] Linting passes.
- [ ] Production build passes.
- [ ] Swedish configuration has been verified.
- [ ] Dictionary license/source is documented.
- [ ] No online/backend code is required for local play.
- [ ] Manual two-person hot-seat test completed.
- [ ] Manual mobile/tablet test completed.

---

# 27. Phase 4C — Playtesting

## T23.1 Conduct real games

Test with real players.

Record problems involving:

- [ ] Rules.
- [ ] Scoring.
- [ ] Dictionary coverage.
- [ ] Unknown-word flow.
- [ ] Handoff privacy.
- [ ] Blank interaction.
- [ ] Exchange/pass.
- [ ] Game end.
- [ ] Responsive UI.

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

# 28. Phase 5 — Online foundation

Do not start these tasks until the local Version 1 release gate is satisfied and the project owner explicitly moves work into the online phase.

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

- [ ] Return own rack.
- [ ] Return opponent rack count only.
- [ ] Hide tile-bag order.
- [ ] Hide other private state.

Add authorization tests.

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

Do not begin until Swedish gameplay is mature.

## T31.1 Extract language/ruleset configuration

Ensure clean separation of:

- [ ] Dictionary.
- [ ] Tile distribution.
- [ ] Tile values.
- [ ] Word rules.
- [ ] UI language.
- [ ] Board/rule differences where applicable.

---

## T31.2 Add first additional language

Likely candidate:

```text
English
```

But verify and define its rules independently.

Do not reuse Swedish values accidentally.

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
[ ] Two-player local game setup works
[ ] Swedish Alfapet configuration is verified
[ ] Board placement rules work
[ ] Word detection works
[ ] Swedish dictionary lookup works
[ ] Forbidden-word handling works
[ ] Unknown-word handling works
[ ] Proposer confirmation works
[ ] Opponent acceptance works
[ ] Opponent rejection works
[ ] Rejected tiles remain editable
[ ] Accepted words remain valid within the game
[ ] Blank tiles work
[ ] Scoring works
[ ] Complete-rack bonuses work
[ ] Pass works
[ ] Tile exchange works
[ ] Game-ending rules work
[ ] Final scoring works
[ ] Hot-seat privacy works
[ ] Local persistence works
[ ] Refresh recovery works
[ ] Game history works
[ ] Responsive UI works
[ ] Core accessibility requirements work
[ ] Critical automated tests pass
[ ] Production build passes
[ ] Real two-person playtesting completed
```

Only after this checklist is satisfied should online multiplayer become the primary development focus.
