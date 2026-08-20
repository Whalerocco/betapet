# German dictionary source

Documented here per `docs/dictionary.md` section 33 (licensing) and `docs/decisions.md` DEC-010
(scoped-down multi-language slice) and DEC-011 (source selection).

## Source

[`hippler/german-wordlist`](https://github.com/hippler/german-wordlist), a fork of
[`enz/german-wordlist`](https://github.com/enz/german-wordlist) (used by the word game Tanglet),
further adjusted for word-game/Scrabble suitability.

- Repository: <https://github.com/hippler/german-wordlist>
- Raw word list: <https://raw.githubusercontent.com/hippler/german-wordlist/master/words>

## Version

- Downloaded: 2026-08-19, from the `master` branch's `words` file at that time.

## License

**CC0 1.0 Universal** (public domain dedication) — verified against the repository's `COPYING`
file at download time. No conditions at all: no attribution requirement, no share-alike, no
commercial-use restriction. This is a stricter (simpler) license than Swedish's CC-BY-4.0 SALDO
source — nothing further is required to use, modify, or redistribute this data.

## Attribution

Not legally required by CC0, but credited here as a courtesy: word list originally compiled for
the [Tanglet](https://github.com/enz/german-wordlist) word game by its `enz`/`hippler`
maintainers.

## Transformation performed

`scripts/preprocess-german-dictionary.ts`:

1. Reads the raw file, one German word per line (mixed case, as standard German orthography
   capitalizes nouns).
2. Applies Unicode NFC normalization and uppercases every line — per standard Unicode case
   mapping, `ß` uppercases to `SS` (e.g. "straße" → "STRASSE"), consistent with modern German
   orthographic convention.
3. Keeps only entries consisting entirely of German letters (`A-ZÄÖÜ]+` after uppercasing) — this
   excludes multi-word phrases and loanwords carrying diacritics outside the German alphabet (for
   example "Cœur", "Kōan", "Šeqel"), none of which are physically playable as a single board word
   with Betapet's current (Swedish Scrabble-derived, per DEC-009) tile set and blank-tile
   alphabet in any case.
4. Deduplicates (case-insensitive, since step 2 already uppercases) and sorts the result.

`de-hippler-words.json` (675,423 entries) is the raw dictionary: `isWord()` returns `true` for
every entry the source contains.

## Proper nouns and abbreviations

Unlike SALDO, this source carries no part-of-speech tagging, so no `de-hippler-exclusions.json`
is generated. Instead, the source's own curation policy already excludes proper nouns, toponyms,
abbreviations, archaic words, and outdated spellings by rule (per the source repository's own
README: "names, proper nouns, toponyms, abbreviations, archaic words and outdated spellings are
not allowed"). `createGermanWordClassificationRules()`
(`src/game/dictionary/germanWordClassificationRules.ts`) therefore starts with empty
`properNounOnly`/`abbreviationOnly` sets — the same starting point Swedish's
`allowedAbbreviations.ts` used for its own manual exceptions — to be filled in only if real
playtesting (per `docs/roadmap.md` Milestone 4.4's precedent) surfaces specific gaps, rather than
guessed ahead of time.

Note: some entries are adjectival forms derived from place names (e.g. "AACHENER", "AACHENERIN" —
"from/of Aachen") that slipped past the source's own proper-noun/toponym exclusion policy. These
are treated the same way Swedish's own imperfect exclusion heuristic is (`SOURCE-sv.md`): a known,
accepted limitation rather than something hand-patched preemptively.

German allowed-countries/months/weekdays/abbreviations lists (the explicit-allow overrides
described in `docs/dictionary.md` sections 12-14) are separately maintained, translated German
equivalents of the existing Swedish lists — see `src/game/dictionary/allowedCountriesDe.ts`,
`allowedMonthsDe.ts`, `allowedWeekdaysDe.ts`, `allowedAbbreviationsDe.ts`.

## Related

- `docs/decisions.md` — DEC-010 (scoped-down multi-language slice) and DEC-011 (source selection,
  including the alternatives considered: Hunspell `de_DE`/igerman98 (GPL-only, rejected — stronger
  copyleft than the already-rejected Swedish LGPL case), DWDS (CC BY-ND, rejected — forbids
  derivatives), OpenThesaurus and German Wiktionary (both share-alike licensed, viable but a
  weaker fit than this CC0 source).
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
