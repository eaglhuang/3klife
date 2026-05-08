'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_RULE_PACK_PATH = path.join(__dirname, 'rule-pack.json');

function loadRulePack(rulePackPath = DEFAULT_RULE_PACK_PATH) {
  const absolute = path.resolve(rulePackPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`rule-pack not found: ${absolute}`);
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function getRuleMap(rulePack) {
  const map = new Map();
  const rules = Array.isArray(rulePack.rules) ? rulePack.rules : [];
  for (const rule of rules) {
    if (rule && rule.id) {
      map.set(rule.id, rule);
    }
  }
  return map;
}

function runNodeScript(args) {
  const result = cp.spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

function toFinding(rule, overrides = {}) {
  return {
    ruleId: rule.id,
    trigger: rule.trigger,
    scope: rule.scope,
    severity: rule.severity,
    action: rule.action,
    routeHint: rule.routeHint,
    message: overrides.message || '',
    file: overrides.file || '',
    line: Number.isFinite(overrides.line) ? overrides.line : 0,
    details: overrides.details || {},
  };
}

function collectTaskScopeFindings(ruleMap) {
  const coverageRule = ruleMap.get('task-scope-coverage');
  const fingerprintRule = ruleMap.get('task-scope-fingerprint');
  const findings = [];
  const checks = [];

  const execution = runNodeScript([path.join(PROJECT_ROOT, 'tools_node', 'check-task-scope.js'), '--json']);
  checks.push({
    id: 'task-scope-json',
    passed: execution.status === 0,
    status: execution.status,
    stderr: execution.stderr.trim(),
  });

  let payload = null;
  try {
    payload = JSON.parse(execution.stdout || '{}');
  } catch (_) {
    payload = null;
  }

  const issues = payload && payload.result && Array.isArray(payload.result.issues)
    ? payload.result.issues
    : [];
  const uncovered = payload && payload.result && Array.isArray(payload.result.uncoveredFiles)
    ? payload.result.uncoveredFiles
    : [];

  if (coverageRule && uncovered.length > 0) {
    findings.push(toFinding(coverageRule, {
      message: `uncovered files: ${uncovered.join(', ')}`,
      details: { uncoveredFiles: uncovered },
    }));
  }

  if (fingerprintRule) {
    for (const issue of issues) {
      if (issue.layer === 'scope-fingerprint') {
        findings.push(toFinding(fingerprintRule, {
          message: issue.message || 'scope fingerprint mismatch',
          details: issue,
        }));
      }
    }
  }

  return { findings, checks };
}

function collectImportBoundaryFindings(ruleMap) {
  const rule = ruleMap.get('import-boundary-assets-scripts');
  const findings = [];
  const checks = [];

  const execution = runNodeScript([path.join(PROJECT_ROOT, 'tools_node', 'check-import-boundaries.js'), '--json']);
  checks.push({
    id: 'import-boundary-json',
    passed: execution.status === 0,
    status: execution.status,
    stderr: execution.stderr.trim(),
  });

  if (!rule) {
    return { findings, checks };
  }

  let payload = null;
  try {
    payload = JSON.parse(execution.stdout || '{}');
  } catch (_) {
    payload = null;
  }

  const violations = payload && Array.isArray(payload.violations) ? payload.violations : [];
  for (const violation of violations) {
    findings.push(toFinding(rule, {
      message: `${violation.sourceModule} -> ${violation.targetModule} import not allowed`,
      file: violation.file || '',
      line: Number(violation.line || 0),
      details: violation,
    }));
  }

  return { findings, checks };
}

function walkFiles(root, extensions) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.has(ext)) {
          files.push(full);
        }
      }
    }
  }
  return files;
}

