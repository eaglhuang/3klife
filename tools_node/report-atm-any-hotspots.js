#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE_PATH = path.join(PROJECT_ROOT, 'artifacts', 'atm', 'any-hotspots-baseline.json');

const HOTSPOT_PATHS = [
  'extensions/cocos-mcp-server/source/tools/prefab-tools.ts',
  'extensions/cocos-mcp-server/source/panels/tool-manager/index.ts',
  'extensions/cocos-mcp-server/source/tools/component-tools.ts',
  'extensions/cocos-mcp-server/source/tools/node-tools.ts',
  'extensions/cocos-mcp-server/source/scene.ts',
  'assets/scripts/ui/core/UIPreviewStyleBuilder.ts',
  'assets/scripts/ui/core/UIPreviewBuilder.ts',
  'tests/cc.mock.ts',
  'tests/ucuf/gridPanel.test.ts',
  'tests/ucuf/scrollListPanel.test.ts',
  'tests/ucuf/attributePanel.test.ts',
];

const ANY_PATTERN = /:\s*any\b|\bas\s+any\b/g;

function rel(filePath) {
  return path.relative(PROJECT_ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function parseArgs(argv) {
  const parsed = {
    baseline: null,
    writeBaseline: null,
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--baseline') {
      parsed.baseline = argv[index + 1] ? path.resolve(argv[index + 1]) : null;
      index += 1;
      continue;
    }
    if (token === '--write-baseline') {
      parsed.writeBaseline = argv[index + 1] ? path.resolve(argv[index + 1]) : DEFAULT_BASELINE_PATH;
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (token === '--strict') {
      parsed.strict = true;
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
  console.log('Usage: node tools_node/report-atm-any-hotspots.js [--baseline <json>] [--write-baseline [json]] [--strict]');
  console.log('');
  console.log('Reports explicit `: any` / `as any` hotspots and checks ATM core boundary leak status.');
}

function countAnyMatches(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const matches = text.match(ANY_PATTERN);
  return matches ? matches.length : 0;
}

function collectCurrentSnapshot() {
  const fileBreakdown = HOTSPOT_PATHS.map((relativePath) => {
    const absolutePath = path.join(PROJECT_ROOT, relativePath);
    const matchCount = countAnyMatches(absolutePath);
    return {
      file: rel(absolutePath),
      matchCount,
    };
  }).sort((left, right) => {
    if (right.matchCount !== left.matchCount) {
      return right.matchCount - left.matchCount;
    }
    return left.file.localeCompare(right.file, 'en');
  });

  const total = fileBreakdown.reduce((sum, item) => sum + item.matchCount, 0);
  return {
    generatedAt: new Date().toISOString(),
    total,
    fileBreakdown,
  };
}

function toMap(fileBreakdown) {
  const map = new Map();
  for (const item of fileBreakdown || []) {
    map.set(String(item.file), Number(item.matchCount || 0));
  }
  return map;
}

function buildDelta(currentSnapshot, baselineSnapshot) {
  if (!baselineSnapshot) {
    return null;
  }

  const baselineMap = toMap(baselineSnapshot.fileBreakdown);
  const currentMap = toMap(currentSnapshot.fileBreakdown);
  const files = new Set([...baselineMap.keys(), ...currentMap.keys()]);
  const fileDelta = [];

  for (const file of files) {
    const current = currentMap.get(file) || 0;
    const baseline = baselineMap.get(file) || 0;
    const delta = current - baseline;
    if (delta !== 0) {
      fileDelta.push({ file, baseline, current, delta });
    }
  }

  fileDelta.sort((left, right) => {
    const deltaAbsDiff = Math.abs(right.delta) - Math.abs(left.delta);
    if (deltaAbsDiff !== 0) return deltaAbsDiff;
    return left.file.localeCompare(right.file, 'en');
  });

  return {
    baselineTotal: Number(baselineSnapshot.total || 0),
    currentTotal: currentSnapshot.total,
    totalDelta: currentSnapshot.total - Number(baselineSnapshot.total || 0),
    fileDelta,
  };
}

function loadBaseline(baselinePath) {
  if (!baselinePath || !fs.existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

function writeBaseline(outPath, snapshot) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

function runAnyBoundaryCheck() {
  const validator = require('./validate-atm-any-boundaries');
  const report = validator.buildReport();
  return {
    passed: Boolean(report.passed),
    blockerCount: Number(report.blockerCount || 0),
    findingCount: Number(report.findings?.length || 0),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const baselineSnapshot = loadBaseline(args.baseline);
  const currentSnapshot = collectCurrentSnapshot();
  const delta = buildDelta(currentSnapshot, baselineSnapshot);
  const anyBoundary = runAnyBoundaryCheck();

  if (args.writeBaseline) {
    writeBaseline(args.writeBaseline, currentSnapshot);
  }

  const report = {
    reportVersion: 'atm-any-hotspot-report/v1',
    validator: 'report-atm-any-hotspots',
    scannedHotspotCount: HOTSPOT_PATHS.length,
    baselinePath: args.baseline ? rel(args.baseline) : null,
    baselineLoaded: Boolean(baselineSnapshot),
    baselineWrittenTo: args.writeBaseline ? rel(args.writeBaseline) : null,
    current: currentSnapshot,
    delta,
    anyBoundary,
    passed: anyBoundary.passed && (!delta || delta.totalDelta <= 0),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (args.strict && !report.passed) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`[report-atm-any-hotspots] ${error.stack || error.message || error}`);
  process.exit(1);
}

