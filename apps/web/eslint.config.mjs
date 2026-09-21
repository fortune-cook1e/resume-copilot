import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import base from '../../eslint.config.mjs';

export default defineConfig([
  ...base,
  ...nextVitals,
  ...nextTypescript,
]);
