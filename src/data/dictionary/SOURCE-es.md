# Spanish dictionary source

Documented here per `docs/dictionary.md` section 33 (licensing) and `docs/decisions.md` DEC-010
(scoped-down multi-language slice) and DEC-011 (source selection).

## Source

Spanish Wiktionary (`es.wiktionary.org`), extracted into structured JSON by the
[wiktextract](https://github.com/tatuylonen/wiktextract) tool and republished by kaikki.org's
machine-readable-dictionary project.

- Project page: <https://kaikki.org/eswiktionary/index.html>
- Spanish-language export used: <https://kaikki.org/eswiktionary/Espa%C3%B1ol/index.html>
- Direct download: `kaikki.org-dictionary-Español.jsonl` (linked from the page above), ~1.4 GB.

## Version

- Extracted 2026-08-19 by kaikki.org, from an `eswiktionary` dump dated 2026-08-04 (per the
  export page's own stated provenance), using wiktextract commits `872fc7b`/`4deed51`.
- Downloaded: 2026-08-19.

## License

**Creative Commons Attribution-ShareAlike (CC BY-SA) + GFDL** (dual), inherited directly from
Wiktionary's own licensing. Verified directly on the export page: "This data is made available
under the same licenses as Wiktionary - both CC-BY-SA and GFDL." No discrepancy found (contrast
with French's `SOURCE-fr.md`, where a broken link on the primary site required cross-checking).

**Consequence of ShareAlike + GFDL**: `es-eswiktionary-words.json` and
`es-eswiktionary-exclusions.json` (these specific derived data files) must themselves remain
redistributable under CC BY-SA (with attribution) if shared/distributed further, and the GFDL
component carries its own additional compliance text if triggered — the same category of
obligation as French's Lexique383 file, not German's (CC0) or English's (public domain). This
does not affect Betapet's own application code license.

## Attribution

Content originates from Spanish Wiktionary contributors (`es.wiktionary.org`), extracted via
wiktextract (Tatu Ylonen) and republished by kaikki.org.

## Transformation performed

`scripts/preprocess-spanish-dictionary.ts`:

1. Streams the raw JSONL (too large — ~1.4 GB — to load fully into memory), one JSON object per
   line, each already representing one (word, part-of-speech) entry scoped to `lang_code: "es"`
   (this is the Spanish-target-language export, not the full multi-language Wiktionary dump).
2. Applies Unicode NFC normalization and uppercases each entry's `word` field.
3. Keeps only entries consisting entirely of standard Spanish letters
   (`A-ZÁÉÍÑÓÚÜ]+`) — this excludes multi-word phrases, hyphenated compounds, and
   apostrophe'd entries, none of which are physically playable as a single board word, and
   excludes a handful of loanword entries carrying non-Spanish diacritics (confirmed present in a
   small number of raw entries, e.g. "ö").
4. Deduplicates and sorts the result.

`es-eswiktionary-words.json` (826,336 entries) is the raw dictionary: `isWord()` returns `true`
for every entry the source contains, including proper names and abbreviations.

## Proper nouns and abbreviations

Unlike German/French/English, this source's `pos` field directly gives what SALDO's
part-of-speech tags gave for Swedish: `pos === "name"` corresponds to "Sustantivo propio" (proper
noun, confirmed against real entries: "España", "Francia", "Alemania", "Japón") and
`pos === "abbrev"` is an abbreviation. `scripts/preprocess-spanish-dictionary.ts` derives
`es-eswiktionary-exclusions.json` the same way the Swedish script does: a normalized word is
**proper-noun-only** if every `pos` ever seen for it across the source is `name` and nothing
else (28,849 words), and **abbreviation-only** if every `pos` ever seen is `abbrev` (255 words). A
word with any ordinary sense (e.g. a common noun that also happens to be a name) is not excluded,
the same rule Swedish uses.

Because country/month/weekday names generally *are* present in this dictionary as ordinary
entries (confirmed: "ENERO"/January and "LUNES"/Monday are common nouns, not proper-noun-tagged;
"ESPAÑA"/"FRANCIA" are dictionary entries tagged proper-noun-only), the Spanish
`allowedCountries`/`allowedMonths`/`allowedWeekdays` lists (`allowedCountriesEs.ts` etc.) behave
like Swedish's — they genuinely override the proper-noun exclusion for country names, unlike
French's or English's largely-inert equivalents (`SOURCE-fr.md`, `SOURCE-en.md`), where those
categories are mostly absent from the dictionary altogether rather than present-but-excluded.

## Related

- `docs/decisions.md` — DEC-010 (scoped-down multi-language slice) and DEC-011 (source selection,
  including the alternatives considered: Hunspell `es`/rla-es (disjunctive choice of GPL
  v3+/LGPL v3+/MPL v1.1+, rejected — same copyleft-on-data concern that ruled out Hunspell `sv`,
  despite unusually well-organized source files separating proper nouns/abbreviations/toponyms
  into their own files).
- `scripts/dictionary-raw-sources/README.md` — how to regenerate this file.
