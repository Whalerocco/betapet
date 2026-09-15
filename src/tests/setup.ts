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

/**
 * jsdom implements no `matchMedia` at all, so a component that asks about the viewport throws
 * rather than getting an answer. A stub is the right place to fix that: the hook that asks
 * (`useHistoryDrawer`) is asking a real question, and making it defensive would hide the absence
 * instead of filling it.
 *
 * Nothing matches, which is the wide-screen answer — jsdom's default window is 1024px, so that is
 * also the truthful one. A test that cares about the narrow layout overrides it.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        media: query,
        matches: false,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
