# UI Design

## 1. Purpose

This document defines the user-interface direction for Version 1 of the game.

The initial product is a Swedish hot-seat word-board game for two players sharing one device.

The interface should feel like a polished digital board game while remaining simple enough to implement incrementally.

The UI must support the game rules without embedding those rules directly in presentation code.

---

## 2. Design goals

The Version 1 interface should be:

- Clear
- Calm
- Easy to learn
- Fast to operate
- Suitable for desktop and tablet
- Usable on mobile where practical
- Accessible
- Visually distinct from a generic web form
- Faithful to the feel of a physical word-board game

The interface should prioritize the board and the current player's rack.

---

## 3. Language

The Version 1 UI is Swedish.

User-facing text should therefore be written in Swedish.

Examples:

- `Nytt spel`
- `Spela`
- `Passa`
- `Byt brickor`
- `Din tur`
- `Godkänn`
- `Neka`

Do not place Swedish UI strings inside the core game engine.

The engine should expose structured state and error codes.

---

# 4. Main screens

Version 1 should contain only a small number of screens.

Conceptually:

```text
Start
  ↓
Game setup
  ↓
Game
  ↓
Game over
```

A saved game may add:

```text
Start
  ├── Continue saved game
  └── New game
```

Avoid unnecessary routing and navigation complexity.

---

# 5. Start screen

The start screen should be minimal.

Conceptually:

```text
┌───────────────────────────────┐
│                               │
│           GAME NAME           │
│                               │
│          [ Nytt spel ]        │
│                               │
│      [ Fortsätt spel ]        │
│      if saved game exists     │
│                               │
└───────────────────────────────┘
```

The primary action is starting a game.

Do not introduce accounts, profiles, online lobbies, or social features in Version 1.

---

# 6. Game setup screen

The setup screen should ask for only what is required.

Version 1 needs:

- Player 1 name
- Player 2 name
- Rack size: 6, 7, or 8 tiles

Conceptually:

```text
Nytt spel

Spelare 1
[ August         ]

Spelare 2
[ Anna           ]

Antal brickor
( ) 6
(●) 7
( ) 8

[ Starta spel ]
```

The rack-size choice should clearly show the corresponding all-tiles bonus:

```text
6 brickor → 40 bonuspoäng
7 brickor → 50 bonuspoäng
8 brickor → 60 bonuspoäng
```

Default to 7 tiles unless the product specification later decides otherwise.

---

# 7. Game screen hierarchy

The main game screen should prioritize:

1. Board
2. Current player
3. Score
4. Rack
5. Turn actions
6. Game information/history

Conceptually on desktop:

```text
┌─────────────────────────────────────────────┐
│ Player 1: 74           Player 2: 68         │
│                    41 brickor kvar           │
├───────────────────────────────┬─────────────┤
│                               │ Historik    │
│                               │             │
│           BOARD               │             │
│                               │             │
│                               │             │
├───────────────────────────────┴─────────────┤
│ Din tur: August                              │
│                                             │
│ [ A ][ E ][ R ][ T ][ S ][ N ][ K ]        │
│                                             │
│ [ Spela ] [ Byt ] [ Passa ]                │
└─────────────────────────────────────────────┘
```

The exact responsive layout may change, but the information hierarchy should remain.

---

# 8. Board

The board is the central visual element.

Each cell should clearly communicate:

- Empty square
- Occupied square
- Special multiplier square
- Newly placed tile
- Existing committed tile
- Selected/targeted square where relevant

The visual design should avoid making special squares so visually loud that letters become difficult to read.

The board should scale responsively.

---

# 9. Tile design

Tiles should resemble physical letter tiles without copying a specific commercial design too literally.

Each tile should show:

- Letter
- Point value

For example:

```text
┌──────┐
│  K   │
│    3 │
└──────┘
```

A blank tile should visually distinguish between:

```text
unassigned blank
```

and:

```text
blank representing Ö
```

A committed blank should make its represented letter visible while still indicating that it is a zero-point blank tile.

---

# 10. Existing versus pending tiles

The interface must distinguish committed board tiles from tiles placed during the current turn.

Pending tiles should feel editable.

Possible techniques include:

- Slight visual elevation
- Subtle outline
- Different shadow
- Small movement affordance

Do not rely only on color for this distinction.

After a move is committed, the tiles should visually become part of the board.

