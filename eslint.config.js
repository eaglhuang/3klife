const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

const commonGlobals = {
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Promise: 'readonly',
  Map: 'readonly',
  Set: 'readonly',
  WeakMap: 'readonly',
  WeakSet: 'readonly',
  Symbol: 'readonly',
  globalThis: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
};

module.exports = [
  {
    ignores: [
      'library/**',
      'temp/**',
      'node_modules/**',
      '**/*.d.ts',
      'build/**',
      'native/**',
      '.venv/**',
      '.atm/**',
      '.atm-temp/**',
      '.tmp/**',
      'Design System/**',
      'Design System 2/**',
      'Design System 3/**',
      'Design System_20260513/**',
      'artifacts/**',
      '@cocos/**',
      'profiles/**',
      'settings/**',
    ],
  },

  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: commonGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  {
    files: ['assets/scripts/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },

  {
    files: ['tools_node/**/*.js', 'tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
