#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  path.join(PROJECT_ROOT, 'tools_node', 'atomic-framework'),
  path.join(PROJECT_ROOT, 'tools_node', 'adapters', 'atm-3klife'),
  path.join(PROJECT_ROOT, 'tools_node', 'validate-registry-backfill-sweep.js'),
  path.join(PROJECT_ROOT, 'tools_node', 'validate-registry-sidecar-convergence.js'),
  path.join(PROJECT_ROOT, 'tools_node', 'validate-registry-version-governance.js'),
  path.join(PROJECT_ROOT, 'tools_node', 'validate-atm-stability-closeout.js'),
  path.join(PROJECT_ROOT, 'tools_node', 'validate-framework-atomization-coverage.js'),
];

const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.ts']);
const ANY_COLON_PATTERN = /:\s*any\b/;
const ANY_GENERIC_PATTERN = /<[^>]*\bany\b[^>]*>/;
const AS_ANY_PATTERN = /\bas\s+any\b/;

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
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
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-atm-any-boundaries.js [--strict] [--report <json>]');
  console.log('');
  console.log('Scans ATM critical governance surfaces and fails if any `any` / `as any` leaks into the boundary.');
}

function rel(filePath) {
  return path.relative(PROJECT_ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function walkFiles(targetPath, out = []) {
  if (!fs.existsSync(targetPath)) {
    return out;
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    out.push(targetPath);
    return out;
  }

  if (!stats.isDirectory()) {
    return out;
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(child, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (SCAN_EXTENSIONS.has(ext)) {
      out.push(child);
    }
  }
  return out;
}

function scanTarget(filePath) {
  const text = readText(filePath);
  const lines = text.split(/\r?\n/);
  const findings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }
    if (!ANY_COLON_PATTERN.test(line) && !ANY_GENERIC_PATTERN.test(line) && !AS_ANY_PATTERN.test(line)) {
      continue;
    }
    findings.push({
      file: rel(filePath),
      line: index + 1,
      snippet: trimmed.slice(0, 180),
    });
  }

  return findings;
}

function buildReport() {
  const scannedFiles = [];
  for (const target of TARGETS) {
    scannedFiles.push(...walkFiles(target));
  }

  const uniqueFiles = [...new Set(scannedFiles.map((filePath) => path.resolve(filePath)))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const findings = [];
  const perFile = [];

  for (const filePath of uniqueFiles) {
    const fileFindings = scanTarget(filePath);
    if (fileFindings.length === 0) {
      continue;
    }
    perFile.push({
      file: rel(filePath),
      matchCount: fileFindings.length,
    });
    findings.push(...fileFindings.map((finding) => ({
      findingVersion: 'atm-any-boundary-finding/v1',
      kind: 'atm-any-boundary-finding',
      ruleId: 'atm-any-boundaries.any-leak',
      trigger: 'atm.any-boundaries.any-leak',
      scope: finding.file,
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '把 any 收斂到邊界，核心治理面改成 unknown + schema guard。',
      message: `any leak found in ${finding.file}:${finding.line}`,
      file: finding.file,
      line: finding.line,
      details: {
        snippet: finding.snippet,
      },
    })));
  }

  const blockerCount = findings.length;
  const summary = {
    targetCount: TARGETS.length,
    fileCount: uniqueFiles.length,
    matchCount: findings.length,
    fileBreakdown: perFile,
  };

  return {
    validator: 'validate-atm-any-boundaries',
    scannedTargets: TARGETS.map((target) => rel(target)),
    summary,
    findings,
    checks: [
      {
        id: 'atm-critical-surface-any-free',
        passed: blockerCount === 0,
      },
    ],
    passed: blockerCount === 0,
    blockerCount,
    warningCount: 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = buildReport();
  if (args.report) {
    const out = path.resolve(args.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.error(`[validate-atm-any-boundaries] report=${rel(out)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-atm-any-boundaries] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount}`);

  if (args.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[validate-atm-any-boundaries] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  buildReport,
  scanTarget,
  walkFiles,
};
