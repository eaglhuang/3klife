/**
 * ESLint v10 Flat Config — 分域治理
 *
 * 設計原則：
 * - assets/scripts/ 為核心遊戲碼，規則最嚴（no-console:error 必須走 UCUFLogger）
 * - tools_node / scripts / scratch / temp_workspace / atomic_workbench / .github /
 *   extensions / tools_mcp / .agents 為工具或生成碼，合理放寬
 * - tests/ 測試碼放寬 any 限制
 * - eqeqeq 保留 x == null 合併語意
 */
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

// ── 共用 globals ────────────────────────────────────────────
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
  // ── 全域忽略 ────────────────────────────────────────────
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
      '.task-locks/**',
      'temp_workspace/**',
      'local/**',
      'Design System/**',
      'Design System 2/**',
      'Design System 3/**',
      'Design System_20260513/**',
      'artifacts/**',
      '@cocos/**',
      'profiles/**',
      'settings/**',
      '**/dist/**',
      'tools_node/templates/**',
    ],
  },

  // ── 基礎規則（全部 .ts / .js 共用） ──────────────────────
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
      // 保留 x == null 的 null/undefined 合併語意
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // ── 核心遊戲碼：assets/scripts/ — 最嚴格 ─────────────────
  {
    files: ['assets/scripts/**/*.ts'],
    rules: {
      // 裸 console.* 必須改用 UCUFLogger
      'no-console': 'error',
    },
  },

  // ── 工具腳本 & 輔助碼 — 放寬 no-console ─────────────────
  {
    files: [
      'tools_node/**/*.js',
      'tools_node/**/*.ts',
      'scripts/**/*.js',
      'scripts/**/*.ts',
      'scratch/**/*.js',
      'scratch/**/*.ts',
      'temp_workspace/**/*.js',
      'temp_workspace/**/*.ts',
      'atomic_workbench/**/*.js',
      'atomic_workbench/**/*.ts',
      '.github/**/*.js',
      '.github/**/*.ts',
      '.agents/**/*.js',
      '.agents/**/*.ts',
      'extensions/**/*.js',
      'extensions/**/*.ts',
      'tools_mcp/**/*.js',
      'tools_mcp/**/*.ts',
      'server/**/*.js',
      'server/**/*.ts',
      'local/**/*.js',
      'local/**/*.ts',
      'packages/**/*.js',
      'packages/**/*.ts',
      'examples/**/*.js',
      'examples/**/*.ts',
      'fixtures/**/*.js',
      'fixtures/**/*.ts',
      'tools/**/*.js',
      'tools/**/*.ts',
      'shared/**/*.js',
      'shared/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // ── 根目錄散落腳本 — 放寬 no-console ─────────────────────
  {
    files: ['*.js', '*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // ── 測試碼 — 放寬 any 和 console ─────────────────────────
  {
    files: ['tests/**/*.ts', 'tests/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
