#!/usr/bin/env node
// Rule-registry validation CLI for the HTML-to-UCUF toolchain.
'use strict';

const fs = require('fs');
const path = require('path');
const { runRuleGuard } = require('./lib/html-to-ucuf/rule-guard');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    strict: false,
    report: null,
    summary: null,
    sourceHtml: null,
    layout: null,
    captureReport: null,
    expectedScreenId: null,
    scanCore: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--strict': opts.strict = true; break;
      case '--report': opts.report = next(); break;
      case '--summary':
      case '--workflow-summary':
        opts.summary = next();
        break;
      case '--source-html': opts.sourceHtml = next(); break;
      case '--layout': opts.layout = next(); break;
      case '--capture-report': opts.captureReport = next(); break;
      case '--expected-screen-id': opts.expectedScreenId = next(); break;
      case '--no-scan-core': opts.scanCore = false; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`[validate-html-to-ucuf-rule-guard] unknown arg: ${token}`);
        process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/validate-html-to-ucuf-rule-guard.js [--strict] [--report <json>] [--summary <workflow-summary.json>]

Checks active HTML-to-UCUF rules from tools_node/lib/html-to-ucuf/rule-registry.json,
including draftBuilderStageRules, fidelityThresholds, and knownGaps/exemptCategories contracts.`);
}

function main() {
  const opts = parseArgs(process.argv);
  const report = runRuleGuard({
    repoRoot: ROOT,
    strict: opts.strict,
    workflowSummaryPath: opts.summary,
    sourceHtmlPath: opts.sourceHtml,
    layout: opts.layout,
    captureReportPath: opts.captureReport,
    expectedScreenId: opts.expectedScreenId,
    scanCore: opts.scanCore,
  });

  if (opts.report) {
    const out = path.resolve(opts.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`[validate-html-to-ucuf-rule-guard] report=${rel(out)}`);
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }

  console.log(`[validate-html-to-ucuf-rule-guard] status=${report.status} blockers=${report.blockerCount} warnings=${report.warningCount}`);
  for (const violation of report.violations.slice(0, 12)) {
    console.error(`[${violation.ruleId}] ${violation.summary}`);
    if (violation.evidence) console.error(`  Evidence: ${violation.evidence}`);
    if (violation.fixAction) console.error(`  Fix: ${violation.fixAction}`);
  }
  if (opts.strict && report.blockerCount > 0) process.exit(12);
}

function runValidation(opts = {}) {
  return runRuleGuard({
    repoRoot: ROOT,
    strict: Boolean(opts.strict),
    workflowSummaryPath: opts.summary || null,
    sourceHtmlPath: opts.sourceHtml || null,
    layout: opts.layout || null,
    captureReportPath: opts.captureReport || null,
    expectedScreenId: opts.expectedScreenId || null,
    scanCore: opts.scanCore !== false,
  });
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(`[validate-html-to-ucuf-rule-guard] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = { parseArgs, runValidation, main };
