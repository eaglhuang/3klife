#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const handoffDiff = require('./lib/handoff-diff-core');

const PROJECT_ROOT = handoffDiff.PROJECT_ROOT;
const ARTIFACT_VALIDATOR_PATH = path.join(PROJECT_ROOT, 'tools_node', 'validate-turn-artifact.js');

function printHelp() {
  console.log('Usage: node tools_node/validate-handoff-diff.js (--artifact <path> [--repository <path>] | --fixture <path>) [--strict]');
  console.log('');
  console.log('Options:');
  console.log('  --artifact <path>     Path to the turn artifact JSON file');
  console.log('  --repository <path>   Path to the git repository to compare against (default: .)');
  console.log('  --fixture <path>      Path to a handoff diff fixture JSON file');
  console.log('  --strict              Exit with code 1 when verdict is not pass');
  console.log('  --help, -h            Show this help message');
}

function parseArgs(argv) {
  const parsed = {
    artifact: '',
    repository: '.',
    fixture: '',
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--artifact') {
      parsed.artifact = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--repository') {
      parsed.repository = argv[index + 1] || '.';
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      parsed.fixture = argv[index + 1] || '';
      index += 1;
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
    throw new Error(`未知參數：${token}`);
  }

  return parsed;
}

function resolveProjectPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(PROJECT_ROOT, inputPath);
}

function displayPath(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const relativePath = handoffDiff.toPosixPath(path.relative(PROJECT_ROOT, absolutePath));
  if (relativePath && !relativePath.startsWith('../') && relativePath !== '') {
    return relativePath;
  }
  return handoffDiff.toPosixPath(absolutePath);
}

