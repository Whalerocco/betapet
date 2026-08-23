# Betapet

A Swedish Alfapet-inspired word-board game, built as a local two-player (hot-seat) web game with
a planned path to online multiplayer.

The distinctive mechanic: a word that isn't in the dictionary can still be played if the
proposing player asks for it and the opponent explicitly accepts it. Accepted words then stay
valid for the rest of that game.

## Requirements

- Node.js **24** or later (see `engines` in `package.json`)
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Two players can play locally on one
device — no account, server, or network connection required.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run a production build (after `npm run build`) |
| `npm test` | Run the Vitest unit/integration suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run e2e` | Run the Playwright end-to-end suite (builds and serves the app first) |
| `npm run playtest` | Build and serve on the local network for testing on a phone or tablet (see below) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writes changes |
| `npm run format:check` | Prettier, check only |

Before considering any change done, run `typecheck`, `lint`, `test`, and `build` — CI runs the
same checks.

### Playtesting on a phone or tablet

```bash
PORT=3001 npm run playtest          # or just: npm run playtest, on port 3000
ipconfig getifaddr en0              # macOS: the address to open on the device
```

Then open `http://<that-address>:<port>` on a device on the same Wi-Fi.

Two things this handles that a plain `npm start` does not:

- **Plain HTTP on a LAN address is not a secure context**, so `crypto.randomUUID` and friends are
  unavailable there. The game works anyway (see `generateId` in `src/game/model/ids.ts`), but keep
  it in mind when adding browser APIs — several are silently missing outside HTTPS and localhost.
- **`npm run playtest` sends `Cache-Control: no-store` for the HTML document**, so the device
  always gets what was last built. Next serves prerendered pages with a long `s-maxage` and
  nothing addressed to a private cache, which lets a phone keep a stored copy of the document —
  and since that document names the hashed JS bundles, a stale copy pins the browser to an old
  build however often you reload. The hashed bundles themselves keep their immutable caching;
  they cannot go stale, because their filenames change with their contents.

The no-store behaviour is opt-in via `BETAPET_NO_STORE=1`, which the script sets for both the
build and the server — custom headers are baked into the build, so setting it only at start time
would do nothing. Without it the config emits no headers at all, leaving production behaviour
untouched.

## Project structure

```text
src/
├── app/            Next.js app router pages
├── components/     React UI components (board, rack, setup, dialogs, ...)
├── application/    Application/controller layer between the UI and the engine
│                   (game-controller, persistence, async language loading)
├── game/           The game engine — pure TypeScript, no React/DOM dependency
│   ├── model/      Core types: GameState, board, tiles, players, modifiers, ...
│   ├── engine/     Actions that transition GameState (submitMove, pass, exchange, ...)
│   ├── rules/      Physical placement validation, word detection
│   ├── scoring/     Scoring
│   ├── dictionary/ Word classification and per-language dictionaries
│   └── configuration/ Swedish game configuration (board, tiles, rack sizes)
├── data/           Generated/static data (board layout, tile sets, dictionaries)
└── tests/          Shared test setup

docs/               Specification documents — see below
scripts/            One-off/maintenance scripts (e.g. dictionary preprocessing)
e2e/                Playwright end-to-end tests
```

The game engine (`src/game/`) is kept independent of React and the browser, since the same
engine is intended to eventually run both the local game and a future online/server version.

## Documentation

This project is spec-driven: `docs/` is the source of truth for game rules and architecture, and
implementation should follow it rather than the other way around. Start with:

- **`CLAUDE.md`** (repo root) — instructions and conventions for working on this codebase
  (also read by Claude Code automatically).
- **`docs/vision.md`** — what the project is and why.
- **`docs/game-rules.md`** — the authoritative Swedish Alfapet rules this game implements.
- **`docs/game-engine.md`** — authoritative engine behaviour and state model.
- **`docs/dictionary.md`** — dictionary/word-validity rules.
- **`docs/content-model.md`**, **`docs/architecture.md`**, **`docs/ui-design.md`**,
  **`docs/tech-stack.md`** — data model, architecture, UI, and technology decisions.
- **`docs/game-modifiers.md`** — optional gameplay modifiers (Crisscross, Replace, Illegal,
  Polyglot, Wild).
- **`docs/roadmap.md`** / **`docs/tasks.md`** — milestone sequencing and the implementation
  checklist.
- **`docs/decisions.md`** — the decision log: what was decided, why, and what alternatives were
  considered, for anything not already dictated by a spec document.
- **`docs/known-bugs.md`** — defects found in play, with a dated note on each one's fix.

## Languages and dictionaries

Word validity is checked against real dictionary data, not a hand-written word list. Swedish is
the base language (and the only one with a matching physical board/tile set — see `decisions.md`
DEC-009); German, French, English, and Spanish are also supported as dictionary-only additions
for the Polyglot and Wild gameplay modifiers (`docs/game-modifiers.md`).

Each language's source, version, and license are documented in
`src/data/dictionary/SOURCE-<lang>.md`. Licenses vary by language (from public domain to
attribution/share-alike) — check the relevant `SOURCE-*.md` before reusing that data elsewhere.

Dictionaries are pre-processed from raw source data into the JSON files committed under
`src/data/dictionary/`; the raw sources themselves are not committed (some are hundreds of MB).
To regenerate a dictionary, see `scripts/dictionary-raw-sources/README.md`.

Non-Swedish dictionaries are only downloaded by a player's browser on demand (via code-split
dynamic imports), so a normal Swedish-only game never pays for languages it doesn't use.

## Testing

- **Unit/integration** (Vitest + React Testing Library): `npm test`. Game-rule logic in
  `src/game/` is the highest-priority area for coverage — add tests for normal behaviour, invalid
  moves, and edge cases alongside any engine change.
- **End-to-end** (Playwright): `npm run e2e`. Covers the core gameplay flows (normal moves,
  unknown-word proposal/accept/reject, refresh recovery, full game completion) through the real
  UI.

## Status

Local two-player Version 1 is functionally complete; see `docs/tasks.md` for the detailed
checklist and `docs/roadmap.md` for what's next (online multiplayer is a later phase and hasn't
been started).
