# English dictionary source

Documented here per `docs/dictionary.md` section 33 (licensing) and `docs/decisions.md` DEC-010
(scoped-down multi-language slice) and DEC-011 (source selection, as updated below).

## Source

**ENABLE** ("Enhanced North American Benchmark Lexicon"), a word list compiled specifically as a
Scrabble word source by M. Cooper and Alan Beale.

- Original distribution point: <http://www.puzzlers.org/pub/wordlists/enable1.txt> — at the time
  of download this URL no longer served the raw file directly (the site has since migrated to
  WordPress and reorganized its file layout); the file was instead obtained from a GitHub mirror
  that documents the same source and public-domain status:
  <https://raw.githubusercontent.com/brokensandals/wordlists/master/lists/enable1.txt>

**Source substitution note (updates DEC-011):** DEC-011 originally approved SCOWL (size ≤60) for
English. During implementation, SCOWL turned out not to be distributable as a simple flat word
list — its own generator (`app.aspell.net/create`) and its GitHub releases only offer
Hunspell/Aspell dictionary packages (`.dic`/`.aff` affix files, or a binary Aspell format), which
require real dictionary-compilation tooling to expand into a flat list, unlike German/French's
sources. The project owner was informed and chose to switch to ENABLE instead — the other
already-researched, license-clean candidate from the original English research pass, and already
a plain flat word list requiring no build step.

## Version

- Downloaded: 2026-08-19, via the GitHub mirror above (its own commit history is the closest
  available version reference, since the original puzzlers.org page no longer states one).

## License

**Public domain.** ENABLE's own formal dedication (as quoted by the original research pass, and
consistent with the `brokensandals/wordlists` mirror's license table, which lists `enable1.txt` as
"Public Domain"):

> The ENABLE master word list, WORD.LST, is herewith formally released into the Public Domain.
> Anyone is free to use it or distribute it in any manner they see fit... This word list is our
> gift to the Scrabble community, as an alternate to "official" word lists. Game designers may
> feel free to incorporate the WORD.LST into their games.

No conditions at all — no attribution requirement, no share-alike, no commercial-use restriction.
Not legally required, but credited here as a courtesy to M. Cooper and Alan Beale.

## Transformation performed

`scripts/preprocess-english-dictionary.ts`:

1. Reads the raw file, one lowercase English word per line.
2. Applies Unicode NFC normalization and uppercases every line.
3. Keeps only entries consisting entirely of English letters (`A-Z]+`) — excludes anything
   containing a space, hyphen, or digit (none of which are physically playable as a single board
   word).
4. Deduplicates and sorts the result.

`en-enable-words.json` (172,823 entries) is the raw dictionary: `isWord()` returns `true` for
every entry the source contains.

## Proper nouns and abbreviations

Like German and French, this source carries no part-of-speech tagging, so no
`en-enable-exclusions.json` is generated — ENABLE was compiled specifically as a Scrabble word
source and already excludes proper names/place names by its own curation, so
`createEnglishWordClassificationRules()` starts with empty `properNounOnly`/`abbreviationOnly`
sets.

**Known behavioural consequence, not a bug** (same pattern as French's country names,
`SOURCE-fr.md`): standard English Scrabble word lists exclude proper nouns entirely, which
includes **months and weekdays** (capitalized proper nouns in English grammar, unlike Swedish's
lowercase common-noun months/weekdays) as well as country names. `isWord("JANUARY")`,
`isWord("MONDAY")`, and `isWord("SWEDEN")` are all `false` in this dictionary. The
`allowedMonths`/`allowedWeekdays`/`allowedCountries` allow-lists (`allowedMonthsEn.ts` etc.) are
therefore largely inert for English, the same way `allowedCountriesFr.ts` is for French — kept for
structural consistency with `WordClassificationRules` and in case a manual exclusion list is
added later, but months/weekdays/countries will generally classify as `UNKNOWN_WORD` (still
proposable) rather than automatically as `DICTIONARY_WORD`.

A small number of place-name-like entries may still exist in ENABLE despite its curation intent
(the same kind of imperfect-curation gap documented for German's "AACHENER"/"AACHENERIN" in
`SOURCE-de.md`) — treated as a known limitation, not hand-patched preemptively.

## Related

- `docs/decisions.md` — DEC-010 (scoped-down multi-language slice) and DEC-011 (source selection
  and the SCOWL → ENABLE substitution note above).
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