Rack tiles are sized independently of board tiles. The board must fit fifteen columns across,
which on a phone forces a cell well below a comfortable touch target; the rack holds only a
handful and is what the player taps and drags most, so it gets the larger size
(`--rack-tile-size`). The shuffle control beside it is an icon rather than a text label for the
same reason — the words took width the tiles need.

Under Replace mode (`game-modifiers.md` section 7) the rack needs the same kind of distinction. A
tile the current move displaced off the board arrives in the player's rack mixed in with tiles
that were already there, and it is not an ordinary tile yet: until the turn ends it may not
displace another tile. It is therefore shown in blue for exactly as long as that restriction
lasts, and its accessible name gains an `ersatt bricka` suffix so the state does not depend on
colour alone. Once the move is committed the restriction lifts, and the tile is drawn like any
other by the time that player next sees the rack.

---

# 11. Tile interaction

The initial interaction should work without requiring drag-and-drop.

Recommended basic interaction:

```text
Select rack tile
      ↓
Select empty board square
      ↓
Tile appears there
```

A square that already holds a tile can be a target for this same flow, not only an empty square.
With a rack tile selected, the tile on it becomes a placement target of its own (labelled
`Ersätt bricka <bokstav>`) in two cases:

- a *committed* tile, under Replace mode (`game-modifiers.md` section 7), which performs the
  replace;
- one of the current player's own *not-yet-played* tiles, in every mode, which swaps the two and
  returns the tile that was there to the rack (DEC-017).

With no tile selected, a committed tile stays inert and tapping a pending tile still picks it back
up (section 13) — selecting a tile first is what separates "put this here" from "take that back".
This keeps the tap flow equal to dragging, which is the point of this section: neither replacing
nor swapping may be a drag-only capability.

A placed pending tile can then be:

- Selected
- Moved
- Returned to the rack

The rack itself can be rearranged, which matters because a player orders their hand while looking
for a word:

- **Dragging** a rack tile and dropping it back on the rack inserts it between the two tiles it
  was dropped between, sliding the ones it passes.
- **Tapping** a second rack tile while one is already selected exchanges the two. The tile stays
  selected, so repeated taps walk it along the hand; tapping it again lets it go.

Tapping a board square with a tile selected still places it, so the two meanings of a tap never
collide: on the rack it rearranges, on the board it places.

Rack order is part of `GameState` (`player.rack.tileIds`), like the order `Blanda brickor`
produces, so a rearranged hand survives a refresh. It is not a game rule — the tiles held are
unchanged — but it goes through the engine so there is one source of truth.

This interaction works with:

- Mouse
- Touch
- Keyboard more easily than drag-only interfaces

Drag-and-drop may be added later as an enhancement.

---

# 12. Selected tile state

When a rack tile is selected:

- It should be visually highlighted.
- Empty board squares should remain usable targets.
- Under Replace mode, committed tiles become targets too, and should show the same kind of hover
  and keyboard-focus highlight an empty target square shows.
- Tapping another *rack* tile rearranges the hand rather than moving the selection (section 11).

That highlight is hover and keyboard-focus only, so on touch a committed tile looks the same
whether or not it is currently a target. The project owner considered this on 2026-08-23 and
decided to leave it: while a rack tile is selected *every* committed tile is a target, so a
persistent marker would light up the whole played board late in a game, and Replace mode is
opt-in — the setup screen describes the mechanic to the players who chose it. This is a
deliberate exception to section 41's "avoid relying on hover", not an oversight; revisit it only
if players actually fail to discover the mechanic in play.
- Selecting the same tile again may cancel selection.
- Selecting another rack tile changes selection.

The UI should make it obvious which tile will be placed next.

---

# 13. Returning tiles to the rack

Pending tiles must be easy to remove.

Possible interactions:

- Click a pending tile and choose/trigger return.
- Click a pending tile then click the rack.
- Provide a small `Ångra bricka` action.
- Support direct drag-back later.

The interaction should not allow removal of committed tiles.

---

# 14. Blank tile placement

Ask which letter a blank tile represents at *placement* time, not at selection time: the player
selects the blank tile from the rack (by tap or drag) same as any other tile, targets a board
square, and only then is the letter prompt shown, resolving that specific placement. This keeps
the interaction symmetrical with an ordinary letter tile — select, then target a square — rather
than interrupting the player before they've picked a square at all.

Conceptually:

```text
Vilken bokstav ska den blanka brickan vara?

A B C D E F ...
...
Å Ä Ö
```

The player must choose before the tile actually lands on the board; dismissing the prompt leaves
the blank tile selected (not placed) so the player can retarget a different square instead.

