import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/** vitest.config.mts doesn't enable `test.globals`, so RTL's own auto-cleanup detection never fires. */
afterEach(() => {
  cleanup();
});

/**
 * Modern Node ships its own experimental global `localStorage` (which throws/warns without a
 * `--localstorage-file` flag). Vitest's jsdom-environment glue sees that global already exists
 * and skips overriding it with jsdom's working implementation, leaving the non-functional Node
 * one in place. Force jsdom's real localStorage back onto the global so
 * application/persistence code under test behaves like an actual browser tab.
 */
const jsdomGlobal = globalThis as typeof globalThis & {
  jsdom?: { window: { localStorage: Storage } };
};
if (jsdomGlobal.jsdom) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => jsdomGlobal.jsdom!.window.localStorage,
  });
}
