# Tech Stack

## 1. Purpose

This document defines the technology choices for the project.

The stack should support:

- A maintainable local web game for Version 1
- A strongly typed and testable game engine
- Good developer experience with Claude Code
- Straightforward deployment
- A future path to online multiplayer
- A future backend without requiring a rewrite of the core game engine

The guiding principle is:

> Use a small, conventional TypeScript stack and avoid unnecessary infrastructure in Version 1.

---

## 2. Core language

Use:

> **TypeScript**

TypeScript should be used for:

- Game engine
- Application logic
- UI
- Tests
- Future backend/server code

Reasons:

- Strong typing is valuable for a rules-heavy game.
- Shared types can be reused between frontend and future backend.
- Game-state transitions are easier to model explicitly.
- Refactoring is safer.
- Tooling is mature.
- Claude Code works well with TypeScript codebases.

Avoid mixing JavaScript and TypeScript unless there is a specific reason.

---

## 3. Application framework

Use:

> **Next.js**

The project should use the modern Next.js application architecture.

Reasons:

- React-based UI
- Straightforward routing
- Good TypeScript integration
- Easy deployment
- Supports both client-side and server-side code
- Leaves room for future authenticated pages and backend endpoints
- Avoids needing to migrate from a purely frontend-only setup when online multiplayer is introduced

Version 1 should still behave primarily as a client-side game application.

Do not introduce server-side game infrastructure simply because Next.js supports it.

---

## 4. React

Use:

> **React**

React is responsible for rendering the game interface.

React components should handle:

- Board display
- Rack display
- Score display
- Turn handoff screens
- Dialogs
- Buttons
- Player-facing game history
- Local interaction state

React components must not implement authoritative game rules.

They should render state produced by the game/application layer and dispatch actions back to it.

---

## 5. Game engine

The game engine should be implemented as plain TypeScript.

It must not import from:

- React
- Next.js
- Browser DOM APIs
- CSS
- UI component libraries

A good dependency direction is:

```text
React / Next.js
      ↓
Application layer
      ↓
Game engine
```

Never:

```text
Game engine
      ↓
React
```

The game engine should be independently testable.

---

## 6. Project structure

A sensible initial project structure is:

```text
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── ...
├── components/
│   ├── game/
│   ├── board/
│   ├── rack/
│   └── common/
├── game/
│   ├── engine/
│   ├── model/
│   ├── rules/
│   ├── scoring/
│   ├── dictionary/
│   ├── configuration/
│   └── testing/
├── application/
│   ├── game-controller/
│   └── persistence/
├── data/
│   ├── board/
│   ├── tiles/
│   └── dictionary/
└── tests/
```

This structure may be refined during implementation.

The important principle is separation between:

- Web/UI code
- Application orchestration
- Pure game logic
- Static game data

---

## 7. Styling

Use:

> **CSS Modules**

or an equally simple locally scoped CSS approach supported naturally by the chosen Next.js setup.

The first version should not introduce a large design-system dependency.

Reasons:

- The game has a custom board-game interface.
- Most styling will be specific to this product.
- CSS Modules provide isolation without adding much complexity.
- Claude can reason about component-local styles easily.

Global CSS should be limited to:

- Reset/base styles
- Typography
- Root design tokens
- Page-level background/layout

---

## 8. Design tokens

Define shared visual values using CSS custom properties.

For example:

```css
:root {
  --spacing-sm: ...;
  --spacing-md: ...;
  --radius-md: ...;
  --tile-size: ...;
}
```

Use tokens for recurring values rather than duplicating magic numbers throughout CSS.

Do not build a complex design-token system in Version 1.

---

## 9. UI component library

Do not introduce a large UI component library initially.

Prefer custom components for:

- Buttons
- Dialogs
- Score panels
- Tile racks
- Game board
- Handoff screens

A lightweight accessibility-focused primitive library may be considered later if needed for difficult UI elements such as dialogs.

Do not adopt a component framework solely to accelerate initial styling.