The alphabet selector must include Swedish:

```text
A–Z Å Ä Ö
```

The picker must be fully usable from a keyboard (arrow keys/type-ahead to change the letter,
Enter/Space to confirm), not only by tap or click.

The choice remains editable while the tile is pending — tapping an already-placed blank tile
reopens the same picker to change its letter.

Once committed, it cannot change.

---

# 15. Current player

The active player must be obvious.

For example:

```text
Din tur: August
```

or:

```text
August spelar
```

Do not rely only on score-panel highlighting.

This becomes especially important during device handoff and unknown-word review.

---

# 16. Score display

Both players' scores should always be easy to find while normal gameplay is visible.

Example:

```text
August     74
Anna       68
```

Do not emphasize the current score so strongly that it distracts from the board.

The UI may later show score gained by the current pending move as a preview.

---

# 17. Score preview

Once the current placement is physically valid and forms at least one word, the UI shows the
total score the move would receive if submitted right now, as a small badge on the board rather
than separate inline text — anchored on the pending move's first (reading-order) tile, one badge
for the whole move regardless of how many words it forms. The badge disappears whenever the
placement isn't currently valid (disconnected, a gap, no word yet) — there's nothing coherent to
preview in that state, and showing a stale or zero value there would be misleading.

This score is only a preview.

The interface must not imply that points have been awarded before the move is committed.

If an unknown word requires opponent approval, clearly indicate:

```text
18 poäng om läggningen godkänns
```

---

# 18. Primary turn actions

During a normal editable turn, the main actions are:

```text
Spela
Byt brickor
Passa
Avsluta spel
```

Secondary actions may include:

```text
Rensa
Blanda brickor
```

`Avsluta spel` (section 35a) ends the game immediately at either player's choice, instead of
waiting for the standard end conditions — it needs its own confirmation dialog given how
consequential it is. `Rensa` returns every pending tile to the rack in one step; `Blanda brickor`
reshuffles the rack's own tile order without affecting whose turn it is or what's on the board.

The UI should not clutter the game area with many equal-weight buttons.

`Spela` should be the primary action.

---

# 19. Submit move behaviour

When the player selects `Spela`, the application sends the pending placement to the game engine.

The engine may return:

### Valid normal move

Proceed to commit/handoff.

### Physically invalid move

Show a clear error and keep the player in editing mode.

### Unknown word(s)

Open the unknown-word confirmation flow.

### Forbidden word

Explain that the move cannot be played and keep the player in editing mode.

The UI must not perform its own word legality decisions.

---

# 20. Invalid move messages

Errors should be concise and actionable.

Examples:

```text
Första ordet måste täcka mittenrutan.
```

```text
Alla nya brickor måste ligga på samma rad eller kolumn.
```

```text
Läggningen måste ansluta till brickor som redan finns.
```

```text
Det här ordet är inte tillåtet.
```

Avoid technical wording.

---

# 21. Unknown word confirmation

If one newly formed word is unknown:

```text
"GRÖMP" finns inte i ordlistan.

Vill du spela läggningen ändå?

[ Ändra ]   [ Spela ändå ]
```

If several words are unknown:

```text
Följande ord finns inte i ordlistan:

GRÖMP
FLÄRP

Vill du spela läggningen ändå?

[ Ändra ]   [ Spela ändå ]
```

The whole move is proposed as one unit.

The player should understand that the opponent will decide.

---

# 22. Player declines proposal

If the current player selects:

```text
Ändra
```

the dialog closes.

The player returns to the same editable pending placement.

No handoff occurs.

No points are awarded.

No tiles are drawn.

---

# 23. Player confirms proposal

If the player selects:

```text
Spela ändå
```

the game enters the opponent-review handoff flow.

The proposing player's rack must be hidden before the opponent gains access.

---

# 24. Handoff screen

The hot-seat handoff is a critical privacy feature.

After a completed turn or before opponent review, show a full-screen transition.

Example:

```text
August är klar.

Lämna över enheten till Anna.

[ Fortsätt ]
```

Do not show either player's rack on this screen.

For an unknown-word review:

```text
Anna behöver ta ställning till Augusts läggning.

Lämna över enheten till Anna.

[ Fortsätt ]
```

Only after `Fortsätt` should private information relevant to Anna be revealed.

---

# 25. Normal next-player handoff

After a normal accepted move:

1. Commit move.
2. Hide current rack.
3. Show handoff screen.
4. Player physically passes device.
5. Next player selects `Fortsätt`.
6. Reveal next player's rack.

