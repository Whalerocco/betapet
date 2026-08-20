# Dictionary raw sources

This directory is gitignored: the raw source files are not committed (Swedish's alone total
~330 MB). It only exists locally when regenerating a `src/data/dictionary/*-words.json` file.

## Regenerating the Swedish dictionary

1. Download both files into this directory:
   - `saldo.xml` — <https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldo/saldo.xml>
   - `saldom.xml` — <https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldom/saldom.xml>
2. From the project root, run:
   ```
   node scripts/preprocess-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests (`npm test -- dictionary`)
   and check whether any gameplay-relevant behaviour changed, per `docs/dictionary.md` section 32.

See `docs/decisions.md` (DEC-001/DEC-003) and `src/data/dictionary/SOURCE-sv.md` for the source,
version, license, and attribution requirements.

## Regenerating the German dictionary

1. Download the word list into this directory as `de-words.txt`:
   - <https://raw.githubusercontent.com/hippler/german-wordlist/master/words>
2. From the project root, run:
   ```
   node scripts/preprocess-german-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests
   (`npm test -- dictionary`/`german`) per `docs/dictionary.md` section 32.

See `docs/decisions.md` (DEC-010/DEC-011) and `src/data/dictionary/SOURCE-de.md` for the source,
version, license, and attribution requirements.

## Regenerating the French dictionary

1. Download the TSV into this directory as `Lexique383.tsv`:
   - <http://www.lexique.org/databases/Lexique383/Lexique383.tsv> (note: plain `http`, not
     `https` — see `src/data/dictionary/SOURCE-fr.md` for why).
2. From the project root, run:
   ```
   node scripts/preprocess-french-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests
   (`npm test -- dictionary`/`french`) per `docs/dictionary.md` section 32.

See `docs/decisions.md` (DEC-010/DEC-011) and `src/data/dictionary/SOURCE-fr.md` for the source,
version, license (including a resolved license-link discrepancy worth reading), and attribution
requirements.

## Regenerating the English dictionary

1. Download the word list into this directory as `enable1.txt`:
   - <https://raw.githubusercontent.com/brokensandals/wordlists/master/lists/enable1.txt> (the
     original puzzlers.org distribution point no longer serves the raw file directly — see
     `src/data/dictionary/SOURCE-en.md`).
2. From the project root, run:
   ```
   node scripts/preprocess-english-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests
   (`npm test -- dictionary`/`english`) per `docs/dictionary.md` section 32.

See `docs/decisions.md` (DEC-010/DEC-011) and `src/data/dictionary/SOURCE-en.md` for the source
(note: switched from the originally-approved SCOWL to ENABLE during implementation — see
SOURCE-en.md for why), version, license, and attribution requirements.

## Regenerating the Spanish dictionary

1. Download the JSONL into this directory as `es-eswiktionary.jsonl` (~1.4 GB):
   - <https://kaikki.org/eswiktionary/Espa%C3%B1ol/kaikki.org-dictionary-Espa%C3%B1ol.jsonl>
2. From the project root, run:
   ```
   node scripts/preprocess-spanish-dictionary.ts
   ```
3. Review the summary counts it prints, then run the dictionary tests
   (`npm test -- dictionary`/`spanish`) per `docs/dictionary.md` section 32.

See `docs/decisions.md` (DEC-010/DEC-011) and `src/data/dictionary/SOURCE-es.md` for the source,
version, license, and attribution requirements.
