/**
 * Builds src/data/dictionary/sv-saldo-words.json from the raw SALDO/SALDOM LMF XML source
 * files. See scripts/dictionary-raw-sources/README.md for where to download those files —
 * they are too large to commit to the repository and are not required except when
 * regenerating this data (dictionary.md section 32: dictionary updates are a deliberate,
 * occasional, documented operation).
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
const OUTPUT_PATH = path.join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "dictionary",
  "sv-saldo-words.json",
);

const WRITTEN_FORM_PATTERN = /<feat att="writtenForm" val="([^"]*)"/g;
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

async function extractWrittenForms(
  filePath: string,
  words: Set<string>,
): Promise<number> {
  let rawCount = 0;
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    for (const match of line.matchAll(WRITTEN_FORM_PATTERN)) {
      rawCount++;
      const normalized = unescapeXml(match[1]).normalize("NFC").toUpperCase();
      if (PLAYABLE_WORD_PATTERN.test(normalized)) {
        words.add(normalized);
      }
    }
  }

  return rawCount;
}

async function main(): Promise<void> {
  const words = new Set<string>();
  let totalRaw = 0;

  for (const fileName of SOURCE_FILES) {
    const filePath = path.join(RAW_SOURCES_DIR, fileName);
    console.log(`Reading ${filePath} ...`);
    const rawCount = await extractWrittenForms(filePath, words);
    totalRaw += rawCount;
    console.log(`  ${rawCount} writtenForm occurrences found`);
  }

  const sorted = Array.from(words).sort((a, b) => a.localeCompare(b, "sv"));
  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted), "utf-8");

  console.log(`\nTotal raw writtenForm occurrences: ${totalRaw}`);
  console.log(`Unique playable single-word forms: ${sorted.length}`);
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
