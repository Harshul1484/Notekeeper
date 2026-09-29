import { defineConfig } from "vitest/config";

// Integration tests against a local Supabase stack (`npx supabase start`, needs
// Docker). Kept apart from `npm test`, which runs without Docker.
export default defineConfig({
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["supabase/tests/global-setup.ts"],
    // The files share one database; running them one at a time keeps failures readable.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
