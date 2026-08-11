# Dictionary raw sources

This directory is gitignored: the raw source files total ~330 MB and are not committed. It only
exists locally when regenerating `src/data/dictionary/sv-saldo-words.json`.

## Regenerating the dictionary

1. Download both files into this directory:
   - `saldo.xml` — <https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldo/saldo.xml>
   - `saldom.xml` — <https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldom/saldom.xml>
2. From the project root, run:
   ```
   node scripts/preprocess-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests (`npm test -- dictionary`)
   and check whether any gameplay-relevant behaviour changed, per `docs/dictionary.md` section 32.

See `docs/decisions.md` (dictionary source decision) and `src/data/dictionary/SOURCE.md` for the
source, version, license, and attribution requirements.
