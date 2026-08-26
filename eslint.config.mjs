import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  /*
   * The game engine must stay usable on a server as well as in a browser (`architecture.md`), so
   * it may not reach for the interface or the application layer around it. Its tests run in a
   * Node environment, which catches a stray `window`, but nothing stops an import of React or a
   * component — and an engine that imports one has quietly stopped being portable.
   *
   * The dependency runs the other way only: UI and application code build on the engine.
   */
  {
    files: ["src/game/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "react-dom/*",
                "next",
                "next/*",
                "**/components/**",
                "**/application/**",
                "**/app/**",
              ],
              message:
                "The game engine must run on a server as well as in a browser: it cannot depend on React, Next, components or the application layer.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
