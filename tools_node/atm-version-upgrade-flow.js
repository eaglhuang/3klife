#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ATM_ROOT = path.resolve(ROOT, '..', 'AI-Atomic-Framework');
const IMPACT_RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const RANK_IMPACT = ['none', 'patch', 'minor', 'major'];

const REQUIRED_CODEOWNERS_PATTERNS = [
  '/packages/core/**',
  '/schemas/**',
  '/compatibility-matrix.json',
  '/packages/cli/**',
  '/atm.mjs',
  '/packages/plugin-sdk/**',
  '/packages/adapter-*/**',
  '/packages/integration-*/**',
  '/packages/agent-pack-*/**',
  '/release/**',
  '/.github/workflows/release-*',
  '/known-bad-versions.json',
];

const REQUIRED_RELEASE_DOCS = [
  'docs/ai_atomic_framework/atm-version-upgrade-strategy-plan.md',
  'docs/ai_atomic_framework/release-version-upgrade-rules.md',
  'docs/ai_atomic_framework/open-source-versioning-policy.md',
  'docs/ai_atomic_framework/contributor-release-impact.md',
  'docs/ai_atomic_framework/release_version_flow/OPEN_SOURCE_VERSIONING_POLICY.md',
  'docs/ai_atomic_framework/release_version_flow/CONTRIBUTOR_RELEASE_IMPACT.md',
  'docs/ai_atomic_framework/release_version_flow/CORE_CHANGE_POLICY.md',
  'docs/ai_atomic_framework/release_version_flow/PACKAGE_GROUPS.md',
  'docs/ai_atomic_framework/release_version_flow/CODEOWNERS_POLICY.md',
  'docs/ai_atomic_framework/release_version_flow/CHANGESET_POLICY.md',
  'docs/ai_atomic_framework/release_version_flow/ATM_VERSION_UPGRADE_RULES.md',
];

function parseArgs(argv) {
  const args = {
    command: argv[0] || 'help',
    atmRoot: DEFAULT_ATM_ROOT,
    fixture: '',
    files: [],
    version: '',
    strict: false,
    allowMissingIntent: false,
    json: true,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i] || '';
    if (token === '--atm-root') {
      args.atmRoot = next();
      continue;
    }
    if (token === '--fixture') {
      args.fixture = next();
      continue;
    }
    if (token === '--version') {
      args.version = next();
      continue;
    }
    if (token === '--files') {
      i += 1;
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.files.push(argv[i]);
        i += 1;
      }
      i -= 1;
      continue;
    }
    if (token === '--strict') {
      args.strict = true;
      continue;
    }
    if (token === '--allow-missing-intent') {
      args.allowMissingIntent = true;
      continue;
    }
    if (token === '--text') {
      args.json = false;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.command = 'help';
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  args.atmRoot = path.resolve(args.atmRoot);
  return args;
}

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseGitStatus(output) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const body = line.length > 3 ? line.slice(3).trim() : line.trim();
      return normalizePath(body.includes(' -> ') ? body.split(' -> ').pop() : body);
    })
    .filter((filePath) => filePath && !filePath.startsWith('.atm/'));
}

