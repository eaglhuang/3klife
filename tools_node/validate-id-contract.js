/**
 * validate-id-contract.js（TERM-01 / PROG-2-0419）
 *
 * 依《名詞定義文件》「命名統一規則」檢查 ID 格式，只回報違規，不改資料。
 *   - Template_ID：{Name}_V{n}，例如 Zhao_Yun_V2
 *   - Bloodline_ID：BL_{Name}，例如 BL_ZhaoYun
 *   - Gene_ID：{COLOR}_{ATTR}_{NN}，例如 GREEN_DRAGON_04
 *
 * 用法：node tools_node/validate-id-contract.js [--strict]
 *   預設只報告，exit 0；--strict 有違規時 exit 1。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUNTIME_GENERALS = path.join(ROOT, 'assets', 'resources', 'data', 'generals.json');

const PATTERNS = {
  templateId: /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*_V\d+$/,
  bloodlineId: /^BL_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/,
  geneId: /^[A-Z]+_[A-Z]+_\d{2}$/,
};

/**
 * 檢查武將記錄的 ID 欄位；只檢查存在的欄位，缺欄位不算違規（由 validate-generals-data 負責必填）。
 * @param {Array<Record<string, unknown>>} generals
 * @returns {Array<{ generalId: string, field: string, value: string, expected: string }>}
 */
function checkIdContract(generals) {
  const violations = [];
  for (const g of generals) {
    const gid = String(g.id ?? '?');
    if (typeof g.templateId === 'string' && !PATTERNS.templateId.test(g.templateId)) {
      violations.push({ generalId: gid, field: 'templateId', value: g.templateId, expected: '{Name}_V{n}' });
    }
    if (typeof g.bloodlineId === 'string' && !PATTERNS.bloodlineId.test(g.bloodlineId)) {
      violations.push({ generalId: gid, field: 'bloodlineId', value: g.bloodlineId, expected: 'BL_{Name}' });
    }
    if (Array.isArray(g.genes)) {
      for (const gene of g.genes) {
        const value = gene && typeof gene.id === 'string' ? gene.id : null;
        if (value !== null && !PATTERNS.geneId.test(value)) {
          violations.push({ generalId: gid, field: 'genes[].id', value, expected: '{COLOR}_{ATTR}_{NN}' });
        }
      }
    }
  }
  return violations;
}

function main() {
  const strict = process.argv.includes('--strict');
  const raw = JSON.parse(fs.readFileSync(RUNTIME_GENERALS, 'utf8'));
  const generals = Array.isArray(raw) ? raw : (raw.data || []);
  const violations = checkIdContract(generals);
  const byField = {};
  for (const v of violations) byField[v.field] = (byField[v.field] || 0) + 1;
  console.log(`=== validate-id-contract：${generals.length} 筆武將 ===`);
  console.log(`違規 ${violations.length} 筆`, JSON.stringify(byField));
  violations.slice(0, 10).forEach(v => console.log(`  [${v.field}] ${v.generalId}: ${v.value}（規格：${v.expected}）`));
  if (violations.length > 10) console.log(`  ……另 ${violations.length - 10} 筆`);
  if (strict && violations.length > 0) process.exit(1);
}

module.exports = { checkIdContract, PATTERNS };

if (require.main === module) main();
