import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // The calc engine is pure TS with no CSS, but Vite still auto-detects this
  // project's postcss.config.mjs (Tailwind v4's plugin) and crashes trying to
  // load it outside of Next's own build pipeline -- so disable that here.
  css: {
    postcss: { plugins: [] },
  },
});
