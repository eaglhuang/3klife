#!/usr/bin/env node
/**
 * check-test-tsc-baseline.js — 計算型感測器：測試型別檢查錯誤數不得超過基準
 *
 * 跑 `tsc -p tsconfig.test.json --noEmit`，數 `error TS` 行；超過 tools_node/test-tsc-baseline.json
 * 的 maxErrors 就以 exit code 1 失敗，並列出所有錯誤行讓 Agent 直接修。
 * 常見原因：測試裡缺欄位的物件字面量直接 `as GeneralConfig`（TS2352），要寫 `as unknown as GeneralConfig`。
 *
 * 用法：
 *   node tools_node/check-test-tsc-baseline.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'test-tsc-baseline.json');
const TSC_BIN = path.join(PROJECT_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

function main() {
  if (!fs.existsSync(TSC_BIN)) {
    console.log('[test-tsc] 找不到 node_modules/typescript，跳過（請先 npm ci）');
    return 0;
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  const maxErrors = Number(baseline.maxErrors);
  const run = spawnSync(process.execPath, [TSC_BIN, '-p', 'tsconfig.test.json', '--noEmit'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) {
    console.error(`[test-tsc] 執行 tsc 失敗：${run.error.message}`);
    return 1;
  }
  const lines = `${run.stdout || ''}\n${run.stderr || ''}`.split(/\r?\n/).filter((line) => /error TS\d+/.test(line));
  console.log(`[test-tsc] 錯誤 ${lines.length} 個，基準上限 ${maxErrors}`);
  if (lines.length <= maxErrors) return 0;
  console.error('[test-tsc] 錯誤數超過基準，請修掉新增的型別錯誤：');
  for (const line of lines) console.error(`  ${line}`);
  console.error('提示：測試裡造物件缺欄位時，用 `as unknown as GeneralConfig`（或對應型別），不要直接 `as GeneralConfig`（TS2352）。');
  return 1;
}

process.exit(main());
