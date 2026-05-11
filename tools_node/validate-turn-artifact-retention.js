#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const storage = require('./lib/turn-artifact-storage');

const projectRoot = storage.PROJECT_ROOT;

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
    root: storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot,
    rotationDays: 30,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--root') {
      parsed.root = argv[index + 1] || parsed.root;
      index += 1;
      continue;
    }
    if (token === '--rotation-days') {
      const value = Number.parseInt(argv[index + 1] || '', 10);
      parsed.rotationDays = Number.isFinite(value) && value >= 0 ? value : parsed.rotationDays;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-turn-artifact-retention.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --strict                Exit non-zero when blocker findings exist');
  console.log('  --report <json>         Optional report output path');
  console.log('  --root <path>           Scan root (default: artifacts/turn-artifacts)');
  console.log('  --rotation-days <n>     Age threshold for rotation candidates (default: 30)');
  console.log('  --help, -h              Show this help');
}

function rel(filePath) {
  return storage.toProjectRelative(filePath);
}

function resolveProjectPath(targetPath) {
  if (!targetPath) {
    return path.join(projectRoot, storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot);
  }
  return path.isAbsolute(targetPath) ? targetPath : path.join(projectRoot, targetPath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function walkJsonFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }
  const files = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        files.push(absolutePath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function readJsonSafe(filePath) {
  try {
    return {
      ok: true,
      value: JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: String(error && error.message ? error.message : error),
    };
  }
}

function buildFinding({
  ruleId,
  trigger,
  scope,
  severity,
  action,
  routeClass,
  routeHint,
  message,
  file,
  details,
}) {
  return {
    findingVersion: 'turn-artifact-retention-finding/v1',
    kind: 'turn-artifact-retention-finding',
    ruleId,
    trigger,
    scope,
    severity,
    action,
    routeClass,
    routeHint,
    message,
    file: file || '',
    line: 0,
    details: details || {},
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isCanonicalFormalPath(relativePath) {
  return /^artifacts\/turn-artifacts\/\d{4}-\d{2}-\d{2}\/[^/]+\/[^/]+\.json$/i.test(relativePath);
}

function extractDateFromCanonicalPath(relativePath) {
  const match = String(relativePath).match(/^artifacts\/turn-artifacts\/(\d{4}-\d{2}-\d{2})\//i);
  return match ? match[1] : '';
}

function toDatePrefix(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function ageDaysSince(datePrefix) {
  if (!datePrefix) return null;
  const parsed = new Date(`${datePrefix}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = Date.now();
  return Math.floor((now - parsed.getTime()) / (24 * 60 * 60 * 1000));
}

function buildReport(args) {
  const scanRoot = resolveProjectPath(args.root);
  const files = walkJsonFiles(scanRoot);
  const findings = [];
  const rotationCandidates = [];
  const summary = {
    root: rel(scanRoot),
    fileCount: files.length,
    canonicalFormalCount: 0,
    legacyFormalCount: 0,
    parseErrorCount: 0,
    blockerCount: 0,
    warningCount: 0,
    rotationCandidateCount: 0,
  };

  if (!fs.existsSync(scanRoot)) {
    findings.push(buildFinding({
      ruleId: 'turn-artifact-retention.scan-root-missing',
      trigger: 'turnArtifactRetention.scanRoot.missing',
      scope: 'artifacts/turn-artifacts',
      severity: 'warn',
      action: 'warn',
      routeClass: 'advisory',
      routeHint: '若尚未產生 turn artifacts，可先忽略；若預期應有輸出，請檢查 workflow。',
      message: 'scan root does not exist',
      file: rel(scanRoot),
      details: { root: rel(scanRoot) },
    }));
  }

  for (const filePath of files) {
    const relativePath = rel(filePath);
    const pathClass = storage.classifyTurnArtifactPath(filePath);
    const canonicalPath = isCanonicalFormalPath(relativePath);
    const loaded = readJsonSafe(filePath);

    if (pathClass !== 'formal') {
      findings.push(buildFinding({
        ruleId: 'turn-artifact-retention.path-class-invalid',
        trigger: 'turnArtifactRetention.pathClass.invalid',
        scope: 'turn-artifact path classification',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: 'turn artifact JSON 應位於 formal root，避免分類漂移。',
        message: `turn artifact JSON is not under formal root (pathClass=${pathClass})`,
        file: relativePath,
        details: { pathClass },
      }));
      continue;
    }

    if (!loaded.ok) {
      summary.parseErrorCount += 1;
      findings.push(buildFinding({
        ruleId: 'turn-artifact-retention.json-parse-failed',
        trigger: 'turnArtifactRetention.json.parseFailed',
        scope: 'JSON parse',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '先修復 JSON 格式，避免 retention/rotation 執行時誤判。',
        message: 'failed to parse artifact JSON',
        file: relativePath,
        details: { error: loaded.error },
      }));
      continue;
    }

    const artifact = loaded.value;
    const generatedAt = normalizeText(artifact.generatedAt);
    const generatedDate = toDatePrefix(generatedAt);
    const workflow = normalizeText(artifact.workflow);
    const task = normalizeText(artifact.task);

    if (canonicalPath) {
      summary.canonicalFormalCount += 1;
      const datePart = extractDateFromCanonicalPath(relativePath);
      if (!generatedDate) {
        findings.push(buildFinding({
          ruleId: 'turn-artifact-retention.generated-at-missing',
          trigger: 'turnArtifactRetention.generatedAt.missing',
          scope: 'turn-artifact metadata',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: 'canonical formal artifact 必須具備 generatedAt，才能做 retention 與追溯。',
          message: 'canonical formal artifact is missing generatedAt',
          file: relativePath,
          details: {},
        }));
      } else if (datePart && generatedDate !== datePart) {
        findings.push(buildFinding({
          ruleId: 'turn-artifact-retention.date-segment-mismatch',
          trigger: 'turnArtifactRetention.pathDate.mismatch',
          scope: 'canonical path date segment',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: 'canonical path 日期需與 generatedAt 日期一致，避免路徑證據漂移。',
          message: 'canonical path date segment does not match generatedAt',
          file: relativePath,
          details: { pathDate: datePart, generatedDate },
        }));
      }

      if (!workflow || !task) {
        findings.push(buildFinding({
          ruleId: 'turn-artifact-retention.workflow-task-missing',
          trigger: 'turnArtifactRetention.workflowTask.missing',
          scope: 'turn-artifact metadata',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: 'canonical formal artifact 需具備 workflow/task 以便歷史查詢與彙整。',
          message: 'canonical formal artifact is missing workflow or task',
          file: relativePath,
          details: { workflow, task },
        }));
      }
      continue;
    }

    summary.legacyFormalCount += 1;
    const ageDays = ageDaysSince(generatedDate || toDatePrefix(artifact.generatedAt));
    findings.push(buildFinding({
      ruleId: 'turn-artifact-retention.legacy-path',
      trigger: 'turnArtifactRetention.legacyPath.detected',
      scope: 'formal path canonicalization',
      severity: 'warn',
      action: 'warn',
      routeClass: 'advisory',
      routeHint: '歷史 legacy path 可先保留；建議用 rotate-turn-artifacts --dry-run 盤點後逐步歸檔。',
      message: 'formal artifact path does not match canonical pattern',
      file: relativePath,
      details: { generatedAt, ageDays },
    }));

    if (ageDays !== null && ageDays >= args.rotationDays) {
      rotationCandidates.push({
        path: relativePath,
        ageDays,
        reason: 'legacy-formal-path',
      });
    }
  }

  summary.rotationCandidateCount = rotationCandidates.length;
  summary.blockerCount = findings.filter((item) => item.severity === 'block').length;
  summary.warningCount = findings.filter((item) => item.severity === 'warn').length;

  return {
    validator: 'validate-turn-artifact-retention',
    policy: storage.describeTurnArtifactStorage(),
    root: rel(scanRoot),
    strictMode: !!args.strict,
    rotationDays: args.rotationDays,
    checks: [
      {
        id: 'formal-path-and-metadata-contract',
        passed: summary.blockerCount === 0,
      },
    ],
    findings,
    rotationCandidates,
    summary,
    passed: summary.blockerCount === 0,
    blockerCount: summary.blockerCount,
    warningCount: summary.warningCount,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = buildReport(args);
  const reportPath = args.report ? resolveProjectPath(args.report) : null;
  if (reportPath) {
    writeJson(reportPath, report);
  }

  console.log(JSON.stringify(report, null, 2));
  if (reportPath) {
    console.log(`[validate-turn-artifact-retention] report=${rel(reportPath)}`);
  }
  console.log(`[validate-turn-artifact-retention] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount} warnings=${report.warningCount}`);

  if (args.strict && !report.passed) {
    process.exit(12);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-turn-artifact-retention] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  buildReport,
  main,
};
