/**
 * Builds src/data/dictionary/es-eswiktionary-words.json and
 * src/data/dictionary/es-eswiktionary-exclusions.json from the raw Spanish-Wiktionary-via-
 * Wiktextract JSONL source file. See scripts/dictionary-raw-sources/README.md for where to
 * download it — too large (~1.4 GB) to commit to the repository.
 *
 * Each line of the source is one JSON object for one (word, part-of-speech) entry, already
 * scoped to lang_code "es" (Spanish-language entries only — this is the "Español" target-language
 * export, not the whole multi-language Wiktionary dump). The `pos` field directly gives what
 * SALDO needed part-of-speech tags to derive: `pos === "name"` is "Sustantivo propio" (proper
 * noun) and `pos === "abbrev"` is an abbreviation — confirmed against real sample entries
 * (España/Francia/Alemania tagged "name"). This script derives the exclusion sets the same way
 * the Swedish SALDO script does: a normalized word is proper-noun-only if every pos ever seen
 * for it is "name" and nothing else, and abbreviation-only if every pos ever seen is "abbrev".
 *
 * Run with: node scripts/preprocess-spanish-dictionary.ts
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

const RAW_SOURCES_DIR = path.join(
  import.meta.dirname,
  "dictionary-raw-sources",
);
const SOURCE_FILE = "es-eswiktionary.jsonl";
const DATA_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
);
const WORDS_OUTPUT_PATH = path.join(DATA_DIR, "es-eswiktionary-words.json");
const EXCLUSIONS_OUTPUT_PATH = path.join(
  DATA_DIR,
  "es-eswiktionary-exclusions.json",
);

/**
 * Pure standard Spanish letters only (after uppercase normalization) — excludes multi-word
 * phrases, hyphenated compounds, and apostrophe'd entries, none of which are physically playable
 * as a single board word, and excludes a handful of loanword entries carrying non-Spanish
 * diacritics (e.g. "ö", confirmed present in a small number of raw entries).
 */
const PLAYABLE_WORD_PATTERN = /^[A-ZÁÉÍÑÓÚÜ]+$/;

function normalize(raw: string): string {
  return raw.trim().normalize("NFC").toUpperCase();
}

interface WiktextractEntry {
  readonly word?: string;
  readonly pos?: string;
  readonly lang_code?: string;
}

async function main(): Promise<void> {
  const filePath = path.join(RAW_SOURCES_DIR, SOURCE_FILE);
  console.log(`Reading ${filePath} ...`);

  const words = new Set<string>();
  const posByWord = new Map<string, Set<string>>();
  let rawLineCount = 0;
  let parseErrorCount = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line) continue;
    rawLineCount++;
    let entry: WiktextractEntry;
    try {
      entry = JSON.parse(line) as WiktextractEntry;
    } catch {
      parseErrorCount++;
      continue;
    }
    if (entry.lang_code !== "es" || !entry.word || !entry.pos) continue;

    const normalized = normalize(entry.word);
    if (!PLAYABLE_WORD_PATTERN.test(normalized)) continue;

    words.add(normalized);
    let tags = posByWord.get(normalized);
    if (!tags) {
      tags = new Set();
      posByWord.set(normalized, tags);
    }
    tags.add(entry.pos);
  }

  const sortedWords = Array.from(words).sort((a, b) => a.localeCompare(b, "es"));

  const properNounOnly: string[] = [];
  const abbreviationOnly: string[] = [];
  for (const [word, tags] of posByWord) {
    if (tags.size === 1 && tags.has("name")) {
      properNounOnly.push(word);
    } else if (tags.size === 1 && tags.has("abbrev")) {
      abbreviationOnly.push(word);
    }
  }
  properNounOnly.sort((a, b) => a.localeCompare(b, "es"));
  abbreviationOnly.sort((a, b) => a.localeCompare(b, "es"));

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(sortedWords), "utf-8");
  writeFileSync(
    EXCLUSIONS_OUTPUT_PATH,
    JSON.stringify({ properNounOnly, abbreviationOnly }),
    "utf-8",
  );

  console.log(`Raw lines: ${rawLineCount}`);
  console.log(`JSON parse errors (skipped): ${parseErrorCount}`);
  console.log(`Unique playable single-word forms: ${sortedWords.length}`);
  console.log(`Proper-noun-only words: ${properNounOnly.length}`);
  console.log(`Abbreviation-only words: ${abbreviationOnly.length}`);
  console.log(`Written to ${WORDS_OUTPUT_PATH}`);
  console.log(`Written to ${EXCLUSIONS_OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