function runArtifactValidator(artifactPath) {
  const result = spawnSync(process.execPath, [ARTIFACT_VALIDATOR_PATH, '--artifact', artifactPath, '--strict'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: false,
  });

  if ((result.status ?? 1) !== 0) {
    const stdout = (result.stdout || '').trim();
    const stderr = (result.stderr || '').trim();
    if (stdout) {
      console.error(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    throw new Error('turn-artifact validator 未通過，請先修正 artifact 格式或 invariant');
  }
}

function computeExitCode(result, strict) {
  return strict && result.status !== 'pass' ? 1 : 0;
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeEntryList(entries) {
  return (entries || []).map((entry) => ({
    path: entry.path,
    rawStatus: entry.rawStatus,
    states: sortStrings(entry.states || []),
  })).sort((left, right) => {
    const pathCompare = left.path.localeCompare(right.path);
    if (pathCompare !== 0) return pathCompare;
    return (left.rawStatus || '').localeCompare(right.rawStatus || '');
  });
}

function compareArrays(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function assertExpectedResult(fixture, result, strict) {
  const failures = [];
  const expected = fixture.expected || {};
  if (expected.status && expected.status !== result.status) {
    failures.push(`expected.status=${expected.status}，實際為 ${result.status}`);
  }

  const expectedSummary = expected.summary || {};
  Object.entries(expectedSummary).forEach(([key, value]) => {
    if (result.summary[key] !== value) {
      failures.push(`expected.summary.${key}=${value}，實際為 ${result.summary[key]}`);
    }
  });

  const expectedMismatch = expected.mismatch || {};
  if (Array.isArray(expectedMismatch.missingInArtifact)
    && !compareArrays(result.mismatch.missingInArtifact, sortStrings(expectedMismatch.missingInArtifact))) {
    failures.push('expected.mismatch.missingInArtifact 與實際不一致');
  }
  if (Array.isArray(expectedMismatch.extraInArtifact)
    && !compareArrays(result.mismatch.extraInArtifact, sortStrings(expectedMismatch.extraInArtifact))) {
    failures.push('expected.mismatch.extraInArtifact 與實際不一致');
  }
  if (Array.isArray(expectedMismatch.dirtyButUnreported)
    && !compareArrays(normalizeEntryList(result.mismatch.dirtyButUnreported), normalizeEntryList(expectedMismatch.dirtyButUnreported))) {
    failures.push('expected.mismatch.dirtyButUnreported 與實際不一致');
  }
  if (Array.isArray(expectedMismatch.mergeConflicts)
    && !compareArrays(normalizeEntryList(result.mismatch.mergeConflicts), normalizeEntryList(expectedMismatch.mergeConflicts))) {
    failures.push('expected.mismatch.mergeConflicts 與實際不一致');
  }

  const expectedExitCode = strict ? expected.strictExitCode : expected.nonStrictExitCode;
  if (Number.isInteger(expectedExitCode)) {
    const actualExitCode = computeExitCode(result, strict);
    if (expectedExitCode !== actualExitCode) {
      failures.push(`expected.${strict ? 'strictExitCode' : 'nonStrictExitCode'}=${expectedExitCode}，實際為 ${actualExitCode}`);
    }
  }

  return failures;
}

function loadFixtureOrThrow(fixturePath) {
  const fixture = handoffDiff.readJsonOrThrow(fixturePath, 'fixture');
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    throw new Error('fixture 內容必須是物件');
  }

  let artifact = fixture.artifact;
  if (!artifact && typeof fixture.artifactFile === 'string' && fixture.artifactFile.trim().length > 0) {
    artifact = handoffDiff.readJsonOrThrow(path.resolve(path.dirname(fixturePath), fixture.artifactFile.trim()), 'fixture.artifactFile');
  }
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new Error('fixture 必須提供 artifact 物件或 artifactFile');
  }

  const gitChangedFiles = Array.isArray(fixture.gitChangedFiles)
    ? fixture.gitChangedFiles.map((entry, index) => handoffDiff.normalizeMockGitEntry(entry, index))
    : [];

  return {
    fixture,
    artifact,
    gitChangedFiles,
  };
}

function printPathList(title, paths) {
  if (!paths.length) {
    return;
  }

  console.log(`  ${title} (${paths.length})`);
  paths.forEach((entry) => {
    console.log(`    - ${entry}`);
  });
}

function printDirtyList(entries) {
  if (!entries.length) {
    return;
  }

  console.log(`  dirtyButUnreported (${entries.length})`);
  entries.forEach((entry) => {
    console.log(`    - ${entry.path} [${entry.rawStatus.trim() || entry.rawStatus}] states=${entry.states.join(',')}`);
  });
}

function printMergeConflicts(entries) {
  if (!entries.length) {
    return;
  }

  console.log(`  mergeConflicts (${entries.length})`);
  entries.forEach((entry) => {
    console.log(`    - ${entry.path} [${entry.rawStatus.trim() || entry.rawStatus}] states=${entry.states.join(',')}`);
  });
}

function printResult(result) {
  const icon = result.status === 'pass' ? '✔' : result.status === 'warn' ? '⚠' : '❌';
  console.log(`${icon} handoff-diff ${result.status}: artifact=${displayPath(result.artifactPath)} repo=${displayPath(result.repositoryRoot)}`);
  console.log(`  artifactFiles=${result.summary.artifactFiles} gitChangedFiles=${result.summary.gitChangedFiles} matched=${result.summary.matched}`);
  console.log(`  missingInArtifact=${result.summary.missingInArtifact} extraInArtifact=${result.summary.extraInArtifact} dirtyButUnreported=${result.summary.dirtyButUnreported} mergeConflicts=${result.summary.mergeConflicts}`);

  if (result.status === 'pass') {
    console.log('  no mismatch detected between artifact files[] and git changed files');
    return;
  }

  printPathList('missingInArtifact', result.mismatch.missingInArtifact);
  printPathList('extraInArtifact', result.mismatch.extraInArtifact);
  printDirtyList(result.mismatch.dirtyButUnreported);
  printMergeConflicts(result.mismatch.mergeConflicts);
}

function runFixtureMode(args) {
  const fixturePath = resolveProjectPath(args.fixture);
  if (!fs.existsSync(fixturePath)) {
    console.error(`[handoff-diff] 找不到 fixture：${displayPath(fixturePath)}`);
    process.exit(1);
  }

  let loaded;
  try {
    loaded = loadFixtureOrThrow(fixturePath);
  } catch (error) {
    console.error(`[handoff-diff] ${error.message}`);
    process.exit(1);
  }

  const result = handoffDiff.evaluateArtifactAgainstGitEntries({
    artifact: loaded.artifact,
    artifactPath: fixturePath,
    repositoryRoot: fixturePath,
    gitEntries: loaded.gitChangedFiles,
  });
  printResult(result);

  const failures = assertExpectedResult(loaded.fixture, result, args.strict);
  if (failures.length > 0) {
    console.error(`[handoff-diff] fixture expectation mismatch: ${displayPath(fixturePath)}`);
    failures.forEach((message, index) => {
      console.error(`  ${index + 1}. ${message}`);
    });
    process.exit(1);
  }

  const name = loaded.fixture.name || path.basename(fixturePath);
  console.log(`✔ handoff-diff fixture matched expectation: ${name}`);
}

function runArtifactMode(args) {
  const artifactPath = resolveProjectPath(args.artifact);
  const repositoryPath = resolveProjectPath(args.repository || '.');

  if (!fs.existsSync(artifactPath)) {
    console.error(`[handoff-diff] 找不到 artifact：${displayPath(artifactPath)}`);
    process.exit(1);
  }
  if (!fs.existsSync(ARTIFACT_VALIDATOR_PATH)) {
    console.error(`[handoff-diff] 找不到 turn-artifact validator：${displayPath(ARTIFACT_VALIDATOR_PATH)}`);
    process.exit(1);
  }

  let artifact;
  let result;
  try {
    runArtifactValidator(artifactPath);
    artifact = handoffDiff.readJsonOrThrow(artifactPath, 'artifact');
    result = handoffDiff.evaluateArtifactAgainstRepository({
      artifact,
      artifactPath,
      repositoryPath,
    });
  } catch (error) {
    console.error(`[handoff-diff] ${error.message}`);
    process.exit(1);
  }

  printResult(result);
  if (computeExitCode(result, args.strict) !== 0) {
    process.exit(1);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[handoff-diff] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if ((args.artifact ? 1 : 0) + (args.fixture ? 1 : 0) !== 1) {
    console.error('[handoff-diff] 必須且只能提供其中一種輸入：--artifact <path> 或 --fixture <path>');
    printHelp();
    process.exit(1);
  }

  if (args.fixture) {
    runFixtureMode(args);
    return;
  }

  runArtifactMode(args);
}

main();