function changedFilesFromGit(atmRoot) {
  const result = cp.spawnSync('git', ['status', '--short'], {
    cwd: atmRoot,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    throw new Error(`git status failed: ${result.error ? result.error.message : result.stderr}`);
  }
  return parseGitStatus(result.stdout);
}

function filesFromFixture(fixturePath) {
  const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.resolve(ROOT, fixturePath);
  const fixture = readJson(absolute);
  const rawFiles = fixture.files || fixture.changedFiles || [];
  const rawReleaseIntents = fixture.releaseIntents || fixture.release_intents || fixture.intentFiles || [];
  const files = rawFiles.map((entry) => {
    if (typeof entry === 'string') return { path: entry };
    return { ...entry, path: entry.path || entry.file || '' };
  }).filter((entry) => entry.path);
  const releaseIntents = rawReleaseIntents.map((entry) => {
    if (typeof entry === 'string') return normalizePath(entry);
    return normalizePath(entry.path || entry.file || '');
  }).filter(Boolean);
  return { fixture, files, releaseIntents, absolute };
}

function groupForPath(filePath) {
  const p = normalizePath(filePath);
  if (p === 'compatibility-matrix.json' || p.startsWith('packages/core/') || p.startsWith('schemas/')) return 'core';
  if (p === 'atm.mjs' || p.startsWith('packages/cli/')) return 'cli';
  if (p.startsWith('packages/plugin-sdk/')) return 'plugin-sdk';
  if (/^packages\/agent-pack-[^/]+\//.test(p)) return 'agent-pack';
  if (/^packages\/(adapter|integration|language|plugin)-[^/]+\//.test(p)) return 'adapter';
  if (p.startsWith('docs/')) return 'docs';
  if (p.startsWith('examples/') || p.startsWith('samples/') || p.startsWith('fixtures/')) return 'example';
  return 'tooling';
}

function isReleaseSurface(filePath) {
  const p = normalizePath(filePath);
  return p === 'compatibility-matrix.json'
    || p === 'known-bad-versions.json'
    || p === 'package.json'
    || p === 'package-lock.json'
    || p.startsWith('release/')
    || p.startsWith('.github/workflows/release-')
    || p.startsWith('docs/ai_atomic_framework/upstream-versioning-policy.md')
    || p.startsWith('docs/ai_atomic_framework/release-version-upgrade-rules.md')
    || p.startsWith('docs/ai_atomic_framework/open-source-versioning-policy.md')
    || p.startsWith('docs/ai_atomic_framework/contributor-release-impact.md')
    || p.startsWith('docs/ai_atomic_framework/release_version_flow/');
}

function isPublicApi(filePath, group) {
  const p = normalizePath(filePath);
  if (group === 'core' || group === 'cli' || group === 'plugin-sdk') return true;
  if (group === 'adapter' || group === 'agent-pack') return p.includes('/src/') || p.includes('/templates/');
  return isReleaseSurface(p);
}

function defaultImpact(filePath, group, publicApi, releaseSurface) {
  const p = normalizePath(filePath);
  if (p.includes('.test.') || p.startsWith('tests/') || p.startsWith('fixtures/') || p.includes('/test/')) return 'none';
  if (group === 'docs') return releaseSurface ? 'patch' : 'none';
  if (releaseSurface) return 'patch';
  if (!publicApi) return 'none';
  return 'patch';
}

function classifyEntry(entry) {
  const filePath = normalizePath(entry.path);
  const packageGroup = entry.package_group || entry.packageGroup || groupForPath(filePath);
  const releaseSurface = Boolean(entry.release_surface ?? isReleaseSurface(filePath));
  const publicApi = Boolean(entry.public_api ?? entry.publicApi ?? isPublicApi(filePath, packageGroup));
  const releaseImpact = normalizeImpact(entry.release_impact || entry.releaseImpact || defaultImpact(filePath, packageGroup, publicApi, releaseSurface));
  const coreImpact = normalizeImpact(entry.core_impact || entry.coreImpact || (packageGroup === 'core' ? releaseImpact : 'none'));
  const requiresMigration = Boolean(entry.requires_migration ?? entry.requiresMigration ?? (coreImpact === 'major'));
  const requiresReleaseNote = Boolean(entry.requires_release_note ?? entry.requiresReleaseNote ?? releaseImpact !== 'none');
  return {
    path: filePath,
    package_group: packageGroup,
    public_api: publicApi,
    release_surface: releaseSurface,
    release_impact: releaseImpact,
    core_impact: coreImpact,
    requires_migration: requiresMigration,
    requires_release_note: requiresReleaseNote,
  };
}

function normalizeImpact(value) {
  const impact = String(value || 'none').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(IMPACT_RANK, impact)) {
    throw new Error(`invalid impact: ${value}`);
  }
  return impact;
}

function maxImpact(entries, key) {
  return RANK_IMPACT[Math.max(0, ...entries.map((entry) => IMPACT_RANK[entry[key] || 'none']))];
}

function summarize(entries) {
  return {
    changedFileCount: entries.length,
    packageGroups: [...new Set(entries.map((entry) => entry.package_group))].sort(),
    highestReleaseImpact: maxImpact(entries, 'release_impact'),
    highestCoreImpact: maxImpact(entries, 'core_impact'),
    requiresMigration: entries.some((entry) => entry.requires_migration),
    requiresReleaseNote: entries.some((entry) => entry.requires_release_note),
    releaseSurfaceTouched: entries.some((entry) => entry.release_surface),
  };
}

function compareExpected(report, expected) {
  const errors = [];
  if (!expected) return errors;
  for (const [key, value] of Object.entries(expected)) {
    const actual = report.summary[key] ?? report[key];
    if (Array.isArray(value)) {
      const left = JSON.stringify([...(actual || [])].sort());
      const right = JSON.stringify([...value].sort());
      if (left !== right) errors.push(`expected ${key}=${right}, got ${left}`);
      continue;
    }
    if (actual !== value) errors.push(`expected ${key}=${value}, got ${actual}`);
  }
  return errors;
}

function loadEntries(args) {
  if (args.fixture) {
    const fixtureResult = filesFromFixture(args.fixture);
    return {
      source: `fixture:${path.relative(ROOT, fixtureResult.absolute).replace(/\\/g, '/')}`,
      fixture: fixtureResult.fixture,
      rawFiles: fixtureResult.files,
      releaseIntents: fixtureResult.releaseIntents,
      entries: fixtureResult.files.map(classifyEntry),
    };
  }
  const rawFiles = args.files.length > 0 ? args.files.map((filePath) => ({ path: filePath })) : changedFilesFromGit(args.atmRoot).map((filePath) => ({ path: filePath }));
  return {
    source: args.files.length > 0 ? 'cli-files' : 'git-status',
    fixture: null,
    rawFiles,
    releaseIntents: [],
    entries: rawFiles.map(classifyEntry),
  };
}

function classify(args) {
  const loaded = loadEntries(args);
  const report = {
    ok: true,
    command: 'classify',
    atmRoot: args.atmRoot,
    source: loaded.source,
    entries: loaded.entries,
    summary: summarize(loaded.entries),
    errors: [],
    warnings: [],
  };
  report.errors.push(...compareExpected(report, loaded.fixture && loaded.fixture.expected));
  report.ok = report.errors.length === 0;
  return report;
}

function impact(args) {
  const report = classify(args);
  report.command = 'impact';
  report.version = args.version || null;
  report.decision = {
    nextVersionInput: args.version || null,
    versionBump: report.summary.highestReleaseImpact,
    shouldRelease: report.summary.highestReleaseImpact !== 'none',
    requiresMigration: report.summary.requiresMigration,
    requiresReleaseNote: report.summary.requiresReleaseNote,
  };
  if (!args.version && report.decision.shouldRelease) {
    report.warnings.push('pass --version <next> to bind this impact decision to a proposed version');
  }
  return report;
}

function releaseIntentFiles(atmRoot, loaded) {
  if (loaded && Array.isArray(loaded.releaseIntents) && loaded.releaseIntents.length > 0) {
    return loaded.releaseIntents;
  }
  const dirs = ['.changeset', '.atm/release-intents'];
  const files = [];
  for (const dir of dirs) {
    const absDir = path.join(atmRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isFile() && /\.(md|json|ya?ml)$/i.test(entry.name)) {
        files.push(normalizePath(path.join(dir, entry.name)));
      }
    }
  }
  return files;
}

function validateContributorImpact(args) {
  const loaded = loadEntries(args);
  const report = impact(args);
  report.command = 'validate-contributor-impact';
  const intents = releaseIntentFiles(args.atmRoot, loaded);
  report.releaseIntents = intents;
  if (report.summary.highestReleaseImpact !== 'none' && intents.length === 0) {
    const message = 'release-relevant changes need a changeset or .atm/release-intents/*.md file';
    if (args.strict && !args.allowMissingIntent) {
      report.errors.push(message);
    } else {
      report.warnings.push(message);
    }
  }
  if (report.summary.highestCoreImpact !== 'none') {
    report.warnings.push('core impact detected: require issue/RFC, core CODEOWNERS review, migration decision, and integration tests');
  }
  report.ok = report.errors.length === 0;
  return report;
}

function validateCodeowners(args) {
  const codeownersPath = path.join(args.atmRoot, '.github', 'CODEOWNERS');
  const errors = [];
  const warnings = [];
  let content = '';
  if (!fs.existsSync(codeownersPath)) {
    errors.push('.github/CODEOWNERS is missing');
  } else {
    content = fs.readFileSync(codeownersPath, 'utf8');
    for (const required of REQUIRED_CODEOWNERS_PATTERNS) {
      if (!content.includes(required)) {
        errors.push(`CODEOWNERS missing pattern: ${required}`);
      }
    }
    if (content.includes('@eaglhuang')) {
      warnings.push('CODEOWNERS uses @eaglhuang seed ownership; split into teams when maintainers are ready');
    }
  }
  return {
    ok: errors.length === 0,
    command: 'validate-codeowners',
    atmRoot: args.atmRoot,
    codeownersPath: normalizePath(path.relative(args.atmRoot, codeownersPath)),
    requiredPatterns: REQUIRED_CODEOWNERS_PATTERNS,
    errors,
    warnings,
  };
}

function validateRelease(args) {
  const errors = [];
  const warnings = [];
  const missingDocs = REQUIRED_RELEASE_DOCS.filter((docPath) => !fs.existsSync(path.join(args.atmRoot, docPath)));
  for (const docPath of missingDocs) errors.push(`missing release policy doc: ${docPath}`);

  const policyPath = path.join(args.atmRoot, 'docs/ai_atomic_framework/upstream-versioning-policy.md');
  if (fs.existsSync(policyPath)) {
    const policy = fs.readFileSync(policyPath, 'utf8');
    if (!policy.includes('release_impact') || !policy.includes('core_impact')) {
      errors.push('upstream-versioning-policy.md must reference release impact metadata');
    }
  } else {
    errors.push('missing upstream-versioning-policy.md');
  }

  const codeownersReport = validateCodeowners(args);
  errors.push(...codeownersReport.errors);
  warnings.push(...codeownersReport.warnings);

  const impactReport = impact(args);
  warnings.push(...impactReport.warnings);

  return {
    ok: errors.length === 0,
    command: 'validate-release',
    atmRoot: args.atmRoot,
    docsChecked: REQUIRED_RELEASE_DOCS,
    codeowners: codeownersReport,
    impact: impactReport.summary,
    errors,
    warnings,
  };
}

function printHelp() {
  return {
    ok: true,
    command: 'help',
    usage: [
      'node tools_node/atm-version-upgrade-flow.js classify --atm-root <path>',
      'node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/core-change.json',
      'node tools_node/atm-version-upgrade-flow.js impact --version <next>',
      'node tools_node/atm-version-upgrade-flow.js validate-contributor-impact [--strict]',
      'node tools_node/atm-version-upgrade-flow.js validate-codeowners',
      'node tools_node/atm-version-upgrade-flow.js validate-release',
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const commands = {
    help: printHelp,
    classify,
    impact,
    'validate-contributor-impact': validateContributorImpact,
    'validate-codeowners': validateCodeowners,
    'validate-release': validateRelease,
  };
  if (!commands[args.command]) {
    throw new Error(`unknown command: ${args.command}`);
  }
  const report = commands[args.command](args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`${report.command}: ${report.ok ? 'ok' : 'failed'}`);
    for (const error of report.errors || []) console.log(`error: ${error}`);
    for (const warning of report.warnings || []) console.log(`warning: ${warning}`);
  }
  if (!report.ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    command: process.argv[2] || 'unknown',
    error: error && error.message ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}
