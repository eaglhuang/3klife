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
 * Rollout 補充：
 *   - 內嵌 live harness-metrics-summary/v1
 *   - 輸出 daily trend snapshots
 *   - 掃描 execution-path-comparison/v1 樣本，無資料時回 unknown
 *
 * 用法：
 *   node tools_node/harness-health-report.js
 *   node tools_node/harness-health-report.js --json
 *   node tools_node/harness-health-report.js --brief
 *   node tools_node/harness-health-report.js --artifacts artifacts/turn-artifacts --traces artifacts/execution-traces
 */

const fs = require('fs');
const path = require('path');

const { accumulateHarnessMetrics } = require('./accumulate-harness-metrics');
const { queryTurnArtifactHistory } = require('./query-turn-artifact-history');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT_ROOT = 'artifacts/turn-artifacts';
const DEFAULT_TRACE_ROOT = 'artifacts/execution-traces';
const DEFAULT_PATH_COMPARISON_ROOT = 'artifacts/execution-path-comparisons';
const DEFAULT_TREND_LIMIT = 5;
const PATH_DRIFT_SCORE_BY_VERDICT = {
  pass: 100,
  warn: 60,
  fail: 20,
};

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    json: false,
    brief: false,
    verbose: false,
    artifacts: DEFAULT_ARTIFACT_ROOT,
    traces: DEFAULT_TRACE_ROOT,
    pathComparisons: DEFAULT_PATH_COMPARISON_ROOT,
    trendLimit: DEFAULT_TREND_LIMIT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--brief') {
      args.brief = true;
      continue;
    }
    if (token === '--verbose') {
      args.verbose = true;
      continue;
    }
    if (token === '--artifacts') {
      args.artifacts = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--traces') {
      args.traces = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--path-comparisons') {
      args.pathComparisons = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--trend-limit') {
      args.trendLimit = Number(argv[index + 1] || DEFAULT_TREND_LIMIT);
      index += 1;
      continue;
    }
    throw new Error(`未知參數：${token}`);
  }

  if (!Number.isInteger(args.trendLimit) || args.trendLimit <= 0) {
    throw new Error(`--trend-limit 必須是正整數，目前收到：${args.trendLimit}`);
  }

  return args;
}

// ─── 輔助：檔案與數值 ─────────────────────────────────────
function resolveProjectPath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(PROJECT_ROOT, targetPath);
}

function relativePath(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, '/');
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function countFiles(dir, extensions = ['.md', '.json', '.ts', '.js']) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'library', 'temp', '.git'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name), extensions);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      count += 1;
    }
  }
  return count;
}

function walkJsonFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const results = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        results.push(absolutePath);
      }
    });
  }

  return results.sort((left, right) => left.localeCompare(right));
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
    .filter((entry) => entry.isDirectory()).length;
}

function countDirFiles(relPath, ext = '') {
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(absPath)) return 0;
  return fs.readdirSync(absPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (!ext || entry.name.endsWith(ext))).length;
}

