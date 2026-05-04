#!/usr/bin/env node
/**
 * harness-health-report.js — 韁繩健康報告
 *
 * 定期掃描整個專案的韁繩覆蓋狀況，
 * 類似「測試覆蓋率」但針對 Harness Engineering 的各類控制。
 *
 * 評分維度：
 *   A. Feedforward Guides（前饋引導）: Instructions / Skills / Task Cards
 *   B. Computational Sensors（計算型感測器）: TS check / Linter / Validators / Import Boundary
 *   C. Feedback Loop（回饋迴圈）: Fixtures / Screenshot Regression / UCUF Gate
 *   D. Architecture Fitness（架構適配）: Module Boundary / CrossRef / Doc System
 *   E. Harnessability（可韁繩性）: TypeScript / JSON-driven / Module Structure
 *
 * 用法：
 *   node tools_node/harness-health-report.js
 *   node tools_node/harness-health-report.js --json
 *   node tools_node/harness-health-report.js --brief
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    brief: argv.includes('--brief'),
    verbose: argv.includes('--verbose'),
  };
}

// ─── 輔助：計算檔案數 ─────────────────────────────────────
function countFiles(dir, extensions = ['.md', '.json', '.ts', '.js']) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', 'library', 'temp', '.git'].includes(e.name)) continue;
    if (e.isDirectory()) {
      count += countFiles(path.join(dir, e.name), extensions);
    } else if (extensions.some(ext => e.name.endsWith(ext))) {
      count++;
    }
  }
  return count;
}

function dirExists(relPath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relPath));
}

function fileExists(relPath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relPath));
}

function countDirChildren(relPath) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(absPath)) return 0;
  return fs.readdirSync(absPath, { withFileTypes: true })
    .filter(e => e.isDirectory()).length;
}

function countDirFiles(relPath, ext = '') {
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(absPath)) return 0;
  return fs.readdirSync(absPath, { withFileTypes: true })
    .filter(e => e.isFile() && (!ext || e.name.endsWith(ext))).length;
}

// ─── 評估各維度 ───────────────────────────────────────────
function assessFeedforward() {
  const items = [];

  const instructionCount = countDirFiles('.github/instructions', '.md');
  items.push({
    name: 'Instructions (.github/instructions/)',
    count: instructionCount,
    max: 10,
    score: Math.min(100, (instructionCount / 10) * 100),
    status: instructionCount >= 8 ? 'good' : instructionCount >= 5 ? 'warn' : 'poor',
  });

  const skillCount = countDirChildren('.github/skills');
  items.push({
    name: 'Skills (.github/skills/)',
    count: skillCount,
    max: 30,
    score: Math.min(100, (skillCount / 30) * 100),
    status: skillCount >= 20 ? 'good' : skillCount >= 10 ? 'warn' : 'poor',
  });

  const taskCardCount = countDirFiles('docs/agent-briefs/tasks', '.md');
  items.push({
    name: 'Task Cards (docs/agent-briefs/tasks/)',
    count: taskCardCount,
    max: null,
    score: taskCardCount > 50 ? 100 : taskCardCount > 20 ? 80 : 60,
    status: taskCardCount > 50 ? 'good' : taskCardCount > 10 ? 'warn' : 'poor',
  });

  const hasKeep = fileExists('docs/keep.md');
  const hasKeepSummary = fileExists('docs/keep.summary.md');
  items.push({
    name: 'Consensus Docs (keep.md)',
    count: (hasKeep ? 1 : 0) + (hasKeepSummary ? 1 : 0),
    max: 2,
    score: hasKeep && hasKeepSummary ? 100 : hasKeep ? 60 : 0,
    status: hasKeep && hasKeepSummary ? 'good' : hasKeep ? 'warn' : 'poor',
  });

  const avgScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  return { dimension: 'A. Feedforward Guides', score: avgScore, items };
}

function assessComputationalSensors() {
  const items = [];

  items.push({
    name: 'TypeScript 語法掃描 (check-ts-syntax.js)',
    exists: fileExists('tools_node/check-ts-syntax.js'),
    score: fileExists('tools_node/check-ts-syntax.js') ? 100 : 0,
    status: fileExists('tools_node/check-ts-syntax.js') ? 'good' : 'poor',
  });

  items.push({
    name: 'ESLint 規則掃描 (check-eslint-rules.js)',
    exists: fileExists('tools_node/check-eslint-rules.js'),
    score: fileExists('tools_node/check-eslint-rules.js') ? 100 : 0,
    status: fileExists('tools_node/check-eslint-rules.js') ? 'good' : 'poor',
  });

  const hasUiValidate = fileExists('tools_node/validate-ui-specs.js');
  items.push({
    name: 'UI 規格驗證 (validate-ui-specs.js)',
    exists: hasUiValidate,
    score: hasUiValidate ? 100 : 0,
    status: hasUiValidate ? 'good' : 'poor',
  });

  const hasImportBoundary = fileExists('tools_node/check-import-boundaries.js');
  items.push({
    name: '模組邊界守衛 (check-import-boundaries.js)',
    exists: hasImportBoundary,
    score: hasImportBoundary ? 100 : 0,
    status: hasImportBoundary ? 'good' : 'poor',
  });

  const hasComputeGate = fileExists('tools_node/compute-gate.js');
  items.push({
    name: '計算型閘門 (compute-gate.js)',
    exists: hasComputeGate,
    score: hasComputeGate ? 100 : 0,
    status: hasComputeGate ? 'good' : 'poor',
  });

  const hasDataValidate = fileExists('tools_node/validate-generals-data.js');
  items.push({
    name: '資料完整性驗證 (validate-generals-data.js)',
    exists: hasDataValidate,
    score: hasDataValidate ? 100 : 0,
    status: hasDataValidate ? 'good' : 'poor',
  });

  const avgScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  return { dimension: 'B. Computational Sensors', score: avgScore, items };
}

function assessFeedbackLoop() {
  const items = [];

  const hasFixtures = dirExists('fixtures');
  const fixtureCount = hasFixtures ? countDirChildren('fixtures') : 0;
  items.push({
    name: 'Approved Fixtures (fixtures/)',
    count: fixtureCount,
    score: fixtureCount > 5 ? 100 : fixtureCount > 0 ? 60 : 0,
    status: fixtureCount > 5 ? 'good' : fixtureCount > 0 ? 'warn' : 'poor',
  });

  const hasScreenshotReg = fileExists('tools_node/ucuf-screenshot-regression.js');
  items.push({
    name: '截圖回歸測試 (ucuf-screenshot-regression.js)',
    exists: hasScreenshotReg,
    score: hasScreenshotReg ? 100 : 0,
    status: hasScreenshotReg ? 'good' : 'poor',
  });

  const hasUcufGate = fileExists('tools_node/finalize-agent-turn.js');
  items.push({
    name: 'UCUF Pre-Submit Gate (finalize-agent-turn.js)',
    exists: hasUcufGate,
    score: hasUcufGate ? 100 : 0,
    status: hasUcufGate ? 'good' : 'poor',
  });

  // 檢查 tests/ 目錄
  const testFiles = countFiles(path.join(PROJECT_ROOT, 'tests'), ['.ts', '.js']);
  items.push({
    name: '自動化測試 (tests/)',
    count: testFiles,
    score: testFiles > 20 ? 100 : testFiles > 5 ? 70 : testFiles > 0 ? 40 : 0,
    status: testFiles > 20 ? 'good' : testFiles > 5 ? 'warn' : testFiles > 0 ? 'warn' : 'poor',
  });

  const avgScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  return { dimension: 'C. Feedback Loop', score: avgScore, items };
}

function assessArchitectureFitness() {
  const items = [];

  const hasDocIdRegistry = fileExists('docs/doc-id-registry.json');
  items.push({
    name: 'Doc ID Registry (docs/doc-id-registry.json)',
    exists: hasDocIdRegistry,
    score: hasDocIdRegistry ? 100 : 0,
    status: hasDocIdRegistry ? 'good' : 'poor',
  });

  const hasCrossRef = dirExists('docs/cross-ref');
  items.push({
    name: '交叉索引 (docs/cross-ref/)',
    exists: hasCrossRef,
    score: hasCrossRef ? 100 : 0,
    status: hasCrossRef ? 'good' : 'poor',
  });

  const hasContextBudget = fileExists('tools_node/check-context-budget.js');
  items.push({
    name: 'Context Budget 管控 (check-context-budget.js)',
    exists: hasContextBudget,
    score: hasContextBudget ? 100 : 0,
    status: hasContextBudget ? 'good' : 'poor',
  });

  const hasCiPipeline = fileExists('.github/workflows/ucuf-validation.yml');
  items.push({
    name: 'CI Pipeline (.github/workflows/)',
    exists: hasCiPipeline,
    score: hasCiPipeline ? 70 : 0, // 70 分因為 pipeline 還不完整
    status: hasCiPipeline ? 'warn' : 'poor',
  });

  const avgScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  return { dimension: 'D. Architecture Fitness', score: avgScore, items };
}

function assessHarnessability() {
  const items = [];

  // TypeScript 覆蓋率
  const tsFiles = countFiles(path.join(PROJECT_ROOT, 'assets', 'scripts'), ['.ts']);
  items.push({
    name: `TypeScript 代碼 (${tsFiles} 檔案)`,
    count: tsFiles,
    score: tsFiles > 100 ? 100 : 80,
    status: 'good',
  });

  // JSON 資料驅動
  const jsonDataFiles = countFiles(path.join(PROJECT_ROOT, 'assets', 'resources', 'data'), ['.json']);
  items.push({
    name: `JSON 資料驅動 (${jsonDataFiles} 資料檔)`,
    count: jsonDataFiles,
    score: jsonDataFiles > 20 ? 100 : jsonDataFiles > 5 ? 80 : 50,
    status: jsonDataFiles > 20 ? 'good' : jsonDataFiles > 5 ? 'warn' : 'poor',
  });

  // 模組化結構
  const modules = ['battle', 'ui', 'core', 'shared', 'tools'].filter(
    m => dirExists(`assets/scripts/${m}`)
  );
  items.push({
    name: `模組化結構 (${modules.join(', ')})`,
    count: modules.length,
    max: 5,
    score: (modules.length / 5) * 100,
    status: modules.length >= 4 ? 'good' : modules.length >= 2 ? 'warn' : 'poor',
  });

  // tsconfig 設定
  const hasTsConfig = fileExists('tsconfig.json');
  items.push({
    name: 'TypeScript 設定 (tsconfig.json)',
    exists: hasTsConfig,
    score: hasTsConfig ? 100 : 0,
    status: hasTsConfig ? 'good' : 'poor',
  });

  const avgScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  return { dimension: 'E. Harnessability', score: avgScore, items };
}

// ─── 視覺化輸出 ───────────────────────────────────────────
function renderBar(score, width = 20) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function scoreColor(score) {
  if (score >= 80) return '✅';
  if (score >= 60) return '⚠️';
  return '❌';
}

// ─── 主程式 ───────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));

  const dimensions = [
    assessFeedforward(),
    assessComputationalSensors(),
    assessFeedbackLoop(),
    assessArchitectureFitness(),
    assessHarnessability(),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  if (args.json) {
    console.log(JSON.stringify({ overallScore, dimensions }, null, 2));
    return;
  }

  // ASCII 報告
  const width = 58;
  const border = '╔' + '═'.repeat(width) + '╗';
  const borderB = '╠' + '═'.repeat(width) + '╣';
  const borderE = '╚' + '═'.repeat(width) + '╝';
  const row = (text) => '║  ' + text.padEnd(width - 2) + '║';

  console.log('\n' + border);
  console.log(row('🛡️  3KLife Harness Health Report'));
  console.log(row(`   Generated: ${new Date().toLocaleString('zh-TW')}`));
  console.log(borderB);

  for (const dim of dimensions) {
    const icon = scoreColor(dim.score);
    const bar = renderBar(dim.score);
    console.log(row(`${icon} ${dim.dimension}`));
    console.log(row(`   ${bar} ${Math.round(dim.score)}%`));

    if (!args.brief) {
      for (const item of dim.items) {
        const itemIcon = item.status === 'good' ? '✅' : item.status === 'warn' ? '⚠️' : '❌';
        const countStr = item.count !== undefined ? ` (${item.count})` : '';
        const name = (item.name + countStr).slice(0, 50);
        console.log(row(`     ${itemIcon} ${name}`));
      }
    }

    console.log(row(''));
  }

  console.log(borderB);
  const overallBar = renderBar(overallScore);
  const overallIcon = scoreColor(overallScore);
  console.log(row(`${overallIcon} 綜合得分：${overallBar} ${overallScore}/100`));
  console.log(borderE);

  // 改進建議
  const poorItems = dimensions.flatMap(d =>
    d.items.filter(i => i.status === 'poor').map(i => ({ dim: d.dimension, item: i }))
  );

  if (poorItems.length > 0 && !args.brief) {
    console.log('\n📋 優先改進項目：\n');
    for (const { item } of poorItems.slice(0, 5)) {
      console.log(`  ❌ ${item.name}`);
    }
  }

  console.log('');
}

main();
