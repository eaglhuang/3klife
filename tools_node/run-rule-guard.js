#!/usr/bin/env node
'use strict';

const path = require('path');
const { evaluateRulePack } = require('./adapters/atm-3klife/rule-guard-adapter');

function parseArgs(argv) {
  const parsed = {
    profile: 'atm',
    json: false,
    rulePack: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--profile') {
      parsed.profile = argv[index + 1] || parsed.profile;
      index += 1;
      continue;
    }
    if (token === '--rule-pack') {
      parsed.rulePack = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--json') {
      parsed.json = true;
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
  console.log('Usage: node tools_node/run-rule-guard.js [--profile atm] [--rule-pack <path>] [--json]');
}

function printSummary(result) {
  const blocking = result.findings.filter((item) => item.action === 'fail' || item.severity === 'block');
  const warning = result.findings.filter((item) => item.action !== 'fail' && item.severity !== 'block');

  console.log(`RuleGuard profile=${result.profile} passed=${result.passed ? 'yes' : 'no'} findings=${result.findings.length}`);
  console.log(`  blocking=${blocking.length} warning=${warning.length}`);

  if (result.findings.length > 0) {
    for (const finding of result.findings.slice(0, 20)) {
      const filePart = finding.file ? ` file=${finding.file}${finding.line ? `:${finding.line}` : ''}` : '';
      console.log(`  - [${finding.ruleId}] ${finding.message}${filePart}`);
      console.log(`    trigger=${finding.trigger} scope=${finding.scope} severity=${finding.severity} action=${finding.action}`);
      console.log(`    routeClass=${finding.routeClass || 'advisory'}`);
      console.log(`    routeHint=${finding.routeHint}`);
    }
    if (result.findings.length > 20) {
      console.log(`  ... and ${result.findings.length - 20} more findings`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rulePackPath = args.rulePack
    ? path.resolve(args.rulePack)
    : path.join(__dirname, 'adapters', 'atm-3klife', 'rule-pack.json');

  const result = evaluateRulePack({
    profile: args.profile,
    rulePackPath,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }

  process.exit(result.passed ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(`[rule-guard] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
