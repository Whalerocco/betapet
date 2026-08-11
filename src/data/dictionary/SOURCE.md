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

The output (`sv-saldo-words.json`, 885,438 entries) is **not** filtered for proper names, place
names, or abbreviations — SALDO/SALDOM's part-of-speech data is not yet carried through the
pipeline. That filtering is a separate, later concern (`docs/roadmap.md` Milestone 2.2, "Word
classification") layered on top of this raw lexical data, per `docs/dictionary.md` section 5's
explicit separation between "does this word exist in the dictionary" and "is this category of
word permitted by the game rules." Until Milestone 2.2 lands, `isWord()` will return `true` for
some words the finished game rules will reject (e.g. `STOCKHOLM`).

## Related

- `docs/decisions.md` — decision log entry for choosing this source over the alternative
  considered (hunspell-sv, LGPL-3.0).
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
