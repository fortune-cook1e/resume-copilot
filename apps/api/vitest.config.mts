import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Auth suites mutate fixtures in the same isolated database.
    fileParallelism: false,
    include: ['src/**/*.test.{ts,mts}'],
    setupFiles: ['./vitest.setup.mts'],
  },
})
