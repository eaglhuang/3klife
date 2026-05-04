#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const config = require('./lib/project-config');

const PROJECT_ROOT = config.ROOT;
const ARTIFACT_VALIDATOR_PATH = path.join(PROJECT_ROOT, 'tools_node', 'validate-turn-artifact.js');

function printHelp() {
  console.log('Usage: node tools_node/validate-handoff-diff.js (--artifact <path> [--repository <path>] | --fixture <path>) [--strict]');
  console.log('');
  console.log('Options:');
  console.log('  --artifact <path>     Path to the turn artifact JSON file (required)');
  console.log('  --repository <path>   Path to the git repository to compare against (default: .)');
  console.log('  --fixture <path>      Path to a handoff diff fixture JSON file');
  console.log('  --strict              Exit with code 1 when handoff diff has mismatch');
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

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((entry) => String(entry)))];
}

function normalizeRawStatus(code) {
  return String(code || '??').padEnd(2, ' ').slice(0, 2);
}

function resolveProjectPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(PROJECT_ROOT, inputPath);
}

function displayPath(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const relativePath = toPosixPath(path.relative(PROJECT_ROOT, absolutePath));
  if (relativePath && !relativePath.startsWith('../') && relativePath !== '') {
    return relativePath;
  }
  return toPosixPath(absolutePath);
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function runCommandOrThrow(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
  });

  if ((result.status ?? 1) !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `${command} ${args.join(' ')} failed`);
  }

  return result.stdout || '';
}

function resolveGitRepositoryRoot(repositoryPath) {
  if (!fs.existsSync(repositoryPath)) {
    throw new Error(`找不到 repository：${displayPath(repositoryPath)}`);
  }

  const stdout = runCommandOrThrow('git', ['rev-parse', '--show-toplevel'], repositoryPath);
  return path.resolve(stdout.trim());
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

function buildStates(code) {
  const normalizedCode = normalizeRawStatus(code);
  if (normalizedCode === '??') {
    return ['untracked', 'added'];
  }

  const states = [];
  const indexStatus = normalizedCode[0] || ' ';
  const worktreeStatus = normalizedCode[1] || ' ';

  if (indexStatus !== ' ') {
    states.push('staged');
  }
  if (worktreeStatus !== ' ') {
    states.push('unstaged');
  }
  if (indexStatus === 'A' || worktreeStatus === 'A') {
    states.push('added');
  }
  if (indexStatus === 'M' || worktreeStatus === 'M') {
    states.push('modified');
  }
  if (indexStatus === 'D' || worktreeStatus === 'D') {
    states.push('deleted');
  }
  if (indexStatus === 'R' || worktreeStatus === 'R') {
    states.push('renamed');
  }
  if (indexStatus === 'C' || worktreeStatus === 'C') {
    states.push('copied');
  }
  if (indexStatus === 'U' || worktreeStatus === 'U') {
    states.push('unmerged');
  }

  return [...new Set(states)];
}

function parseGitStatusLine(line) {
  if (!line || line.length < 3) {
    return null;
  }

  const rawStatus = normalizeRawStatus(line.slice(0, 2));
  if (rawStatus === '!!') {
    return null;
  }

  const pathField = line.slice(3).trim();
  if (!pathField) {
    return null;
  }

  let previousPath = null;
  let filePath = pathField;
  if (pathField.includes(' -> ')) {
    const segments = pathField.split(' -> ');
    previousPath = segments[0].trim();
    filePath = segments[segments.length - 1].trim();
  }

  return {
    path: toPosixPath(filePath),
    previousPath: previousPath ? toPosixPath(previousPath) : null,
    rawStatus,
    states: buildStates(rawStatus),
  };
}

function normalizeMockGitEntry(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`fixture.gitChangedFiles[${index}] 必須是物件`);
  }
  if (typeof entry.path !== 'string' || entry.path.trim().length === 0) {
    throw new Error(`fixture.gitChangedFiles[${index}].path 必須是非空字串`);
  }
  const rawStatus = normalizeRawStatus(entry.rawStatus || '??');
  return {
    path: toPosixPath(entry.path.trim()),
    previousPath: typeof entry.previousPath === 'string' && entry.previousPath.trim().length > 0
      ? toPosixPath(entry.previousPath.trim())
      : null,
    rawStatus,
    states: Array.isArray(entry.states) && entry.states.length > 0
      ? uniqueStrings(entry.states)
      : buildStates(rawStatus),
  };
}