---

## 10. State management

Do not use Redux, MobX, Zustand, or another global state-management library initially.

Start with:

- Plain TypeScript game state
- A small application/game controller
- React state/hooks where appropriate

The game engine should own gameplay transitions.

React should not maintain an independent duplicate copy of authoritative gameplay state.

If state-management complexity genuinely grows later, introduce a dedicated library only after there is a demonstrated need.

---

## 11. Game actions

UI interaction should be converted into explicit game actions.

For example:

```text
PLACE_TILE
REMOVE_TILE
MOVE_TILE
SUBMIT_MOVE
CONFIRM_UNKNOWN_WORD_PROPOSAL
ACCEPT_PROPOSED_MOVE
REJECT_PROPOSED_MOVE
PASS
EXCHANGE_TILES
```

The application layer dispatches these actions to the game engine.

The UI then renders the resulting state.

This keeps the application predictable and supports future server-authoritative multiplayer.

---

## 12. Testing framework

Use:

> **Vitest**

for unit and game-engine tests.

Reasons:

- Fast
- TypeScript-friendly
- Familiar Jest-style API
- Good fit for modern frontend tooling
- Suitable for pure game-engine tests

The majority of game-rule tests should run without rendering React.

---

The suite is split into two projects (`vitest.config.mts`): `engine` runs `src/game/**` in a
**Node** environment, and `ui` runs everything else in jsdom.

That split is a guarantee, not tidiness. The engine has to be usable on a server as well as in a
browser, and under jsdom a stray dependency on a browser global would pass every test while
leaving it unusable server-side. An ESLint rule covers the other half — engine code may not
import React, Next, components or the application layer, which running in Node would not catch.

---

## 13. React/component testing

Use:

> **React Testing Library**

for important UI behaviour.

Component tests should focus on user-visible behaviour such as:

- Player handoff
- Hidden racks
- Unknown-word confirmation
- Opponent approval screen
- Score display
- Disabled/enabled controls

Do not duplicate every game-engine rule in component tests.

The game engine should already have direct unit tests for those rules.

---

## 14. End-to-end testing

Use:

> **Playwright**

for a small number of critical end-to-end flows.

Important scenarios include:

### Complete normal turn

```text
Start game
→ place word
→ submit
→ score applied
→ handoff
→ next player
```

### Unknown word accepted

```text
Player places unknown word
→ confirms proposal
→ handoff
→ opponent accepts
→ move committed
→ next turn
```

### Unknown word rejected

```text
Player places unknown word
→ confirms proposal
→ opponent rejects
→ control returns
→ proposed tiles remain editable
```

### Reload recovery

```text
Start game
→ make progress
→ reload browser
→ game restores correctly
```

### Browsers

Run the suite in **Chromium and WebKit**. Every browser on an iPhone is required to use WebKit, so
it is the engine the game meets there whoever's browser a player prefers, and it is far from a
formality: a CSS feature that works in Chromium evaluated to zero in an older WebKit and made
every letter on the board invisible, which a Chromium-only suite had nothing to say about.

A test needing the Chrome DevTools Protocol — synthesising a two-finger pinch, for instance —
skips itself outside Chromium rather than failing.

### Deterministic games

Tiles are dealt at random, so a test that needs particular letters cannot rely on the draw. Such
a test builds a game from a fixed seed — `createGame` takes a random source, which the engine's
own tests already require — writes it into the same local storage the app reads on load, and
resumes it through the normal UI. Nothing is added to the application to make this possible.

Prefer that over skipping a test when the draw is unhelpful: a skipped test reports success while
covering nothing.

Do not create a very large end-to-end test suite initially.

Use unit tests for most rule combinations.

---

## 15. Linting

Use:

> **ESLint**

with the standard Next.js/TypeScript integration.

The goal is to catch:

- Invalid patterns
- Suspicious code
- Incorrect React usage
- Basic consistency problems

Avoid an excessively strict lint configuration that causes large amounts of low-value cleanup.

