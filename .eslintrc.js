module.exports = {
  root: true,
  parser: 'espree',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['prettier'],
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'node_modules', '.next', 'coverage'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-console': 'warn',
    'prettier/prettier': 'error',
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOptions: {
          all: 'asc',
          multiple: 'asc',
          single: 'desc',
          none: 'asc',
        },
      },
    ],
  },
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};