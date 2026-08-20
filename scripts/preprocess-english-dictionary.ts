/**
 * Builds src/data/dictionary/en-enable-words.json from the raw ENABLE word list source file.
 * See scripts/dictionary-raw-sources/README.md for where to download it.
 *
 * Like German and French, this source carries no part-of-speech tagging, so no
 * en-enable-exclusions.json is derived here — ENABLE was compiled specifically as a Scrabble
 * word source and already excludes proper nouns and abbreviations by its own curation (see
 * src/data/dictionary/SOURCE-en.md), so createEnglishWordClassificationRules() starts with empty
 * properNounOnly/abbreviationOnly sets, the same starting point used for German and French.
 *
 * Run with: node scripts/preprocess-english-dictionary.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW_SOURCES_DIR = path.join(
  import.meta.dirname,
  "dictionary-raw-sources",
);
const SOURCE_FILE = "enable1.txt";
const DATA_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
);
const WORDS_OUTPUT_PATH = path.join(DATA_DIR, "en-enable-words.json");

/** Pure English letters only — excludes anything with a space, hyphen, or digit. */
const PLAYABLE_WORD_PATTERN = /^[A-Z]+$/;

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

  const sortedWords = Array.from(words).sort((a, b) => a.localeCompare(b, "en"));

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(sortedWords), "utf-8");

  console.log(`Raw lines: ${lines.length}`);
  console.log(`Unique playable single-word forms: ${sortedWords.length}`);
  console.log(`Written to ${WORDS_OUTPUT_PATH}`);
}

main();
