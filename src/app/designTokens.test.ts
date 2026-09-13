import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Every custom property a stylesheet uses must be defined somewhere.
 *
 * `var(--nope, #ccc)` is valid CSS that silently renders the fallback, so a stylesheet can drift
 * away from the palette without anything failing. That is exactly what happened: the five online
 * stylesheets were written against `--color-border`, `--color-accent`, `--color-muted` and
 * `--color-error`, none of which exist — 34 references, all quietly falling back to hardcoded
 * greys and blues, so the online half of the game ignored the theme (and the dark palette
 * `globals.css` defines) until somebody looked. Two hot-seat stylesheets had the same fault in
 * miniature, asking for `--muted-foreground` where the token is `--foreground-muted`.
 *
 * This is the cheapest guard that would have caught all of it, and it is the kind of divergence
 * `architecture.md` section 26 asks to be caught mechanically rather than in play.
 */

/** Properties set from JavaScript or by the framework, so no stylesheet declares them. */
const SET_AT_RUNTIME = new Set([
  // Published per board by the zoom gesture (useBoardZoom.ts) and the text scaling
  // (useTileTextScale.ts).
  "--board-zoom",
  "--tile-text-unit",
  // Next's font loader defines this on the document.
  "--font-geist-sans",
]);

function stylesheets(): readonly string[] {
  return execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
    .split("\n")
    .filter((path) => path.endsWith(".css"));
}

function definedProperties(paths: readonly string[]): ReadonlySet<string> {
  const defined = new Set<string>();
  for (const path of paths) {
    const declarations = readFileSync(path, "utf8").matchAll(
      /^\s*(--[a-z0-9-]+)\s*:/gm,
    );
    for (const [, name] of declarations) defined.add(name!);
  }
  return defined;
}

describe("design tokens", () => {
  const paths = stylesheets();
  const defined = definedProperties(paths);

  it.each(paths)("%s uses only properties that exist", (path) => {
    const used = new Set(
      [...readFileSync(path, "utf8").matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map(
        ([, name]) => name!,
      ),
    );

    const undefinedProperties = [...used].filter(
      (name) => !defined.has(name) && !SET_AT_RUNTIME.has(name),
    );

    expect(undefinedProperties).toEqual([]);
  });
});
