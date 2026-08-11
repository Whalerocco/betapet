import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // jsdom treats a document with no URL as an opaque origin, where localStorage throws
    // (SecurityError) instead of being available; give it a real origin so tests that touch
    // localStorage (application/persistence) work like an actual browser tab.
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.e2e.test.{ts,tsx}", "node_modules/**"],
  },
});
