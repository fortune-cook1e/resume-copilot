import { defineConfig } from 'vitest/config'

const httpTests = ['src/health/health.test.mts']

export default defineConfig({
  test: {
    environment: 'node',
    // Auth suites mutate fixtures in the same isolated database.
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'http',
          include: httpTests,
        },
      },
      {
        extends: true,
        test: {
          name: 'database',
          include: ['src/**/*.test.{ts,mts}'],
          exclude: httpTests,
          setupFiles: ['./vitest.setup.mts'],
        },
      },
    ],
  },
})