function collectH2USkillOnlyFindings(ruleMap) {
  const rule = ruleMap.get('h2u-skill-only');
  const findings = [];
  const checks = [];
  if (!rule) {
    return { findings, checks };
  }

  const root = path.join(PROJECT_ROOT, 'tools_node', 'lib', 'html-to-ucuf');
  const files = walkFiles(root, new Set(['.js', '.mjs', '.ts']));
  let violationCount = 0;

  const disallowPattern = /assets\/scripts|assets\/prefabs|library\//i;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!/import\s+|require\s*\(/.test(lineText)) {
        return;
      }
      if (disallowPattern.test(lineText.replace(/\\/g, '/'))) {
        violationCount += 1;
        findings.push(toFinding(rule, {
          message: 'h2u module imports runtime game path outside allowlist',
          file: path.relative(PROJECT_ROOT, file).replace(/\\/g, '/'),
          line: index + 1,
          details: { lineText: lineText.trim() },
        }));
      }
    });
  }

  checks.push({
    id: 'h2u-skill-only-scan',
    passed: violationCount === 0,
    status: violationCount === 0 ? 0 : 1,
    stderr: violationCount === 0 ? '' : `violations=${violationCount}`,
  });

  return { findings, checks };
}

function collectCocosNoFsFindings(ruleMap) {
  const rule = ruleMap.get('cocos-no-fs');
  const findings = [];
  const checks = [];
  if (!rule) {
    return { findings, checks };
  }

  const root = path.join(PROJECT_ROOT, 'assets', 'scripts');
  const files = walkFiles(root, new Set(['.ts', '.js']));
  let violationCount = 0;
  const forbidden = /(from\s+['"](?:node:)?(fs|path|child_process)['"]|require\(\s*['"](?:node:)?(fs|path|child_process)['"]\s*\))/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!forbidden.test(lineText)) {
        return;
      }
      violationCount += 1;
      findings.push(toFinding(rule, {
        message: 'cocos runtime script imports forbidden node module',
        file: path.relative(PROJECT_ROOT, file).replace(/\\/g, '/'),
        line: index + 1,
        details: { lineText: lineText.trim() },
      }));
    });
  }

  checks.push({
    id: 'cocos-no-fs-scan',
    passed: violationCount === 0,
    status: violationCount === 0 ? 0 : 1,
    stderr: violationCount === 0 ? '' : `violations=${violationCount}`,
  });

  return { findings, checks };
}

function evaluateRulePack(options = {}) {
  const profileName = options.profile || 'atm';
  const rulePack = loadRulePack(options.rulePackPath || DEFAULT_RULE_PACK_PATH);
  const ruleMap = getRuleMap(rulePack);
  const profileRuleIds = rulePack.profiles && Array.isArray(rulePack.profiles[profileName])
    ? rulePack.profiles[profileName]
    : [];

  const allowedRuleIds = new Set(profileRuleIds);
  const findingBuckets = [];
  const checkBuckets = [];

  const taskScopeResult = collectTaskScopeFindings(ruleMap);
  findingBuckets.push(...taskScopeResult.findings.filter((item) => allowedRuleIds.has(item.ruleId)));
  checkBuckets.push(...taskScopeResult.checks);

  const boundaryResult = collectImportBoundaryFindings(ruleMap);
  findingBuckets.push(...boundaryResult.findings.filter((item) => allowedRuleIds.has(item.ruleId)));
  checkBuckets.push(...boundaryResult.checks);

  const h2uResult = collectH2USkillOnlyFindings(ruleMap);
  findingBuckets.push(...h2uResult.findings.filter((item) => allowedRuleIds.has(item.ruleId)));
  checkBuckets.push(...h2uResult.checks);

  const cocosResult = collectCocosNoFsFindings(ruleMap);
  findingBuckets.push(...cocosResult.findings.filter((item) => allowedRuleIds.has(item.ruleId)));
  checkBuckets.push(...cocosResult.checks);

  const blockingFindings = findingBuckets.filter((item) => item.action === 'fail' || item.severity === 'block');
  return {
    profile: profileName,
    rulePackPath: path.relative(PROJECT_ROOT, options.rulePackPath || DEFAULT_RULE_PACK_PATH).replace(/\\/g, '/'),
    passed: blockingFindings.length === 0,
    findings: findingBuckets,
    checks: checkBuckets,
  };
}

module.exports = {
  loadRulePack,
  evaluateRulePack,
};