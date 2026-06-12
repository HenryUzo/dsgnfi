import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    // The server suite is app-level integration-heavy and repeatedly cold-imports
    // the Express app with mocked Prisma/env state. Running one worker in threads
    // mode keeps the suite deterministic and avoids Windows fork contention.
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
