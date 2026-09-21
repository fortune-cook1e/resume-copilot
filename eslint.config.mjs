import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Shared baseline. Each application imports this and adds framework-specific rules.
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/next-env.d.ts',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
]);