The next rack must not appear briefly before the handoff overlay.

Privacy should be enforced by rendering logic, not merely by placing a semi-transparent layer over visible rack content.

---

# 26. Opponent review screen

When an unknown word is awaiting approval, the reviewing opponent sees a dedicated screen.

Example:

```text
August vill spela:

GRÖMP

Ordet finns inte i ordlistan.

Läggningen ger 18 poäng om den godkänns.

[ Neka ]   [ Godkänn ]
```

If multiple unknown words exist:

```text
August vill spela en läggning med orden:

GRÖMP
FLÄRP

Orden finns inte i ordlistan.

[ Neka ]   [ Godkänn ]
```

The board should remain visible so the opponent can inspect the complete placement.

---

# 27. Information visible during opponent review

The opponent may see:

- Entire board
- Proposed tiles
- Unknown word(s)
- Score preview
- Player scores
- Who proposed the move

The opponent must not see the proposing player's rack.

The reviewing player's own rack does not need to be shown during the approval decision.

Keeping it hidden makes the decision screen cleaner and prevents confusion about whether their normal turn has started.

---

# 28. Opponent accepts

If the opponent selects:

```text
Godkänn
```

the UI should:

1. Send acceptance to the engine.
2. Commit the move.
3. Show a brief confirmation if useful.
4. Proceed to the normal handoff into the reviewing player's actual turn.

Example:

```text
GRÖMP godkändes.
August fick 18 poäng.
```

This can appear as a small history/event message rather than requiring another blocking dialog.

---

# 29. Opponent rejects

If the opponent selects:

```text
Neka
```

the UI should:

1. Send rejection to the engine.
2. Hide opponent-facing content.
3. Show a handoff back to the proposing player.

Example:

```text
Läggningen nekades.

Lämna tillbaka enheten till August.

[ Fortsätt ]
```

After `Fortsätt`:

- August's rack becomes visible.
- The rejected pending tiles remain on the board.
- They remain editable.
- No score has been awarded.

---

# 30. Rejected pending tile state

After returning to the proposing player, previously proposed tiles should still look pending/editable.

The UI may show a small non-blocking message:

```text
Anna nekade läggningen. Ändra den och försök igen.
```

Do not remove the tiles automatically.

Do not force the player to start the placement from scratch.

---

# 31. Accepted vocabulary indication

The game does not need to visually mark every accepted unknown word on the board permanently.

However, game history should make the decision visible.

For example:

```text
August spelade GRÖMP – godkänt av Anna – 18 p
```

If the word is used again later, it behaves as a normal accepted word for that game.

---

# 32. Game history

A compact history panel is useful.

Example:

```text
Historik

August: SKOG +12
Anna: pass
August: GRÖMP +18
  Godkänt av Anna
Anna: BIL +7
```

History should be generated from structured game events.

The panel defaults to expanded, with a `<details>`-style toggle so it can still be collapsed away
when it's not needed.

---

# 33. Tile bag information

Show the number of remaining tiles:

```text
41 brickor kvar
```

Do not show which tiles remain.

This information is useful without compromising gameplay.

---

# 34. Tile exchange UI

Selecting `Byt brickor` should enter an exchange mode.

Example:

```text
Välj brickor att byta
```

The player selects one or more rack tiles.

Then:

```text
[ Avbryt ] [ Byt 3 brickor ]
```

The UI should clearly state that exchanging consumes the turn.

Example:

```text
Att byta brickor avslutar din tur.
```

If exchange is not allowed under the current tile-bag rule, explain why.

---

# 35. Passing UI

Selecting `Passa` should require a lightweight confirmation because it ends the turn.

Example:

```text
Vill du passa?

Din tur avslutas utan att du spelar några brickor.

[ Avbryt ] [ Passa ]
```

Avoid requiring confirmation for low-risk editing actions, but turn-ending actions deserve confirmation.

---

# 35a. Manually ending the game

An explicit "Avsluta spel" action (game-rules.md section 29, DEC-013) lets either player end the
game immediately, without waiting for the standard end conditions. Because this is irreversible
for the whole match, not just the current turn, it needs a confirmation dialog with stronger
wording than the passing confirmation above.

Example:

```text
Vill du avsluta spelet i förtid?

Slutpoängen räknas ut som vanligt, men detta kan inte ångras.

[ Avbryt ] [ Avsluta spel ]
```

---

# 36. New-game protection

