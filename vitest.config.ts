import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    globals: true,
    // Mock next/font/google so template components can be imported in tests
    // without the Next.js build environment
    setupFiles: ["tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock next/font/google for unit tests
      "next/font/google": path.resolve(
        __dirname,
        "tests/unit/__mocks__/next-font-google.ts"
      ),
      "next/image": path.resolve(
        __dirname,
        "tests/unit/__mocks__/next-image.tsx"
      ),
    },
  },
});
