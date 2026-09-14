module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'next/core-web-vitals',
  ],
  ignorePatterns: ['dist', 'node_modules', '.next', 'coverage'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-undef': 'off',
    'react/no-unescaped-entities': 'warn',
    'no-console': 'warn',
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true,
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};