/**
 * @fileoverview Shared ESLint flat-config stub for SN Editor packages.
 * // STUB: phase-1 — expand rules (react, import, a11y) when apps/web lands
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Base ESLint flat config used via `@sn-editor/eslint-config/base`. */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**'],
  },
);
