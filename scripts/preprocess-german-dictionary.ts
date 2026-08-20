/**
 * Builds src/data/dictionary/de-hippler-words.json from the raw hippler/german-wordlist source
 * file. See scripts/dictionary-raw-sources/README.md for where to download it.
 *
 * Unlike SALDO, this source is a plain one-word-per-line list with no part-of-speech tagging, so
 * no de-hippler-exclusions.json is derived here — the source's own curation policy already
 * excludes proper nouns, toponyms, abbreviations, archaic words, and outdated spellings (see
 * src/data/dictionary/SOURCE-de.md), so createGermanWordClassificationRules() starts with empty
 * properNounOnly/abbreviationOnly sets, the same starting point allowedAbbreviations.ts already
 * uses for Swedish's manual exceptions.
 *
 * Run with: node scripts/preprocess-german-dictionary.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW_SOURCES_DIR = path.join(
  import.meta.dirname,
  "dictionary-raw-sources",
);
const SOURCE_FILE = "de-words.txt";
const DATA_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
);
const WORDS_OUTPUT_PATH = path.join(DATA_DIR, "de-hippler-words.json");

/**
 * Pure German letters only, after uppercase normalization (which turns ß into SS, per standard
 * Unicode case mapping) — excludes loanwords carrying diacritics outside the German alphabet
 * (e.g. "Cœur", "Kōan", "Šeqel") and anything with a space/hyphen/digit, since none of those are
 * physically playable as a single board word.
 */
const PLAYABLE_WORD_PATTERN = /^[A-ZÄÖÜ]+$/;

function normalize(raw: string): string {
  return raw.trim().normalize("NFC").toUpperCase();
}

function main(): void {
  const filePath = path.join(RAW_SOURCES_DIR, SOURCE_FILE);
  console.log(`Reading ${filePath} ...`);
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  const words = new Set<string>();
  for (const line of lines) {
    const normalized = normalize(line);
    if (normalized.length > 0 && PLAYABLE_WORD_PATTERN.test(normalized)) {
      words.add(normalized);
    }
  }

  const sortedWords = Array.from(words).sort((a, b) => a.localeCompare(b, "de"));

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(sortedWords), "utf-8");

  console.log(`Raw lines: ${lines.length}`);
  console.log(`Unique playable single-word forms: ${sortedWords.length}`);
  console.log(`Written to ${WORDS_OUTPUT_PATH}`);
}

main();
