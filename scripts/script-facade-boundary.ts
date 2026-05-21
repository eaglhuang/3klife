const fs = require('fs');
const path = require('path');

const { parseMode, readLines, repoPath } = require('./atm-lang-validator-common.ts');

const PLAN_PATH = 'docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md';
const CLI_DIR = 'packages/cli/src';

const FORBIDDEN_FUNCTION_DECLARATIONS = [
  'scanSourceInventory',
  'buildLegacyRoutePlan',
  'planAtomizeDryRun',
  'planInfectDryRun',
  'buildAtomicMapDecomposition',
  'computeEquivalenceContract',
  'normalizeSymbolId',
  'detectRuntimeCommands',
  'parseDiagnostics',
];

function listCliSourceFiles() {
  const cliPath = repoPath(CLI_DIR);
  if (!fs.existsSync(cliPath)) {
    return [];
  }

  const files = [];
  const stack = [cliPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current)) {
        stack.push(path.join(current, name));
      }
      continue;
    }
    if (/\.(ts|js|mts|cts)$/.test(current)) {
      files.push(current);
    }
  }
  return files;
}

function detectForbiddenFacadeLogic(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];

  FORBIDDEN_FUNCTION_DECLARATIONS.forEach((name) => {
    const pattern = new RegExp(`\\bfunction\\s+${name}\\s*\\(`);
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: idx + 1,
          type: 'forbidden-function-implementation',
          detail: `CLI facade defines core function: ${name}`,
        });
      }
    });
  });

  lines.forEach((line, idx) => {
    if (/\b(new\s+RegExp|\/.*\/[gimsuy]*)/.test(line) && /\b(python|java|c#|csharp|go|php)\b/i.test(line)) {
      findings.push({
        file: filePath,
        line: idx + 1,
        type: 'language-specific-regex-in-facade',
        detail: 'CLI facade appears to own language-specific parsing logic.',
      });
    }
  });

  return findings;
}

function checkCandidateRankBoundaryInPlan() {
  const lines = readLines(PLAN_PATH);
  const row = lines.find((line) => line.includes('| ATM-LANG-0402 |') && line.includes('thin facade'));
  return Boolean(row);
}

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[script-facade-boundary] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const findings = [];
  const cliFiles = listCliSourceFiles();

  for (const filePath of cliFiles) {
    findings.push(...detectForbiddenFacadeLogic(filePath));
  }

  ensure(checkCandidateRankBoundaryInPlan(), 'plan row ATM-LANG-0402 must explicitly declare thin facade boundary', failures);
  ensure(findings.length === 0, `found ${findings.length} facade boundary violation(s)`, failures);

  const summary = {
    planPath: path.resolve(path.join(__dirname, '..', PLAN_PATH)),
    cliDir: path.resolve(path.join(__dirname, '..', CLI_DIR)),
    cliFileCount: cliFiles.length,
    findingCount: findings.length,
    findings,
  };

  if (failures.length > 0) {
    console.error('[script-facade-boundary] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    if (findings.length > 0) {
      console.error('failure examples:');
      for (const item of findings) {
        console.error(`  - ${item.file}:${item.line} ${item.type} ${item.detail}`);
      }
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[script-facade-boundary] PASS');
  if (cliFiles.length === 0) {
    console.log('No CLI source files found under packages/cli/src; boundary check passed by absence.');
  }
  console.log(JSON.stringify(summary, null, 2));
}

main();

