#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv = process.argv.slice(2)) {
  const state = {
    reportPath: '',
    metricsPath: '',
    outputPath: '',
    top: 5,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--report') {
      state.reportPath = String(next() || '').trim();
      continue;
    }
    if (token === '--metrics') {
      state.metricsPath = String(next() || '').trim();
      continue;
    }
    if (token === '--output') {
      state.outputPath = String(next() || '').trim();
      continue;
    }
    if (token === '--top') {
      const parsed = Number(next());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('--top must be a positive number');
      }
      state.top = Math.floor(parsed);
      continue;
    }
    if (token === '--json') {
      state.json = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      state.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return state;
}

function printHelp() {
  process.stdout.write([
    'Usage: node tools_node/render-atm-release-shadow-summary.js --report <path> [options]',
    '',
    'Options:',
    '  --metrics <path>   Optional shadow metrics JSON.',
    '  --output <path>    Summary markdown output (default: $GITHUB_STEP_SUMMARY).',
    '  --top <n>          Top-N failed step rows (default: 5).',
    '  --json             Emit machine-readable payload.',
  ].join('\n') + '\n');
}

function resolvePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
}

function readJson(filePath) {
  const absolute = resolvePath(filePath);
  if (!absolute || !fs.existsSync(absolute)) {
    return { ok: false, value: null, error: `missing file: ${filePath}` };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, ''));
    return { ok: true, value: parsed, error: '' };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: `invalid json (${filePath}): ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function toSeverity(report) {
  if (!report || typeof report !== 'object') {
    return { level: 'RED', reason: 'missing-report' };
  }
  const failedCount = Number(report && report.summary && report.summary.failedStepCount || 0);
  const precheckFailed = Boolean(report && report.precheck && report.precheck.passed === false);
  if (precheckFailed || failedCount > 2) {
    return { level: 'RED', reason: precheckFailed ? 'precheck-failed' : 'too-many-failures' };
  }
  if (failedCount > 0) {
    return { level: 'YELLOW', reason: 'shadow-failures-detected' };
  }
  return { level: 'GREEN', reason: 'all-steps-passed' };
}

function severityBadge(level) {
  if (level === 'GREEN') return 'GREEN [G]';
  if (level === 'YELLOW') return 'YELLOW [Y]';
  return 'RED [R]';
}

function formatFailureRows(report, topN) {
  const rows = [];
  for (const step of Array.isArray(report && report.steps) ? report.steps : []) {
    if (step && step.skipped) continue;
    if (step && step.passed) continue;
    rows.push({
      id: String(step && step.id || ''),
      reason: String(step && (step.reason || step.error) || 'command-failed'),
      status: typeof step.status === 'number' ? step.status : null,
      durationMs: typeof step.durationMs === 'number' ? step.durationMs : null,
    });
  }
  return rows.slice(0, topN);
}

function formatMetricRows(metrics, topN) {
  const aggregate = metrics && metrics.aggregate && typeof metrics.aggregate === 'object'
    ? metrics.aggregate
    : null;
  const rows = Array.isArray(aggregate && aggregate.topFailedSteps)
    ? aggregate.topFailedSteps
    : [];
  return rows
    .map((row) => ({
      id: String(row && row.id || ''),
      count: Number(row && row.count || 0),
    }))
    .filter((row) => row.id)
    .slice(0, topN);
}

function buildMarkdown(report, metrics, options = {}) {
  const topN = Number(options.top || 5);
  const severity = toSeverity(report);
  const failedRows = formatFailureRows(report, topN);
  const metricRows = formatMetricRows(metrics, topN);
  const mode = String(report && report.mode || 'release');
  const durationMs = Number(report && report.summary && report.summary.totalDurationMs || 0);
  const failedCount = Number(report && report.summary && report.summary.failedStepCount || 0);
  const nextCommand = String(report && report.userFacing && report.userFacing.nextCommand || '').trim();
  const blockedAt = String(report && report.userFacing && report.userFacing.blockedAt || '').trim();

  const lines = [
    '### ATM Release Shadow Summary',
    '',
    '| Signal | Value |',
    '| --- | --- |',
    `| Severity | ${severityBadge(severity.level)} |`,
    `| Mode | ${mode} |`,
    `| Failed Steps | ${failedCount} |`,
    `| Total Duration (ms) | ${durationMs} |`,
    `| Blocked At | ${blockedAt || 'none'} |`,
    `| Next Command | ${nextCommand || 'none'} |`,
    '',
    `Current run failed steps (Top ${topN}):`,
  ];

  if (failedRows.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Step | Reason | Exit | Duration (ms) |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of failedRows) {
      lines.push(`| ${row.id || 'n/a'} | ${row.reason || 'n/a'} | ${row.status ?? 'n/a'} | ${row.durationMs ?? 'n/a'} |`);
    }
  }

  lines.push('');
  lines.push(`Historical failed steps (Top ${topN}):`);
  if (metricRows.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Step | Count |');
    lines.push('| --- | --- |');
    for (const row of metricRows) {
      lines.push(`| ${row.id} | ${row.count} |`);
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeSummary(outputPath, markdown) {
  const target = resolvePath(outputPath || process.env.GITHUB_STEP_SUMMARY || '');
  if (!target) {
    return {
      ok: false,
      path: '',
      error: 'output path missing (use --output or set GITHUB_STEP_SUMMARY)',
    };
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, markdown, 'utf8');
  return {
    ok: true,
    path: target,
    error: '',
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (!args.reportPath) {
    throw new Error('--report is required');
  }

  const reportLoad = readJson(args.reportPath);
  if (!reportLoad.ok) {
    throw new Error(reportLoad.error);
  }
  const metricsLoad = args.metricsPath ? readJson(args.metricsPath) : { ok: true, value: null, error: '' };
  const markdown = buildMarkdown(reportLoad.value, metricsLoad.ok ? metricsLoad.value : null, { top: args.top });
  const write = writeSummary(args.outputPath, markdown);
  if (!write.ok) {
    throw new Error(write.error);
  }

  const result = {
    ok: true,
    reportPath: args.reportPath,
    metricsPath: args.metricsPath,
    outputPath: write.path,
    top: args.top,
    severity: toSeverity(reportLoad.value),
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`[render-atm-release-shadow-summary] wrote ${path.relative(ROOT, write.path).replace(/\\/g, '/')}\n`);
  }

  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildMarkdown,
  main,
  parseArgs,
  readJson,
  severityBadge,
  toSeverity,
};
