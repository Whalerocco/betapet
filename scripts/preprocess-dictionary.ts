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
 * One Lemma can carry several <FormRepresentation> spelling variants with *different*
 * partOfSpeech tags each (e.g. one entry lists "television"/"teve" as nn and "tv"/"TV" as nna,
 * all as alternate written forms of one sense). So partOfSpeech must be paired with its
 * writtenForm at the FormRepresentation level, not assumed constant across the whole
 * LexicalEntry — an earlier version of this script got that wrong and silently missed real
 * abbreviations like "TV" as a result. WordForm entries (inflected surface forms, which have no
 * partOfSpeech of their own) inherit the most recently seen FormRepresentation's tag in the
 * same entry.
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
const FORM_REPRESENTATION_START = "<FormRepresentation";
const FORM_REPRESENTATION_END = "</FormRepresentation>";
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

async function extractEntries(
  filePath: string,
  allWords: Set<string>,
  posByWord: Map<string, Set<string>>,
): Promise<ExtractionResult> {
  let rawWrittenFormCount = 0;
  let rawEntryCount = 0;

  let inFormRepresentation = false;
  let frWrittenForms: string[] = [];
  let frPartOfSpeech: string | undefined;
  let lastEntryPartOfSpeech: string | undefined;

  const associate = (word: string, pos: string): void => {
    let tags = posByWord.get(word);
    if (!tags) {
      tags = new Set();
      posByWord.set(word, tags);
    }
    tags.add(pos);
  };

  const flushFormRepresentation = (): void => {
    if (frPartOfSpeech) {
      for (const word of frWrittenForms) {
        associate(word, frPartOfSpeech);
      }
      lastEntryPartOfSpeech = frPartOfSpeech;
    }
    frWrittenForms = [];
    frPartOfSpeech = undefined;
  };

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.includes(LEXICAL_ENTRY_START)) {
      flushFormRepresentation();
      lastEntryPartOfSpeech = undefined;
      rawEntryCount++;
      continue;
    }
    if (line.includes(LEXICAL_ENTRY_END)) {
      flushFormRepresentation();
      continue;
    }
    if (line.includes(FORM_REPRESENTATION_START)) {
      flushFormRepresentation();
      inFormRepresentation = true;
      continue;
    }
    if (line.includes(FORM_REPRESENTATION_END)) {
      flushFormRepresentation();
      inFormRepresentation = false;
      continue;
    }

    const writtenFormMatch = WRITTEN_FORM_PATTERN.exec(line);
    const normalized = writtenFormMatch
      ? normalize(writtenFormMatch[1])
      : undefined;
    if (normalized) {
      rawWrittenFormCount++;
      if (PLAYABLE_WORD_PATTERN.test(normalized)) {
        allWords.add(normalized);
        if (inFormRepresentation) {
          frWrittenForms.push(normalized);
        } else if (lastEntryPartOfSpeech) {
          associate(normalized, lastEntryPartOfSpeech);
        }
      }
    }

    if (inFormRepresentation) {
      const posMatch = PART_OF_SPEECH_PATTERN.exec(line);
      if (posMatch) {
        frPartOfSpeech = posMatch[1];
      }
    }
  }
  flushFormRepresentation();

  return { rawWrittenFormCount, rawEntryCount };
}

function isAbbreviationTag(tag: string): boolean {
  return tag.endsWith("a");
}

async function main(): Promise<void> {
  const allWords = new Set<string>();
  const posByWord = new Map<string, Set<string>>();
  let totalRawWrittenForms = 0;
  let totalRawEntries = 0;

  for (const fileName of SOURCE_FILES) {
    const filePath = path.join(RAW_SOURCES_DIR, fileName);
    console.log(`Reading ${filePath} ...`);
    const result = await extractEntries(filePath, allWords, posByWord);
    totalRawWrittenForms += result.rawWrittenFormCount;
    totalRawEntries += result.rawEntryCount;
    console.log(
      `  ${result.rawEntryCount} entries, ${result.rawWrittenFormCount} writtenForm occurrences`,
    );
  }

  const sortedWords = Array.from(allWords).sort((a, b) =>
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

  writeFileSync(WORDS_OUTPUT_PATH, JSON.stringify(sortedWords), "utf-8");
  writeFileSync(
    EXCLUSIONS_OUTPUT_PATH,
    JSON.stringify({ properNounOnly, abbreviationOnly }),
    "utf-8",
  );

  console.log(`\nTotal raw entries: ${totalRawEntries}`);
  console.log(`Total raw writtenForm occurrences: ${totalRawWrittenForms}`);
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