If the user attempts to start a new game while a saved game exists, avoid accidental data loss.

Example:

```text
Det finns redan ett pågående spel.

Vill du avsluta det och starta ett nytt?

[ Avbryt ] [ Starta nytt ]
```

---

# 37. Resume saved game

If a valid saved game exists, the start screen should offer:

```text
Fortsätt spel
```

The UI should restore the game into an appropriate privacy-safe state.

Do not immediately reveal whichever rack happened to be active when the browser closed.

A good default is to restore into a handoff/resume screen:

```text
Ett pågående spel hittades.

Lämna enheten till den spelare som ska fortsätta.

[ Fortsätt ]
```

The application can then reveal the correct player's state.

---

# 38. Refresh during pending move

If pending placements are persisted, reloading must not expose private information incorrectly.

After reload:

- Restore the authoritative game/pending move.
- Enter a neutral handoff/resume screen.
- Only reveal the appropriate player's editable rack after explicit continuation.

If pending interaction state is not persisted, document that clearly in `local-multiplayer.md`.

---

# 39. Game-over screen

At game end, show:

- Final scores
- Winner or tie
- Remaining-rack deductions
- The finished board
- Move history
- Clear new-game action

Example:

```text
Spelet är slut

August     312
Anna       298

August vinner!

Kvarvarande brickor:
August   −4
Anna     −12

Slutställning
[ the board, as it finished ]

Historik
…

[ Nytt spel ]
```

The board comes after the result rather than before it: the outcome is what players look for
first, and the board is what they then talk over. It is the same board component the game uses, so
it pans and pinch-zooms here too — useful for reading a crowded final position on a phone — but
nothing on it can be tapped, since there is no move left to make.

---

# 40. Responsive desktop layout

Desktop should provide enough width for:

- Board
- Score area
- Rack
- Optional history panel

The board should remain the dominant element.

Avoid huge sidebars that shrink the board unnecessarily.

---

# 41. Responsive mobile layout

On mobile:

```text
Scores / status
      ↓
Board
      ↓
Rack
      ↓
Actions
      ↓
History drawer
```

The board may require careful scaling or horizontal space management.

Fitting the whole 15x15 board to a phone's width puts a cell at roughly 22px, half of a
comfortable touch target, and the two cannot both be satisfied: fifteen columns at 44px need
about 724px of width. The board therefore zooms independently of the page:

- A two-finger pinch **on the board** scales the board alone, between fit-to-width and 3x. The
  rack, scores and action buttons keep their size and position, which is exactly what pinching
  the page cannot do.
- While zoomed, one finger dragging the board pans it, and a `Visa hela brädet` button returns to
  fit-to-width.
- A gesture that starts on a tile the player can pick up still drags that tile; panning never
  takes a gesture away from a tile drag.
- Zoom scales the tiles' real layout rather than painting a transform over the board, so tapping
  a square still lands on that exact square at any zoom level.
- Zoom is transient view state: it belongs to neither `GameState` nor the saved local session
  (`content-model.md` section 38), and it resets on reload.

Avoid relying on hover.

All important interactions must work via touch.

---

# 42. Board scaling

Tiles and board cells should scale together.

The board should preserve a square aspect ratio.

Use CSS layout rather than hard-coded pixel coordinates wherever practical.

The visual board should derive its dimensions from the configured board definition.

---

# 43. Accessibility

Important requirements:

- Buttons use semantic `<button>` elements.
- Form inputs have labels.
- Keyboard users can select tiles and squares.
- Focus states are clearly visible.
- Dialogs have proper accessible titles.
- Turn changes are communicated clearly.
- Color is not the only indicator of tile state or multiplier type.

A screen reader should be able to understand at least the essential game controls, even if fully describing a complex board is a later improvement.

---

# 44. Keyboard interaction

A reasonable keyboard model may include:

- Tab to move between rack/actions
- Enter/Space to select a rack tile
- Arrow keys or tabbing to board cells
- Enter/Space to place
- Escape to cancel selection/dialog where allowed

Keyboard behaviour can evolve, but components should not be built in a way that makes keyboard support impossible.

---

# 45. Multiplier labels

Special board squares should use short, readable labels.

Examples may include:

```text
2× bokstav
3× bokstav
4× bokstav
−2× bokstav
2× ord
3× ord
4× ord
```

Compact visual abbreviations may be used on the board if accessible names provide the full meaning.

Do not assume users already know every square by color.

---

# 46. Visual tone

