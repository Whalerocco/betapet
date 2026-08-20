/**
 * Builds src/data/dictionary/fr-lexique383-words.json from the raw Lexique383 TSV source file.
 * See scripts/dictionary-raw-sources/README.md for where to download it.
 *
 * Lexique383's `ortho` column gives every inflected surface form (not just lemmas) — e.g. the
 * lemma "manger" also produces separate rows for "mange", "mangea", "mangeaient", etc. — so this
 * script collects `ortho` from every data row, not only rows where `islem` is set.
 *
 * Like the German source, Lexique383 carries no proper-noun category in its grammatical-category
 * column (`cgram`; confirmed values: ADJ, ADV, ART, AUX, CON, LIA, NOM, ONO, PRE, PRO, VER — no
 * proper-noun tag exists at all, since Lexique is a common-vocabulary lexicon, not a name
 * gazetteer) — so no fr-lexique383-exclusions.json is derived here, the same as German.
 *
 * Run with: node scripts/preprocess-french-dictionary.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW_SOURCES_DIR = path.join(
  import.meta.dirname,
  "dictionary-raw-sources",
);
const SOURCE_FILE = "Lexique383.tsv";
const DATA_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
);
const WORDS_OUTPUT_PATH = path.join(DATA_DIR, "fr-lexique383-words.json");

/**
 * Pure standard French letters only (after uppercase normalization) — excludes multi-word
 * phrases, hyphenated compounds (e.g. "abat-jour"), and apostrophe'd entries (e.g.
 * "aujourd'hui"), none of which are physically playable as a single board word, and excludes
 * loanword entries carrying non-French diacritics (e.g. "ñ", "ã", "ö", found in a handful of
 * Spanish/Portuguese/German-origin loanwords in the raw data).
 */
const PLAYABLE_WORD_PATTERN = /^[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ]+$/;

function normalize(raw: string): string {
  return raw.trim().normalize("NFC").toUpperCase();
}

function main(): void {
  const filePath = path.join(RAW_SOURCES_DIR, SOURCE_FILE);
  console.log(`Reading ${filePath} ...`);
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  const header = lines[0].split("\t");
  const orthoIndex = header.indexOf("ortho");
  if (orthoIndex === -1) {
    throw new Error("Could not find 'ortho' column in Lexique383 header");
  }

  const words = new Set<string>();
  let dataRowCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    dataRowCount++;
    const ortho = line.split("\t")[orthoIndex];
    if (!ortho) continue;
    const normalized = normalize(ortho);
    if (PLAYABLE_WORD_PATTERN.test(normalized)) {
      words.add(normalized);
    }
  }

  const sortedWords = Array.from(words).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(sortedWords), "utf-8");

  console.log(`Raw data rows: ${dataRowCount}`);
  console.log(`Unique playable single-word forms: ${sortedWords.length}`);
  console.log(`Written to ${WORDS_OUTPUT_PATH}`);
}

main();