function readGitChangedEntries(repositoryRoot) {
  const stdout = runCommandOrThrow('git', ['status', '--short', '--untracked-files=all'], repositoryRoot);
  const entries = [];
  for (const line of stdout.split(/\r?\n/)) {
    const entry = parseGitStatusLine(line);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function compareArtifactToRepo(artifact, gitEntries) {
  const artifactPaths = Array.isArray(artifact.files)
    ? artifact.files.map((entry) => entry.path).filter((entry) => typeof entry === 'string' && entry.length > 0)
    : [];
  const gitMap = new Map();
  gitEntries.forEach((entry) => {
    gitMap.set(entry.path, entry);
  });
  const artifactSet = new Set(artifactPaths);

  const missingInArtifact = sortStrings(
    gitEntries
      .filter((entry) => !artifactSet.has(entry.path))
      .map((entry) => entry.path)
  );
  const extraInArtifact = sortStrings(
    artifactPaths.filter((entry) => !gitMap.has(entry))
  );
  const dirtyButUnreported = gitEntries
    .filter((entry) => !artifactSet.has(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((entry) => ({
      path: entry.path,
      rawStatus: entry.rawStatus,
      states: entry.states,
    }));
  const mergeConflicts = gitEntries
    .filter((entry) => entry.states.includes('unmerged'))
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((entry) => ({
      path: entry.path,
      rawStatus: entry.rawStatus,
      states: entry.states,
    }));
  const matched = sortStrings(
    artifactPaths.filter((entry) => gitMap.has(entry))
  );

  return {
    artifactPaths: sortStrings(artifactPaths),
    gitEntries: [...gitEntries].sort((left, right) => left.path.localeCompare(right.path)),
    missingInArtifact,
    extraInArtifact,
    dirtyButUnreported,
    mergeConflicts,
    matched,
  };
}

function buildResult(args, artifactPath, repositoryRoot, comparison) {
  const mismatchCount = comparison.missingInArtifact.length + comparison.extraInArtifact.length;
  const hasMismatch = mismatchCount > 0;
  const hasMergeConflict = comparison.mergeConflicts.length > 0;
  let status = 'pass';
  if (hasMergeConflict) {
    status = 'fail';
  } else if (hasMismatch) {
    status = 'warn';
  }

  return {
    status,
    artifactPath,
    repositoryRoot,
    summary: {
      artifactFiles: comparison.artifactPaths.length,
      gitChangedFiles: comparison.gitEntries.length,
      matched: comparison.matched.length,
      missingInArtifact: comparison.missingInArtifact.length,
      extraInArtifact: comparison.extraInArtifact.length,
      dirtyButUnreported: comparison.dirtyButUnreported.length,
      mergeConflicts: comparison.mergeConflicts.length,
    },
    mismatch: {
      missingInArtifact: comparison.missingInArtifact,
      extraInArtifact: comparison.extraInArtifact,
      dirtyButUnreported: comparison.dirtyButUnreported,
      mergeConflicts: comparison.mergeConflicts,
    },
  };
}

function computeExitCode(result, strict) {
  return strict && result.status !== 'pass' ? 1 : 0;
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
  const fixture = readJsonOrThrow(fixturePath, 'fixture');
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    throw new Error('fixture 內容必須是物件');
  }

  let artifact = fixture.artifact;
  if (!artifact && typeof fixture.artifactFile === 'string' && fixture.artifactFile.trim().length > 0) {
    artifact = readJsonOrThrow(path.resolve(path.dirname(fixturePath), fixture.artifactFile.trim()), 'fixture.artifactFile');
  }
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new Error('fixture 必須提供 artifact 物件或 artifactFile');
  }

  const gitChangedFiles = Array.isArray(fixture.gitChangedFiles)
    ? fixture.gitChangedFiles.map((entry, index) => normalizeMockGitEntry(entry, index))
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

  const comparison = compareArtifactToRepo(loaded.artifact, loaded.gitChangedFiles);
  const result = buildResult(args, fixturePath, fixturePath, comparison);
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
  let repositoryRoot;
  let gitEntries;
  try {
    runArtifactValidator(artifactPath);
    artifact = readJsonOrThrow(artifactPath, 'artifact');
    repositoryRoot = resolveGitRepositoryRoot(repositoryPath);
    gitEntries = readGitChangedEntries(repositoryRoot);
  } catch (error) {
    console.error(`[handoff-diff] ${error.message}`);
    process.exit(1);
  }

  const comparison = compareArtifactToRepo(artifact, gitEntries);
  const result = buildResult(args, artifactPath, repositoryRoot, comparison);
  printResult(result);

  if (computeExitCode(result, args.strict) !== 0) {
    process.exit(1);
  }
}

main();