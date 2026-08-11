import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/** vitest.config.mts doesn't enable `test.globals`, so RTL's own auto-cleanup detection never fires. */
afterEach(() => {
  cleanup();
});