---

## 16. Formatting

Use:

> **Prettier**

Formatting should be automated and not debated manually.

Use a simple project-wide configuration.

Do not spend significant project effort customizing formatting preferences.

---

## 17. Package manager

Use:

> **npm**

unless the repository is deliberately initialized with another package manager before implementation begins.

Reasons:

- Universal availability
- Simple
- No special tooling assumptions
- Good compatibility with deployment environments and Claude Code

Do not mix package managers in the repository.

The lock file should be committed.

---

## 18. Runtime

Use a current supported LTS version of:

> **Node.js**

Do not lock this document to a specific Node patch/minor version.

The actual supported version should be declared in the project configuration once the repository is initialized.

The project should avoid depending on experimental Node APIs.

---

## 19. Dictionary storage

Version 1 should use a local/static dictionary representation.

Preferred conceptual flow:

```text
Source dictionary file
        ↓
Build/preprocessing script
        ↓
Normalized word data
        ↓
Runtime lookup
```

The application should not call an external dictionary API during gameplay.

A build-time preprocessing script may:

- Normalize casing
- Normalize Unicode
- Remove invalid entries
- Generate lookup data
- Add explicit exception/exclusion information

The dictionary implementation must follow `dictionary.md`.

---

## 20. Static configuration data

The following should be stored as data rather than hard-coded across functions:

- Board dimensions
- Board multiplier positions
- Tile distribution
- Tile point values
- Rack options
- All-tiles bonuses
- Language alphabet
- Dictionary configuration
- Allowed abbreviation exceptions
- Forbidden word metadata where required

Prefer TypeScript configuration modules or validated static data files.

---

## 21. Runtime data validation

For Version 1, do not automatically introduce a runtime-schema library everywhere.

Strong TypeScript types plus controlled constructors/load functions should be sufficient for most internal data.

Runtime validation is especially important at boundaries such as:

- Loading persisted game state
- Reading generated/static data
- Future API requests

If a schema-validation library becomes useful later, introduce it deliberately rather than using it for every internal object from the beginning.

---

## 22. Local persistence

Use:

> **localStorage**

for initial local-game persistence.

Store a serialized saved-game object containing:

- Schema version
- Game configuration version
- Game state
- Save metadata if needed

Persistence logic belongs in:

```text
application/persistence
```

not in the core game engine.

---

## 23. Persistence policy

Version 1 should automatically save meaningful state changes.

For example:

```text
Game state changes
       ↓
Application layer
       ↓
Serialize
       ↓
localStorage
```

On application startup:

```text
Saved game exists?
      ↓
Validate version/state
      ↓
Offer/resume game
```

The exact UI behaviour belongs in `local-multiplayer.md` and `ui-design.md`.

---

## 24. No database in Version 1

Do not add a database for the initial local game.

Version 1 does not require:

- PostgreSQL
- Supabase
- Firebase
- SQLite
- Server persistence

Browser storage is sufficient.

Adding a backend before it is needed would increase complexity without improving the first playable version.

---

## 25. Future database

For the online phase, the preferred direction is:

> **PostgreSQL**

A relational database is a good fit for:

- Users
- Friend relationships
- Matches
- Invitations
- Chat messages
- Notifications
- Match history
- Persistent game metadata

The serialized/structured authoritative game state can be stored alongside normalized relational data as appropriate.

The exact online schema should be designed later.

---

## 26. Future backend platform

A sensible future option is:

> **Supabase**

Potential uses include:

- PostgreSQL hosting
- Authentication
- Realtime features
- Database APIs
- User/session management

However:

> Supabase is not part of Version 1.

Do not introduce Supabase dependencies until online multiplayer work begins.

At that point, evaluate whether it still fits the project's needs before committing to it.

---

## 27. Future authentication

Authentication should not be implemented in Version 1.

For online multiplayer, use a mature authentication solution rather than building passwords/session security manually.

Authentication should remain separate from game-engine logic.

The game engine should know about:

