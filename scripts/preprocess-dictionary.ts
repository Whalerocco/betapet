/**
 * Builds src/data/dictionary/sv-saldo-words.json and
 * src/data/dictionary/sv-saldo-exclusions.json from the raw SALDO/SALDOM LMF XML source files.
 * See scripts/dictionary-raw-sources/README.md for where to download those files — they are
 * too large to commit to the repository and are not required except when regenerating this
 * data (dictionary.md section 32: dictionary updates are a deliberate, occasional, documented
 * operation).
 *
 * SALDO's part-of-speech tags (documented at
 * https://spraakbanken.gu.se/en/resources/saldom) let this script derive, from the source data
 * itself rather than a guessed heuristic, which normalized words are:
 *   - proper-noun-only: every sense tagged "pm" (egennamn) and nothing else.
 *   - abbreviation-only: every sense's tag ends in "a" (SALDO's abbreviation-variant suffix,
 *     confirmed against real entries: nna -> "A3"/"A4", pma -> "BBC"/"CIA"/"DDR", vba -> "jfr"/
 *     "obs").
 * A word with at least one ordinary sense (e.g. a common noun that also happens to be a
 * surname) is not excluded — dictionary.md section 10 only asks to exclude words whose
 * dictionary presence *is* the proper name/abbreviation.
 *
 * Run with: node scripts/preprocess-dictionary.ts
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

const RAW_SOURCES_DIR = path.join(
  import.meta.dirname,
  "dictionary-raw-sources",
);
const SOURCE_FILES = ["saldo.xml", "saldom.xml"];
const DATA_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
);
const WORDS_OUTPUT_PATH = path.join(DATA_DIR, "sv-saldo-words.json");
const EXCLUSIONS_OUTPUT_PATH = path.join(DATA_DIR, "sv-saldo-exclusions.json");

const LEXICAL_ENTRY_START = "<LexicalEntry";
const LEXICAL_ENTRY_END = "</LexicalEntry>";
const WRITTEN_FORM_PATTERN = /<feat att="writtenForm" val="([^"]*)"/;
const PART_OF_SPEECH_PATTERN = /<feat att="partOfSpeech" val="([^"]*)"/;
/** Pure Swedish letters only: a playable board word can't contain a space, hyphen, or digit. */
const PLAYABLE_WORD_PATTERN = /^[A-ZÅÄÖ]+$/;

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function unescapeXml(value: string): string {
  return value.replace(
    /&(#\d+|#x[0-9a-fA-F]+|\w+);/g,
    (match, entity: string) => {
      if (entity.startsWith("#x")) {
        return String.fromCodePoint(parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(parseInt(entity.slice(1), 10));
      }
      return XML_ENTITIES[entity] ?? match;
    },
  );
}

function normalize(raw: string): string {
  return unescapeXml(raw).normalize("NFC").toUpperCase();
}

interface ExtractionResult {
  readonly rawWrittenFormCount: number;
  readonly rawEntryCount: number;
}

/**
 * Streams the file line by line, grouping writtenForm values by the LexicalEntry they belong
 * to so each can be associated with that entry's partOfSpeech (every LexicalEntry in SALDO/
 * SALDOM has exactly one partOfSpeech, shared by its lemma and all of its inflected forms).
 */
async function extractEntries(
  filePath: string,
  posByWord: Map<string, Set<string>>,
): Promise<ExtractionResult> {
  let rawWrittenFormCount = 0;
  let rawEntryCount = 0;
  let currentPartOfSpeech: string | undefined;
  let currentWords: string[] = [];

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  const flushEntry = (): void => {
    if (currentPartOfSpeech) {
      for (const word of currentWords) {
        let tags = posByWord.get(word);
        if (!tags) {
          tags = new Set();
          posByWord.set(word, tags);
        }
        tags.add(currentPartOfSpeech);
      }
    }
    currentPartOfSpeech = undefined;
    currentWords = [];
  };

  for await (const line of rl) {
    if (line.includes(LEXICAL_ENTRY_START)) {
      flushEntry();
      rawEntryCount++;
    } else if (line.includes(LEXICAL_ENTRY_END)) {
      flushEntry();
      continue;
    }

    const posMatch = PART_OF_SPEECH_PATTERN.exec(line);
    if (posMatch && !currentPartOfSpeech) {
      currentPartOfSpeech = posMatch[1];
    }

    const writtenFormMatch = WRITTEN_FORM_PATTERN.exec(line);
    if (writtenFormMatch) {
      rawWrittenFormCount++;
      const normalized = normalize(writtenFormMatch[1]);
      if (PLAYABLE_WORD_PATTERN.test(normalized)) {
        currentWords.push(normalized);
      }
    }
  }
  flushEntry();

  return { rawWrittenFormCount, rawEntryCount };
}

function isAbbreviationTag(tag: string): boolean {
  return tag.endsWith("a");
}

async function main(): Promise<void> {
  const posByWord = new Map<string, Set<string>>();
  let totalRawWrittenForms = 0;
  let totalRawEntries = 0;

  for (const fileName of SOURCE_FILES) {
    const filePath = path.join(RAW_SOURCES_DIR, fileName);
    console.log(`Reading ${filePath} ...`);
    const result = await extractEntries(filePath, posByWord);
    totalRawWrittenForms += result.rawWrittenFormCount;
    totalRawEntries += result.rawEntryCount;
    console.log(
      `  ${result.rawEntryCount} entries, ${result.rawWrittenFormCount} writtenForm occurrences`,
    );
  }

  const allWords = Array.from(posByWord.keys()).sort((a, b) =>
    a.localeCompare(b, "sv"),
  );

  const properNounOnly: string[] = [];
  const abbreviationOnly: string[] = [];
  for (const [word, tags] of posByWord) {
    if (tags.size === 1 && tags.has("pm")) {
      properNounOnly.push(word);
    } else if (Array.from(tags).every(isAbbreviationTag)) {
      abbreviationOnly.push(word);
    }
  }
  properNounOnly.sort((a, b) => a.localeCompare(b, "sv"));
  abbreviationOnly.sort((a, b) => a.localeCompare(b, "sv"));

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(allWords), "utf-8");
  writeFileSync(
    EXCLUSIONS_OUTPUT_PATH,
    JSON.stringify({ properNounOnly, abbreviationOnly }),
    "utf-8",
  );

  console.log(`\nTotal raw entries: ${totalRawEntries}`);
  console.log(`Total raw writtenForm occurrences: ${totalRawWrittenForms}`);
  console.log(`Unique playable single-word forms: ${allWords.length}`);
  console.log(`Proper-noun-only words: ${properNounOnly.length}`);
  console.log(`Abbreviation-only words: ${abbreviationOnly.length}`);
  console.log(`Written to ${WORDS_OUTPUT_PATH}`);
  console.log(`Written to ${EXCLUSIONS_OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