Aim for a Scandinavian board-game feel:

- Clean
- Tactile
- Warm
- Minimal
- Not overly glossy
- Not childish
- Not corporate-dashboard-like

The interface can use subtle texture or depth, but readability comes first.

The first implementation should prioritize functional clarity over elaborate art direction.

---

# 47. Animation

Animations should be subtle and purposeful.

Good candidates:

- Tile moving from rack to board
- Score increment
- Handoff transition
- Tile settling after commit

Avoid:

- Long celebratory animations on every move
- Motion that delays gameplay
- Animating confidential rack content during handoff

Respect reduced-motion preferences.

---

# 48. Sound

Sound is optional and not required for the initial implementation.

Possible future sounds:

- Tile placement
- Move commit
- Approval
- Rejection
- Game end

The game must remain fully usable without sound.

---

# 49. Loading states

Version 1 should have very little runtime loading after startup because gameplay is local.

If dictionary preprocessing produces a sizeable asset, the app may show a lightweight initial loading state.

Avoid displaying blocking spinners during normal word validation if lookup is local and should be immediate.

---

# 50. Error recovery

Unexpected application errors should not destroy a saved game.

Where practical:

- Persist game state before/after meaningful transitions.
- Offer returning to the saved game after refresh.
- Avoid destructive recovery behaviour.

Do not expose raw stack traces to users in production.

---

# 51. UI component boundaries

Likely components include:

```text
StartScreen
GameSetup
GameScreen
ScoreBoard
Board
BoardCell
Tile
Rack
TurnActions
UnknownWordDialog
HandoffScreen
OpponentReview
ExchangeDialog
PassDialog
GameHistory
GameOverScreen
BlankLetterPicker
```

These names are illustrative.

Components should remain focused.

Do not create one giant `Game.tsx` containing the entire product.

---

# 52. Board component responsibility

The `Board` component may:

- Render cells
- Render committed tiles
- Render pending tiles
- Indicate interaction targets
- Emit user placement interactions

It must not decide:

- Whether placement is legal
- Which words are formed
- What score results
- Whether opponent approval is needed

Those decisions come from the engine/application layer.

---

# 53. Rack component responsibility

The rack may:

- Render the current player's tiles
- Track visual selection
- Emit tile-selection actions
- Indicate pending/exchange selection

It must not:

- Draw replacement tiles itself
- Alter tile ownership directly
- Know the opponent's rack contents

---

# 54. Dialog policy

Use dialogs for decisions that interrupt the normal flow:

- Unknown-word confirmation
- Pass confirmation
- Manual end-game confirmation
- Tile exchange confirmation
- New-game overwrite
- Blank letter choice

Do not show modal dialogs for routine informational messages.

Prefer inline or history feedback for events such as:

```text
GRÖMP godkändes.
```

---

# 55. Privacy policy for hot-seat UI

At any point, ask:

> Could the wrong player accidentally see private rack information?

Privacy-sensitive transitions include:

- End of normal turn
- Opponent unknown-word review
- Rejected move returning to original player
- Reload/resume

Use full handoff screens at these boundaries.

Never rely on the players remembering to look away while another rack is visible.

---

# 56. UI state versus game state

UI state may include:

```text
selectedTileId
selectedBoardCoordinate
exchangeSelection
activeDialog
handoffVisible
historyExpanded
```

These are not part of authoritative `GameState`.

Gameplay state such as:

```text
pendingMove
currentPlayer
score
acceptedVocabulary
```

comes from the game engine.

Keep the distinction clear.

---

# 57. V1 non-goals

Do not design or implement these screens in Version 1:

- Login
- Registration
- Friend list
- Matchmaking
- Online lobby
- Profile
- Notifications center
- Online chat
- Leaderboard
- Store
- Achievements

They belong to future phases.

---

# 58. Definition of done

The Version 1 UI is successful when:

- Two players can set up a game quickly.
- The board is the visual focus.
- Players can place, move, and remove pending tiles.
- Blank tiles are easy to assign.
- Current player and scores are clear.
- Invalid placements produce understandable feedback.
- Unknown words trigger a clear proposal flow.
- The opponent can inspect and accept/reject the complete move.
- Rejected tiles return to the original player in editable form.
- Player racks remain hidden during handoffs.
- Passing and exchanging are understandable.
- A saved game can be resumed safely.
- The game works well on desktop and tablet and remains usable on mobile.
- The UI renders engine decisions rather than duplicating game rules.
- The product already feels like a complete local digital board game.