function divide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function clampScore(score) {
  if (!Number.isFinite(score)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function rateToScore(rate) {
  if (!Number.isFinite(rate)) {
    return null;
  }
  return clampScore(rate * 100);
}

function scoreStatus(score) {
  if (!Number.isFinite(score)) return 'unknown';
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'poor';
}

function scoreIcon(status) {
  if (status === 'good') return '✅';
  if (status === 'warn') return '⚠️';
  if (status === 'poor') return '❌';
  return '❔';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function formatScore(score) {
  if (!Number.isFinite(score)) return 'unknown';
  return `${Math.round(score)}/100`;
}

function incrementCount(target, key) {
  if (!key) return;
  target[key] = (target[key] || 0) + 1;
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

  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
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

  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
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

  const testFiles = countFiles(path.join(PROJECT_ROOT, 'tests'), ['.ts', '.js']);
  items.push({
    name: '自動化測試 (tests/)',
    count: testFiles,
    score: testFiles > 20 ? 100 : testFiles > 5 ? 70 : testFiles > 0 ? 40 : 0,
    status: testFiles > 20 ? 'good' : testFiles > 5 ? 'warn' : testFiles > 0 ? 'warn' : 'poor',
  });

  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
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
    score: hasCiPipeline ? 70 : 0,
    status: hasCiPipeline ? 'warn' : 'poor',
  });

  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
  return { dimension: 'D. Architecture Fitness', score: avgScore, items };
}

function assessHarnessability() {
  const items = [];

  const tsFiles = countFiles(path.join(PROJECT_ROOT, 'assets', 'scripts'), ['.ts']);
  items.push({
    name: `TypeScript 代碼 (${tsFiles} 檔案)`,
    count: tsFiles,
    score: tsFiles > 100 ? 100 : 80,
    status: 'good',
  });

  const jsonDataFiles = countFiles(path.join(PROJECT_ROOT, 'assets', 'resources', 'data'), ['.json']);
  items.push({
    name: `JSON 資料驅動 (${jsonDataFiles} 資料檔)`,
    count: jsonDataFiles,
    score: jsonDataFiles > 20 ? 100 : jsonDataFiles > 5 ? 80 : 50,
    status: jsonDataFiles > 20 ? 'good' : jsonDataFiles > 5 ? 'warn' : 'poor',
  });

  const modules = ['battle', 'ui', 'core', 'shared', 'tools'].filter((moduleName) => dirExists(`assets/scripts/${moduleName}`));
  items.push({
    name: `模組化結構 (${modules.join(', ')})`,
    count: modules.length,
    max: 5,
    score: (modules.length / 5) * 100,
    status: modules.length >= 4 ? 'good' : modules.length >= 2 ? 'warn' : 'poor',
  });

  const hasTsConfig = fileExists('tsconfig.json');
  items.push({
    name: 'TypeScript 設定 (tsconfig.json)',
    exists: hasTsConfig,
    score: hasTsConfig ? 100 : 0,
    status: hasTsConfig ? 'good' : 'poor',
  });

  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
  return { dimension: 'E. Harnessability', score: avgScore, items };
}

// ─── Rollout metrics / trend / drift ─────────────────────
function buildArtifactCoverageScore(metricsSummary) {
  const value = Number(metricsSummary.metrics.artifactCoverage);
  const score = rateToScore(value);
  const matchedArtifacts = Number(metricsSummary.scan.artifactScan.matchedArtifactCount || 0);
  const skippedArtifacts = Number(metricsSummary.scan.artifactScan.skippedCount || 0);
  return {
    score,
    status: scoreStatus(score),
    value: Number.isFinite(value) ? value : null,
    formula: 'artifactCoverage * 100',
    matchedArtifacts,
    skippedArtifacts,
    scannedArtifacts: matchedArtifacts + skippedArtifacts,
    reason: Number.isFinite(value) ? '' : 'no formal artifact coverage data available',
  };
}

function buildHandoffIntegrityScore(metricsSummary) {
  const turnCount = Number(metricsSummary.metrics.turnCount || 0);
  const handoffAvailableCount = Number(metricsSummary.metrics.handoffAvailableCount || 0);
  const handoffCoverageRate = divide(handoffAvailableCount, turnCount);
  const rawMismatchRate = metricsSummary.metrics.handoffMismatchRate;
  const mismatchRate = Number.isFinite(rawMismatchRate) ? Number(rawMismatchRate) : null;

  if (handoffAvailableCount <= 0 || handoffCoverageRate === null || mismatchRate === null) {
    return {
      score: null,
      status: 'unknown',
      coverageRate: handoffCoverageRate,
      mismatchRate,
      passRate: null,
      formula: 'handoffCoverageRate * (1 - handoffMismatchRate)',
      reason: 'no handoff verdicts available in matched turns',
    };
  }

  const passRate = Math.max(0, 1 - mismatchRate);
  const score = rateToScore(handoffCoverageRate * passRate);
  return {
    score,
    status: scoreStatus(score),
    coverageRate: handoffCoverageRate,
    mismatchRate,
    passRate,
    formula: 'handoffCoverageRate * (1 - handoffMismatchRate)',
    reason: '',
  };
}

function parsePathComparisonArtifact(filePath) {
  const artifact = readJsonOrThrow(filePath, 'path comparison artifact');
  if (!artifact || artifact.schemaVersion !== 'execution-path-comparison/v1' || artifact.kind !== 'execution-path-comparison') {
    return {
      ok: false,
      path: relativePath(filePath),
      reason: 'unsupported-artifact-version',
      detail: `schemaVersion=${artifact && artifact.schemaVersion ? artifact.schemaVersion : '(missing)'} kind=${artifact && artifact.kind ? artifact.kind : '(missing)'}`,
    };
  }

  return {
    ok: true,
    sample: {
      path: relativePath(filePath),
      generatedAt: String(artifact.generatedAt || ''),
      verdict: String(artifact.verdict || 'unknown').trim() || 'unknown',
      issueCount: Array.isArray(artifact.issues) ? artifact.issues.length : 0,
      baselinePath: artifact.baseline && artifact.baseline.sourcePath ? String(artifact.baseline.sourcePath) : '',
      candidatePath: artifact.candidate && artifact.candidate.sourcePath ? String(artifact.candidate.sourcePath) : '',
    },
  };
}

function loadPathDriftComparisons(rootPath) {
  const absoluteRoot = resolveProjectPath(rootPath || DEFAULT_PATH_COMPARISON_ROOT);
  const files = walkJsonFiles(absoluteRoot);
  const samples = [];
  const skipped = [];
  const verdictCounts = {};
  let latestGeneratedAt = '';

  files.forEach((filePath) => {
    let parsed;
    try {
      parsed = parsePathComparisonArtifact(filePath);
    } catch (error) {
      skipped.push({
        path: relativePath(filePath),
        reason: 'broken-json',
        detail: error.message,
      });
      return;
    }

    if (!parsed.ok) {
      skipped.push({ path: parsed.path, reason: parsed.reason, detail: parsed.detail });
      return;
    }

    samples.push(parsed.sample);
    incrementCount(verdictCounts, parsed.sample.verdict);
    if (parsed.sample.generatedAt && (!latestGeneratedAt || parsed.sample.generatedAt > latestGeneratedAt)) {
      latestGeneratedAt = parsed.sample.generatedAt;
    }
  });

  return {
    root: relativePath(absoluteRoot),
    scannedFileCount: files.length,
    matchedCount: samples.length,
    skipped,
    verdictCounts,
    latestGeneratedAt: latestGeneratedAt || null,
    samples,
  };
}

function buildPathDriftScore(pathDriftScan) {
  if (pathDriftScan.matchedCount <= 0) {
    return {
      score: null,
      status: 'unknown',
      sampleCount: 0,
      verdictCounts: {},
      verdictScoreMap: PATH_DRIFT_SCORE_BY_VERDICT,
      formula: 'average(verdictScore)',
      latestGeneratedAt: null,
      reason: `no execution-path-comparison/v1 artifacts found under ${pathDriftScan.root}`,
    };
  }

  const totalScore = pathDriftScan.samples.reduce((sum, sample) => {
    return sum + (PATH_DRIFT_SCORE_BY_VERDICT[sample.verdict] || 0);
  }, 0);
  const score = clampScore(totalScore / pathDriftScan.matchedCount);
  return {
    score,
    status: scoreStatus(score),
    sampleCount: pathDriftScan.matchedCount,
    verdictCounts: pathDriftScan.verdictCounts,
    verdictScoreMap: PATH_DRIFT_SCORE_BY_VERDICT,
    formula: 'average(verdictScore)',
    latestGeneratedAt: pathDriftScan.latestGeneratedAt,
    reason: '',
  };
}

function collectArtifactDates(artifactsRoot) {
  const history = queryTurnArtifactHistory({ root: artifactsRoot || DEFAULT_ARTIFACT_ROOT });
  return Array.from(new Set(history.entries.map((entry) => entry.date).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function buildTrendSnapshots(artifactsRoot, tracesRoot, trendLimit) {
  const dates = collectArtifactDates(artifactsRoot).slice(-Math.max(1, trendLimit));
  return dates.map((date) => {
    const metricsSummary = accumulateHarnessMetrics({
      artifacts: artifactsRoot,
      traces: tracesRoot,
      date,
    });
    const handoffIntegrity = buildHandoffIntegrityScore(metricsSummary);
    return {
      date,
      turnCount: metricsSummary.metrics.turnCount,
      avgContextTokens: metricsSummary.metrics.avgContextTokens,
      artifactCoverage: metricsSummary.metrics.artifactCoverage,
      traceCoverageRate: metricsSummary.metrics.traceCoverageRate,
      gateFailRate: metricsSummary.metrics.gateFailRate,
      traceRetryCount: metricsSummary.metrics.traceRetryCount,
      handoffCoverageRate: handoffIntegrity.coverageRate,
      handoffMismatchRate: handoffIntegrity.mismatchRate,
      handoffIntegrityScore: handoffIntegrity.score,
      missingHandoffCount: metricsSummary.missingData.handoffMissingCount,
      traceMissingCount: metricsSummary.missingData.traceMissingCount,
    };
  });
}

function buildRolloutObservability(args) {
  const currentMetricsSummary = accumulateHarnessMetrics({
    artifacts: args.artifacts,
    traces: args.traces,
  });
  const pathDriftScan = loadPathDriftComparisons(args.pathComparisons);
  const trendSnapshots = buildTrendSnapshots(args.artifacts, args.traces, args.trendLimit);

  return {
    generatedAt: new Date().toISOString(),
    sources: {
      artifacts: currentMetricsSummary.sources.artifacts,
      traces: currentMetricsSummary.sources.traces,
      pathComparisons: pathDriftScan.root,
    },
    currentSummary: {
      schemaVersion: currentMetricsSummary.schemaVersion,
      kind: currentMetricsSummary.kind,
      generatedAt: currentMetricsSummary.generatedAt,
      filters: currentMetricsSummary.filters,
      scan: currentMetricsSummary.scan,
      metrics: currentMetricsSummary.metrics,
      missingData: currentMetricsSummary.missingData,
    },
    scores: {
      artifactCoverage: buildArtifactCoverageScore(currentMetricsSummary),
      handoffIntegrity: buildHandoffIntegrityScore(currentMetricsSummary),
      pathDrift: buildPathDriftScore(pathDriftScan),
    },
    trend: {
      kind: 'daily-metrics-trend/v1',
      limit: args.trendLimit,
      snapshotCount: trendSnapshots.length,
      snapshots: trendSnapshots,
    },
    pathDriftSamples: {
      scannedFileCount: pathDriftScan.scannedFileCount,
      matchedCount: pathDriftScan.matchedCount,
      skippedCount: pathDriftScan.skipped.length,
      latestGeneratedAt: pathDriftScan.latestGeneratedAt,
      verdictCounts: pathDriftScan.verdictCounts,
      skipped: pathDriftScan.skipped,
      samples: pathDriftScan.samples,
    },
  };
}

// ─── 視覺化輸出 ───────────────────────────────────────────
function renderBar(score, width = 20) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const filled = Math.round((safeScore / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function scoreColor(score) {
  if (score >= 80) return '✅';
  if (score >= 60) return '⚠️';
  return '❌';
}

function renderTrendLine(snapshot) {
  return `${snapshot.date} t=${snapshot.turnCount} art=${formatPercent(snapshot.artifactCoverage)} hand=${formatScore(snapshot.handoffIntegrityScore)} gate=${formatPercent(snapshot.gateFailRate)}`;
}

function renderRolloutSection(row, borderB, rollout, brief) {
  const artifactCoverage = rollout.scores.artifactCoverage;
  const handoffIntegrity = rollout.scores.handoffIntegrity;
  const pathDrift = rollout.scores.pathDrift;
  const pathDriftNote = pathDrift.sampleCount > 0
    ? ''
    : 'Path Drift Note: no comparison artifacts';

  console.log(borderB);
  console.log(row('📈 Harness Rollout Signals'));
  console.log(row(`   ${scoreIcon(artifactCoverage.status)} Artifact Coverage: ${formatPercent(artifactCoverage.value)} (${formatScore(artifactCoverage.score)})`));
  console.log(row(`   ${scoreIcon(handoffIntegrity.status)} Handoff Integrity: ${formatScore(handoffIntegrity.score)} cov=${formatPercent(handoffIntegrity.coverageRate)}`));
  console.log(row(`   ${scoreIcon(pathDrift.status)} Path Drift: ${formatScore(pathDrift.score)} samples=${pathDrift.sampleCount}`));

  if (!brief) {
    if (rollout.trend.snapshots.length === 0) {
      console.log(row('   Trend: no daily snapshots available'));
    } else {
      rollout.trend.snapshots.slice(-3).forEach((snapshot) => {
        console.log(row(`   ${renderTrendLine(snapshot)}`));
      });
    }

    if (pathDriftNote) {
      console.log(row(`   ${pathDriftNote}`));
    }
  }

  console.log(row(''));
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
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length
  );
  const rollout = buildRolloutObservability(args);

  if (args.json) {
    console.log(JSON.stringify({ overallScore, dimensions, rollout }, null, 2));
    return;
  }

  const width = 58;
  const border = '╔' + '═'.repeat(width) + '╗';
  const borderB = '╠' + '═'.repeat(width) + '╣';
  const borderE = '╚' + '═'.repeat(width) + '╝';
  const row = (text) => {
    const value = String(text || '').slice(0, width - 2);
    return '║  ' + value.padEnd(width - 2) + '║';
  };

  console.log(`\n${border}`);
  console.log(row('🛡️  3KLife Harness Health Report'));
  console.log(row(`   Generated: ${new Date().toLocaleString('zh-TW')}`));
  console.log(borderB);

  for (const dimension of dimensions) {
    const icon = scoreColor(dimension.score);
    const bar = renderBar(dimension.score);
    console.log(row(`${icon} ${dimension.dimension}`));
    console.log(row(`   ${bar} ${Math.round(dimension.score)}%`));

    if (!args.brief) {
      for (const item of dimension.items) {
        const itemIcon = item.status === 'good' ? '✅' : item.status === 'warn' ? '⚠️' : '❌';
        const countStr = item.count !== undefined ? ` (${item.count})` : '';
        const name = (item.name + countStr).slice(0, 50);
        console.log(row(`     ${itemIcon} ${name}`));
      }
    }

    console.log(row(''));
  }

  renderRolloutSection(row, borderB, rollout, args.brief);

  console.log(borderB);
  const overallBar = renderBar(overallScore);
  const overallIcon = scoreColor(overallScore);
  console.log(row(`${overallIcon} 綜合得分：${overallBar} ${overallScore}/100`));
  console.log(borderE);

  const poorItems = dimensions.flatMap((dimension) => {
    return dimension.items
      .filter((item) => item.status === 'poor')
      .map((item) => ({ dim: dimension.dimension, item }));
  });

  if (poorItems.length > 0 && !args.brief) {
    console.log('\n📋 優先改進項目：\n');
    for (const { item } of poorItems.slice(0, 5)) {
      console.log(`  ❌ ${item.name}`);
    }
  }

  console.log('');
}

main();
