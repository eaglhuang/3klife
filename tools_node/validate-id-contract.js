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
const GENE_DICTIONARY = path.join(ROOT, 'assets', 'resources', 'data', 'master', 'gene-dictionary.json');
const BLOODLINE_TEMPLATES = path.join(ROOT, 'assets', 'resources', 'data', 'master', 'bloodline-templates.json');

const PATTERNS = {
  templateId: /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*_V\d+$/,
  bloodlineId: /^BL_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/,
  geneId: /^[A-Z]+_[A-Z]+_\d{2}$/,
};

/**
 * 檢查武將記錄的 ID 欄位；只檢查存在的欄位，缺欄位不算違規（由 validate-generals-data 負責必填）。
 * @param {Array<Record<string, unknown>>} generals
 * @returns {Array<{ source: string, generalId: string, field: string, value: string, expected: string }>}
 */
function checkIdContract(generals) {
  const violations = [];
  for (const g of generals) {
    const gid = String(g.id ?? '?');
    if (typeof g.templateId === 'string' && !PATTERNS.templateId.test(g.templateId)) {
      violations.push({ source: 'generals', generalId: gid, field: 'templateId', value: g.templateId, expected: '{Name}_V{n}' });
    }
    if (typeof g.bloodlineId === 'string' && !PATTERNS.bloodlineId.test(g.bloodlineId)) {
      violations.push({ source: 'generals', generalId: gid, field: 'bloodlineId', value: g.bloodlineId, expected: 'BL_{Name}' });
    }
    if (Array.isArray(g.genes)) {
      for (const gene of g.genes) {
        const value = gene && typeof gene.id === 'string' ? gene.id : null;
        if (value !== null && !PATTERNS.geneId.test(value)) {
          violations.push({ source: 'generals', generalId: gid, field: 'genes[].id', value, expected: '{COLOR}_{ATTR}_{NN}' });
        }
      }
    }
  }
  return violations;
}

/**
 * 檢查 gene-dictionary 的 id（Gene_ID 格式）；只看 id，其他欄位不屬本規則。
 * @param {Array<Record<string, unknown>>} genes
 * @returns {Array<{ source: string, entryId: string, field: string, value: string, expected: string }>}
 */
function checkGeneDictionary(genes) {
  const violations = [];
  for (const gene of genes) {
    const value = typeof gene.id === 'string' ? gene.id : null;
    if (value !== null && !PATTERNS.geneId.test(value)) {
      violations.push({ source: 'gene-dictionary', entryId: value, field: 'id', value, expected: '{COLOR}_{ATTR}_{NN}' });
    }
  }
  return violations;
}

/**
 * 檢查 bloodline-templates 內帶有 bloodlineId 的條目。模板的 id 是模板名（kebab-case），
 * 不屬於 Bloodline_ID 規則，因此只檢查明確帶 bloodlineId 欄位的條目。
 * @param {Array<Record<string, unknown>>} templates
 * @returns {Array<{ source: string, entryId: string, field: string, value: string, expected: string }>}
 */
function checkBloodlineTemplates(templates) {
  const violations = [];
  for (const template of templates) {
    if (typeof template.bloodlineId === 'string' && !PATTERNS.bloodlineId.test(template.bloodlineId)) {
      violations.push({
        source: 'bloodline-templates',
        entryId: String(template.id ?? '?'),
        field: 'bloodlineId',
        value: template.bloodlineId,
        expected: 'BL_{Name}',
      });
    }
  }
  return violations;
}

function readEntries(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(raw) ? raw : (raw.data || []);
}

function main() {
  const strict = process.argv.includes('--strict');
  const generals = readEntries(RUNTIME_GENERALS);
  const genes = readEntries(GENE_DICTIONARY);
  const templates = readEntries(BLOODLINE_TEMPLATES);
  const generalViolations = checkIdContract(generals);
  const geneViolations = checkGeneDictionary(genes);
  const templateViolations = checkBloodlineTemplates(templates);
  const violations = [...generalViolations, ...geneViolations, ...templateViolations];
  const byField = {};
  for (const v of violations) byField[`${v.source}:${v.field}`] = (byField[`${v.source}:${v.field}`] || 0) + 1;
  console.log(`=== validate-id-contract：${generals.length} 筆武將、${genes.length} 筆基因、${templates.length} 筆血脈模板 ===`);
  console.log(`違規 ${violations.length} 筆`, JSON.stringify(byField));
  violations.slice(0, 10).forEach(v => console.log(`  [${v.field}] ${v.generalId || v.entryId}: ${v.value}（規格：${v.expected}）`));
  if (violations.length > 10) console.log(`  ……另 ${violations.length - 10} 筆`);
  if (strict && violations.length > 0) process.exit(1);
}

module.exports = { checkIdContract, checkGeneDictionary, checkBloodlineTemplates, PATTERNS };

if (require.main === module) main();
