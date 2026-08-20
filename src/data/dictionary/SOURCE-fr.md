# French dictionary source

Documented here per `docs/dictionary.md` section 33 (licensing) and `docs/decisions.md` DEC-010
(scoped-down multi-language slice) and DEC-011 (source selection).

## Source

**Lexique383**, by Boris New and Christophe Pallier (CNRS-affiliated).

- Project site: <http://www.lexique.org/>
- Direct download used: <http://www.lexique.org/databases/Lexique383/Lexique383.tsv>
  (note: `https://www.lexique.org` fails its own TLS certificate check — the certificate does not
  cover the bare/`https` host; the plain `http://www.lexique.org` URL above works and was used to
  download this file.)

## Version

- Lexique 3.83, last modified 2019-06-04 per the file's HTTP `Last-Modified` header.
- Downloaded: 2026-08-19.
- Note: `lexique.org` now also offers a newer "Lexique 4.00" — not used here, since 383 was the
  version researched and approved (DEC-011). Revisit if a future update is warranted.

## License

**Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.

Verified two independent ways at download time:

1. The download page's license link text reads "Creative Commons Attribution – Partage dans les
   mêmes conditions 4.0" (= Attribution-ShareAlike).
2. A GitHub mirror that redistributes this exact dataset
   (<https://github.com/SekouDiaoNlp/pylexique>) independently states, in its own README:
   "License: CC BY SA 4.0", linking to a file named `LICENSE-CC-BY-SA4.0.txt`.

**Known discrepancy, resolved by the project owner:** the license link on lexique.org's own page
has the correct visible text above, but its underlying URL (`href`) actually points to
`creativecommons.org/licenses/by-nc/4.0/` (Attribution-**NonCommercial** — a materially different
license) rather than `.../by-sa/4.0/`. Given two independent sources agree on BY-SA and only the
raw href disagrees, this was judged a broken/mistyped link on the live site rather than the
license actually being NC, and the project owner explicitly confirmed proceeding on that basis.
If this ever needs re-litigating, re-check both sources above for whether either has since been
corrected.

**Consequence of ShareAlike**: `fr-lexique383-words.json` (this specific derived data file) must
itself remain redistributable under CC BY-SA 4.0 with attribution if shared/distributed further —
unlike the German (CC0, no obligation) or Swedish (CC-BY-4.0, attribution only, no share-alike)
dictionary files. This does not affect Betapet's own application code license.

## Attribution

> New, B., Pallier, C., Brysbaert, M., Ferrand, L. (2004) Lexique 2: A New French Lexical
> Database. Behavior Research Methods, Instruments, & Computers, 36 (3), 516-524.

## Transformation performed

`scripts/preprocess-french-dictionary.ts`:

1. Reads the raw TSV, collecting the `ortho` (orthographic form) column from every data row —
   this column already contains every inflected surface form (not just lemmas): e.g. the lemma
   "manger" also has separate rows for "mange", "mangea", "mangeaient", and so on.
2. Applies Unicode NFC normalization and uppercases every value.
3. Keeps only entries consisting entirely of standard French letters
   (`A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ`) — this excludes multi-word phrases, hyphenated compounds (e.g.
   "abat-jour"), and apostrophe'd entries (e.g. "aujourd'hui"), none of which are physically
   playable as a single board word, and excludes a handful of loanword entries carrying
   non-French diacritics (e.g. "ñ", "ã", "ö", found in some Spanish/Portuguese/German-origin
   loanwords in the raw data).
4. Deduplicates and sorts the result.

`fr-lexique383-words.json` (121,047 entries) is the raw dictionary: `isWord()` returns `true` for
every entry the source contains.

## Proper nouns and abbreviations

Lexique383's grammatical-category column (`cgram`) has no proper-noun tag at all (confirmed
values: `ADJ`, `ADV`, `ART`, `AUX`, `CON`, `LIA`, `NOM`, `ONO`, `PRE`, `PRO`, `VER`) — it is a
common-vocabulary lexicon, not a name gazetteer, so it simply does not include most proper
names/place names/country names in the first place (rather than including-and-tagging them, the
way SALDO does for Swedish). `createFrenchWordClassificationRules()` therefore starts with empty
`properNounOnly`/`abbreviationOnly` sets, the same starting point used for German.

**Known behavioural consequence, not a bug**: because country names are largely absent from the
raw dictionary itself (e.g. `isWord("FRANCE")` is `false`), the French `allowedCountries` list
(`allowedCountriesFr.ts`) does not have the same practical effect Swedish's does — Swedish's SALDO
source does include country names as ordinary dictionary entries, so its allow-list genuinely
overrides an exclusion; French's mostly cannot, since there is nothing there to override. A French
country name will typically classify as `UNKNOWN_WORD` (still proposable via the normal
unknown-word approval flow) rather than automatically as `DICTIONARY_WORD`. Months and weekdays
are unaffected by this, since Lexique383 does include them as ordinary common-vocabulary entries.
The allow-list infrastructure is kept for structural consistency with `WordClassificationRules`
and to be ready if a manual proper-noun/abbreviation exclusion list is ever added later — the same
posture as Swedish's initially-empty `allowedAbbreviations.ts`.

French allowed-countries/months/weekdays/abbreviations lists are hand-translated equivalents of
the existing Swedish lists — see `src/game/dictionary/allowedCountriesFr.ts`, `allowedMonthsFr.ts`,
`allowedWeekdaysFr.ts`, `allowedAbbreviationsFr.ts`. Best-effort, not a licensing decision; easy to
correct if real playtesting (`docs/roadmap.md` Milestone 4.4) finds an error. Written without
spaces, hyphens, or apostrophes (e.g. "CORÉEDUSUD" not "Corée du Sud") since a board word can
never contain any of those. Where a country has both a common current and an older/alternate
French name, both are included (mirroring the Swedish list's own BELARUS/VITRYSSLAND pair).

## Related

- `docs/decisions.md` — DEC-010 (scoped-down multi-language slice) and DEC-011 (source selection,
  including the alternatives considered: Dicollecte/Grammalecte Hunspell `fr` (MPL 2.0, rejected —
  same copyleft-on-data concern that ruled out Hunspell `sv`), Morphalou 3.1 (LGPL-LR, viable
  backup, larger but requires ORTOLANG registration), French Wiktionary/Wiktextract (CC BY-SA +
  GFDL, viable but lower curation quality and extra GFDL compliance overhead).
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
