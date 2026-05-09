#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadRulePack, evaluateRulePack } = require('./adapters/atm-3klife/rule-guard-adapter');

const ROOT = path.resolve(__dirname, '..');
const RULE_PACK_PATH = path.join(__dirname, 'adapters', 'atm-3klife', 'rule-pack.json');

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

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function buildFinding(message, details = {}) {
  return {
    findingVersion: 'rule-pack-finding/v1',
    kind: 'rule-pack-finding',
    ruleId: 'rule-guard-read-only',
    trigger: 'rule-guard.read-only-mutation-path',
    scope: 'tools_node/{run-rule-guard.js,adapters/atm-3klife/rule-guard-adapter.js,adapters/atm-3klife/rule-pack.json}',
    severity: 'block',
    action: 'fail',
    routeClass: 'blocker',
    routeHint: '只保留 read-only child process 與讀檔檢查；若需要 task card、lock、shard、doc registry 或 lifecycle status mutation，請拆成另一條 writer path。',
    message,
    file: '',
    line: 0,
    details,
  };
}

function validateRulePackStructure(rulePack) {
  const findings = [];
  const checks = [];
  const rules = Array.isArray(rulePack.rules) ? rulePack.rules : [];
  const profile = Array.isArray(rulePack.profiles && rulePack.profiles.atm) ? rulePack.profiles.atm : [];
  const readOnlyRule = rules.find((rule) => rule && rule.id === 'rule-guard-read-only');

  if (!readOnlyRule) {
    findings.push(buildFinding('rule-pack missing rule-guard-read-only rule', { ruleId: 'rule-guard-read-only' }));
  } else {
    if (readOnlyRule.trigger !== 'rule-guard.read-only-mutation-path') {
      findings.push(buildFinding('rule-guard-read-only trigger must be rule-guard.read-only-mutation-path', {
        actual: readOnlyRule.trigger || '',
        expected: 'rule-guard.read-only-mutation-path',
      }));
    }

    const expectedScopeParts = [
      'run-rule-guard.js',
      'rule-guard-adapter.js',
      'rule-pack.json',
    ];
    const scopeText = String(readOnlyRule.scope || '');
    for (const part of expectedScopeParts) {
      if (!scopeText.includes(part)) {
        findings.push(buildFinding('rule-guard-read-only scope must include the read-only rule-guard surfaces', {
          actual: scopeText,
          expectedPart: part,
        }));
      }
    }

    if (readOnlyRule.severity !== 'block' || readOnlyRule.action !== 'fail' || readOnlyRule.routeClass !== 'blocker') {
      findings.push(buildFinding('rule-guard-read-only must stay a blocking blocker rule', {
        severity: readOnlyRule.severity || '',
        action: readOnlyRule.action || '',
        routeClass: readOnlyRule.routeClass || '',
      }));
    }

    const routeHint = String(readOnlyRule.routeHint || '');
    if (!/read-only|只讀/i.test(routeHint)) {
      findings.push(buildFinding('rule-guard-read-only routeHint should explicitly mention read-only behavior', {
        routeHint,
      }));
    }
  }

  if (!profile.includes('rule-guard-read-only')) {
    findings.push(buildFinding('atm profile must include rule-guard-read-only', {
      profile,
    }));
  }

  checks.push({
    id: 'rule-pack-structure',
    passed: findings.length === 0,
    status: findings.length === 0 ? 0 : 1,
    stderr: findings.length === 0 ? '' : `violations=${findings.length}`,
  });

  return { findings, checks };
}

function buildReport(result, structure) {
  const findings = [
    ...structure.findings,
    ...result.findings.filter((item) => item.ruleId === 'rule-guard-read-only'),
  ];
  const blockerCount = findings.filter((item) => item.action === 'fail' || item.severity === 'block').length;
  const warningCount = findings.filter((item) => item.action !== 'fail' && item.severity !== 'block').length;
  const checks = [
    ...structure.checks,
    ...result.checks.filter((check) => check.id === 'rule-guard-read-only-scan'),
  ];

  return {
    validator: 'validate-rule-guard-read-only',
    profile: result.profile,
    rulePackPath: rel(RULE_PACK_PATH),
    passed: blockerCount === 0,
    blockerCount,
    warningCount,
    checks,
    findings,
  };
}

function printHelp() {
  console.log('Usage: node tools_node/validate-rule-guard-read-only.js [--strict] [--report <json>]');
  console.log('');
  console.log('Validates the ATM RuleGuard read-only gate and its deterministic scan surface.');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const rulePack = loadRulePack(RULE_PACK_PATH);
  const structure = validateRulePackStructure(rulePack);
  const result = evaluateRulePack({
    profile: 'atm',
    rulePackPath: RULE_PACK_PATH,
  });
  const report = buildReport(result, structure);

  if (opts.report) {
    const out = path.resolve(opts.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.error(`[validate-rule-guard-read-only] report=${rel(out)}`);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  console.error(`[validate-rule-guard-read-only] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount} warnings=${report.warningCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-rule-guard-read-only] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  validateRulePackStructure,
  buildReport,
};
