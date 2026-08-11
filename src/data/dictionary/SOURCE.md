# Dictionary source

Documented here per `docs/dictionary.md` section 33 (licensing) and section 41 (open decisions
before implementation).

## Source

**SALDO** and **SALDOM** (SALDO's morphology), published by Språkbanken Text, University of
Gothenburg.

- SALDO: <https://spraakbanken.gu.se/resurser/saldo>
- SALDOM: <https://spraakbanken.gu.se/en/resources/saldom>

## Version

- SALDO: last updated 2017-09-19 (per the source page at time of download).
- SALDOM: last updated 2017-09-19 (per the source page at time of download).
- Downloaded: 2026-08-11.

## License

Creative Commons Attribution 4.0 International (CC-BY-4.0). Free to download and use, no
payment, no registration or institutional affiliation required (verified at time of download).

## Attribution

> Borin, Lars, Lönngren, Lennart, & Forsberg, Markus (2017). SALDO (uppdaterad: 2017-09-19).
> [Data set]. Bearbetad och distribuerad av Språkbanken.

## Transformation performed

`scripts/preprocess-dictionary.ts` extracts every `writtenForm` value (from both the base lemma
and every inflected `WordForm`) out of the SALDO and SALDOM LMF/XML source files, then:

1. Decodes XML entities and applies Unicode NFC normalization.
2. Uppercases the result.
3. Keeps only entries consisting entirely of Swedish letters (`A-ZÅÄÖ`) — this excludes
   multi-word phrases, hyphenated compounds, and anything containing digits or punctuation,
   since none of those are physically playable as a single board word.
4. Deduplicates and sorts the result.

`sv-saldo-words.json` (885,438 entries) is the raw dictionary: `isWord()` returns `true` for
proper names and abbreviations too, per `docs/dictionary.md` section 5's explicit separation
between "does this word exist in the dictionary" and "is this category of word permitted by the
game rules."

The word-classification layer (Milestone 2.2) additionally uses SALDO/SALDOM's part-of-speech
tags to derive `sv-saldo-exclusions.json`: a normalized word is **proper-noun-only** if every
sense tagged in the source data is `pm` (egennamn) and nothing else, and **abbreviation-only** if
every sense's tag ends in `a` (SALDO's abbreviation-variant suffix — confirmed against real
entries: `nna` → "A3"/"A4", `pma` → "BBC"/"CIA"/"DDR", `vba` → "jfr"/"obs"). A word with any
ordinary sense (e.g. a common noun that also happens to be a surname) is not excluded.

This heuristic is not perfect — it depends on SALDO's own tagging, which is not fully
consistent. For example "Stockholm" is tagged `pma` in SALDO rather than plain `pm`, so it is
not currently caught by either exclusion set and will pass as `DICTIONARY_WORD` until this is
refined. Given `docs/dictionary.md` section 31's "do not build a sophisticated NLP system"
guidance and that `docs/roadmap.md` Milestone 4.4 (real playtesting) explicitly anticipates
finding and fixing exactly this kind of dictionary/classification gap, this is treated as a
known, acceptable limitation rather than something to perfect now.

Countries (`allowedCountries.ts`), months, and weekdays are explicit overrides for this
exclusion, per `docs/dictionary.md` sections 12-14. The country list is scoped to sovereign UN
member states (Swedish short-form names) rather than sub-national regions, dependent
territories, or disputed/partially-recognized states — a deliberate choice to keep the list on
one neutral, well-defined basis instead of this project taking its own position on contested
sovereignty. See `docs/decisions.md` (DEC-004).

## Related

- `docs/decisions.md` — decision log entries for choosing this source over the alternative
  considered (hunspell-sv, LGPL-3.0), and for the country-list scope.
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