```text
playerId
```

not login tokens or passwords.

---

## 28. Future online game server

When online multiplayer is introduced, game state should be server-authoritative.

The future flow should be:

```text
Client
  ↓ action
Server
  ↓
Game engine validates action
  ↓
Authoritative state updated
  ↓
Persist
  ↓
Send player-safe state/views
```

Do not make clients authoritative over:

- Scores
- Tile bags
- Opponent racks
- Move validity
- Dictionary decisions
- Turn state

The same TypeScript engine used locally should be reusable on the server where practical.

---

## 29. Future realtime communication

Online multiplayer will eventually need updates between players.

Potential approaches include:

- Supabase Realtime
- WebSockets
- Server-sent updates
- Polling for very simple turn-based behaviour

Do not choose or implement the realtime transport in Version 1.

Because the game is turn-based, realtime infrastructure does not need to be overly complex.

Correct persistent state is more important than millisecond latency.

---

## 30. Future chat

Chat should use the backend/social layer rather than the game engine.

Chat data should be persisted separately from game state.

Do not implement chat in Version 1.

---

## 31. Deployment

The initial application should be deployable as a standard Next.js web application.

A suitable hosting platform can be chosen once the first playable version exists.

The project should avoid unnecessary hosting-specific code.

The deployment should support:

- HTTPS
- Static assets
- Client-side game execution
- Future server routes if needed

---

## 32. Repository

Use:

> **Git**

The repository should be hosted on GitHub.

Commit:

- Source code
- Documentation
- Configuration
- Tests
- Lock file
- Dictionary metadata/license information
- Dictionary build scripts

Do not commit:

- Secrets
- Environment credentials
- Build output
- Temporary local files

---

## 33. Environment variables

Version 1 should require few or no secrets.

Future backend integrations may require environment variables.

Use standard environment configuration and never hard-code:

- API secrets
- Database passwords
- Service-role keys
- Authentication secrets

Client-visible environment variables must never contain privileged credentials.

---

## 34. CI

Once the project contains functioning code, add a simple GitHub Actions workflow.

It should run:

```text
Install dependencies
        ↓
Lint
        ↓
Type check
        ↓
Unit tests
        ↓
Build
```

End-to-end tests may be added to CI once they are stable.

Do not build a complicated CI/CD system initially.

---

## 35. Type checking

The project should use strict TypeScript settings where practical.

The goal is to prevent ambiguous domain state.

Prefer discriminated unions for states that have mutually exclusive variants.

For example, a turn state may be safer as:

```ts
type TurnState =
  | { type: "PLAYER_TURN"; playerId: string }
  | {
      type: "WAITING_FOR_OPPONENT_APPROVAL";
      proposingPlayerId: string;
      reviewingPlayerId: string;
    };
```

rather than several loosely related booleans such as:

```text
isWaiting
isOpponentTurn
hasProposal
isRejected
```

The exact types should be defined while implementing `game-engine.md`.

---

## 36. Dependency policy

Prefer:

- Standard platform APIs
- React/Next.js built-ins
- Small, focused dependencies
- Widely maintained libraries

Avoid dependencies for functionality that can be implemented clearly in a small amount of code.

Every significant dependency should have a clear purpose.

Do not introduce overlapping libraries that solve the same problem.

---

## 37. Drag and drop

Do not assume a drag-and-drop library is required.

For the initial board interaction, evaluate whether simple pointer/click interactions are sufficient.

A good mobile-compatible interaction may be:

```text
Select tile
    ↓
Select board square
```

with drag-and-drop as optional enhancement.

If drag-and-drop is introduced, use a maintained library only if native pointer handling becomes unnecessarily complex.

Game rules must remain independent of the interaction mechanism.

---

## 38. Responsive design

The website should support:

- Desktop
- Tablet
- Mobile where practical

The board should scale responsively, sized from the space its own container gives it rather than
from the window: the same board appears on screens with different amounts of surrounding chrome.

