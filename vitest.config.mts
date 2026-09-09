import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const alias = { "@": path.resolve(import.meta.dirname, "./src") };

/**
 * Three projects, because the engine, the server and the interface run in different places.
 *
 * The engine is meant to be usable on a server as well as in a browser (`architecture.md`: the
 * same engine must eventually serve both local and online play). Running its tests in jsdom would
 * never show a stray dependency on a browser global — every test would pass while the engine was
 * quietly unusable server-side. Running them in `node` is what makes that guarantee real, and it
 * fails immediately if engine code reaches for `window`, `document` or `localStorage`.
 *
 * Server code has the same requirement for the opposite reason — it only ever runs on a server —
 * so it gets its own `node` project rather than being swept into jsdom by the interface project.
 *
 * Everything else — components, and the application layer that talks to localStorage — keeps
 * jsdom.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "engine",
          environment: "node",
          include: ["src/game/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "server",
          environment: "node",
          include: ["src/server/**/*.test.ts"],
          // These talk to a real database over the network and load a dictionary of several
          // megabytes on the first move of a run (DEC-011); the default 5s is not enough.
          testTimeout: 30_000,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          // jsdom treats a document with no URL as an opaque origin, where localStorage throws
          // (SecurityError) instead of being available; give it a real origin so tests that touch
          // localStorage (application/persistence) work like an actual browser tab.
          environmentOptions: { jsdom: { url: "http://localhost/" } },
          setupFiles: ["./src/tests/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            "src/game/**/*.test.ts",
            "src/server/**/*.test.ts",
            "src/**/*.e2e.test.{ts,tsx}",
            "node_modules/**",
          ],
        },
      },
    ],
  },
});
