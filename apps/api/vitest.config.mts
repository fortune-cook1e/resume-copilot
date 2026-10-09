import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Auth suites mutate fixtures in the same isolated database.
    fileParallelism: false,
    include: ['test/**/*.test.mts'],
    setupFiles: ['./test/setup.mts'],
  },
})
