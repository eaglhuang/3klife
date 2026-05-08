#!/usr/bin/env node
/**
 * check-import-boundaries.js — 模組邊界守衛
 *
 * Harness Engineering 計算型感測器：
 * 使用正則表達式掃描 import/require 語句，
 * 確保 ui/battle/core/shared/tools 五大模組之間的單向依賴規則。
 *
 * 規則矩陣：
 *   shared/  → 不可引用任何其他模組（零依賴層）
 *   core/    → 只可引用 shared/
 *   ui/      → 只可引用 shared/、core/
 *   battle/  → 只可引用 shared/、core/
 *   tools/   → 只可引用 shared/、core/（輔助工具）
 *
 * 用法：
 *   node tools_node/check-import-boundaries.js
 *   node tools_node/check-import-boundaries.js --json
 *   node tools_node/check-import-boundaries.js --fix-hint
 */

process.stderr.write('[DEPRECATED] tools_node/check-import-boundaries.js 已進入 wrapper 維護模式，請改用 node tools_node/run-rule-guard.js --profile atm\n');

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'assets', 'scripts');

// ─── 模組邊界規則 ─────────────────────────────────────────
const BOUNDARY_RULES = {
  'shared': {
    canImport: [],
    description: '共用層不可依賴任何業務模組（零依賴層）',
  },
  'core': {
    canImport: ['shared'],
    description: 'Core 只可引用 shared',
  },
  'ui': {
    canImport: ['shared', 'core'],
    description: 'UI 只可引用 shared 和 core',
  },
  'battle': {
    canImport: ['shared', 'core'],
    description: 'Battle 只可引用 shared 和 core',
  },
  'tools': {
    canImport: ['shared', 'core'],
    description: 'Tools 只可引用 shared 和 core',
  },
};

// 所有模組名稱
const MODULE_NAMES = Object.keys(BOUNDARY_RULES);

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    fixHint: argv.includes('--fix-hint'),
    verbose: argv.includes('--verbose'),
  };
}

// ─── 檔案遍歷 ─────────────────────────────────────────────
function walkTs(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'library' || entry.name === 'temp') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTs(fullPath, files);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── 判斷檔案所屬模組 ─────────────────────────────────────
function getModule(filePath) {
  const rel = path.relative(SCRIPTS_DIR, filePath).replace(/\\/g, '/');
  for (const mod of MODULE_NAMES) {
    if (rel.startsWith(`${mod}/`)) return mod;
  }
  return null;
}

// ─── 解析 import 語句 ─────────────────────────────────────
const IMPORT_PATTERNS = [
  // import ... from '...'
  /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
  // import '...'
  /import\s+['"]([^'"]+)['"]/g,
  // require('...')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function extractImports(source) {
  const imports = [];
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      imports.push(match[1]);
    }
  }
  // 去重
  return [...new Set(imports)];
}

// ─── 判斷 import 路徑指向哪個模組 ──────────────────────────
function resolveImportModule(importPath, sourceModule) {
  // 排除外部依賴（cc、node_modules 等）
  if (importPath.startsWith('cc') || importPath.startsWith('@')) return null;
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return null;

  // 相對路徑 → 判斷最終指向哪個模組
  // 例如在 ui/foo.ts 中 import '../../battle/bar' → 指向 battle
  for (const mod of MODULE_NAMES) {
    // 檢查路徑中是否包含跨模組引用
    // 正規化：../../battle/ 或 ../battle/ 等
    const modSegment = `/${mod}/`;
    const altSegment = `../${mod}/`;
    if (importPath.includes(modSegment) || importPath.startsWith(`../${mod}/`) || importPath === `../${mod}`) {
      return mod;
    }
  }

  // 如果是純相對路徑（./foo 或 ../foo），視為同模組內引用
  return null;
}

// ─── 主掃描邏輯 ───────────────────────────────────────────
function scanBoundaries() {
  const violations = [];
  const stats = {
    filesScanned: 0,
    importsChecked: 0,
    moduleCounts: {},
  };

  for (const mod of MODULE_NAMES) {
    stats.moduleCounts[mod] = 0;
  }

  const files = walkTs(SCRIPTS_DIR);
  stats.filesScanned = files.length;

  for (const filePath of files) {
    const sourceModule = getModule(filePath);
    if (!sourceModule) continue; // 不在已知模組內的檔案跳過

    stats.moduleCounts[sourceModule] += 1;

    const rule = BOUNDARY_RULES[sourceModule];
    if (!rule) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split('\n');
    const imports = extractImports(source);
    stats.importsChecked += imports.length;

    for (const importPath of imports) {
      const targetModule = resolveImportModule(importPath, sourceModule);
      if (!targetModule) continue; // 同模組或外部依賴
      if (targetModule === sourceModule) continue; // 同模組內引用

      if (!rule.canImport.includes(targetModule)) {
        // 找到違規的行號
        let lineNumber = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(importPath)) {
            lineNumber = i + 1;
            break;
          }
        }

        violations.push({
          file: path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
          line: lineNumber,
          sourceModule,
          targetModule,
          importPath,
          rule: rule.description,
          allowed: rule.canImport,
        });
      }
    }
  }

  return { violations, stats };
}

// ─── 輸出格式化 ───────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const { violations, stats } = scanBoundaries();

  if (args.json) {
    console.log(JSON.stringify({
      passed: violations.length === 0,
      violations,
      stats,
    }, null, 2));
    process.exit(violations.length > 0 ? 1 : 0);
    return;
  }

  console.log(`\n🔍 模組邊界掃描：${stats.filesScanned} 檔案 / ${stats.importsChecked} 個 import\n`);

  // 顯示模組分佈
  if (args.verbose) {
    for (const [mod, count] of Object.entries(stats.moduleCounts)) {
      const rule = BOUNDARY_RULES[mod];
      const allowed = rule.canImport.length > 0 ? rule.canImport.join(', ') : '（無）';
      console.log(`  ${mod}/ → ${count} 檔案 | 允許引用：${allowed}`);
    }
    console.log();
  }

  if (violations.length === 0) {
    console.log(`✅ 模組邊界守衛通過：無違規引用`);
    return;
  }

  console.error(`❌ 發現 ${violations.length} 筆模組邊界違規：\n`);

  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.sourceModule}/ → ${v.targetModule}/ （不允許）`);
    console.error(`    import: ${v.importPath}`);
    console.error(`    規則：${v.rule}`);
    if (args.fixHint) {
      console.error(`    修正建議：將共用邏輯搬到 shared/ 或 core/，再從兩邊引用`);
    }
    console.error();
  }

  process.exit(1);
}

main();
