/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules', '*.config.js', '*.config.ts', '.eslintrc.cjs'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // `_`-prefixed names are intentionally unused (throwaway destructure slots,
    // placeholder params) — a convention already used across the codebase.
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
    }],
    // `any` is used deliberately at untyped boundaries: isomorphic-git's fs/http,
    // Web Worker `self`, catch clauses, and generic perf wrappers. Off rather
    // than scattering inline disables; tighten per-file later if desired.
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