Avoid implementation choices that require a fixed desktop viewport.

The interaction model must remain usable on touch devices.

A web app manifest (`src/app/manifest.ts`) makes the game installable to a phone's home screen,
where it runs standalone with no browser address bar. That is not decoration: a mobile browser
shows and hides its address bar in response to document scrolling, and each toggle resizes the
viewport and moves the layout — including out from under a finger mid-drag. In a browser tab the
playing view avoids this by being pinned to the visible height (`ui-design.md` section 41);
installing removes the address bar from the picture entirely. Icons are generated from the game's
own tile colours by `scripts/generate-icons.mts`.

---

## 39. Accessibility

Use semantic HTML.

Important interactive elements should be keyboard accessible.

Dialogs should:

- Trap/focus appropriately
- Have clear labels
- Be dismissible only when game rules allow it

Do not rely solely on tile color to communicate gameplay meaning.

Accessibility should be considered throughout implementation rather than postponed entirely.

---

## 40. Internationalization

Version 1 UI is Swedish.

Do not build a large internationalization system initially.

However, avoid embedding user-facing strings inside the game engine.

UI strings should stay in the presentation/application layer.

When additional languages are introduced, a lightweight i18n solution can be added without changing the engine.

---

## 41. Logging and debugging

During development, structured debug information may be useful for:

- Game actions
- Validation results
- State transitions
- Scoring calculations

Avoid leaving noisy production console logging throughout the code.

The move history and deterministic engine tests should be the primary debugging tools for gameplay issues.

---

## 42. Security

Version 1 is local-only and has minimal security surface.

Still:

- Treat imported/static data as data, not executable code.
- Escape/render chat-like or player-entered text safely.
- Do not use unsafe HTML rendering for player names.
- Do not store secrets in frontend code.

Security requirements will increase substantially when online multiplayer is introduced.

---

## 43. Performance

Version 1 does not need advanced optimization.

The board and tile set are small.

Prioritize:

1. Correctness
2. Maintainability
3. Clear state transitions

before optimization.

Dictionary lookup should be efficient enough that a move validation feels immediate.

If performance issues occur, measure them before introducing complex optimizations.

---

## 44. Technology summary

Version 1:

```text
Language:
    TypeScript

Framework:
    Next.js

UI:
    React

Styling:
    CSS Modules + CSS custom properties

State:
    Game engine + application controller + React state
    No external global state library initially

Unit tests:
    Vitest

Component tests:
    React Testing Library

End-to-end tests:
    Playwright

Linting:
    ESLint

Formatting:
    Prettier

Package manager:
    npm

Runtime:
    Supported Node.js LTS

Persistence:
    localStorage

Database:
    None

Dictionary:
    Bundled/static Swedish word data
```

Future online direction:

```text
Database:
    PostgreSQL

Possible platform:
    Supabase

Authority:
    Server-authoritative game engine

Authentication:
    Managed authentication solution

Realtime:
    Chosen when online phase begins
```

---

## 45. Explicit non-choices for Version 1

Do not add these unless the project develops a concrete need:

- Redux
- Zustand
- MobX
- GraphQL
- Prisma
- Supabase
- Firebase
- WebSockets
- Docker
- Kubernetes
- Redis
- Microservices
- Tailwind CSS
- Large UI component frameworks
- External dictionary APIs
- Custom authentication

These are not inherently bad technologies.

They are simply unnecessary for the first local version.

---

## 46. Definition of done

The technical foundation is successful when:

- The project runs as a TypeScript Next.js application.
- The game engine can execute independently of React.
- Engine tests run with Vitest.
- React renders the game state rather than implementing game rules.
- Local game state can be serialized and persisted.
- The Swedish dictionary works without an external runtime API.
- The codebase has clear boundaries between UI, application logic, game engine, and static data.
- The project can be linted, type-checked, tested, and built automatically.
- No backend infrastructure is required to play Version 1.
- The same core game engine can later be moved behind a server-authoritative online game flow without a full rewrite.
