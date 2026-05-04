'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const config = require('./project-config');

const PROJECT_ROOT = config.ROOT;

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((entry) => String(entry)))];
}

function normalizeRawStatus(code) {
  return String(code || '??').padEnd(2, ' ').slice(0, 2);
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
    throw new Error(`找不到 repository：${repositoryPath}`);
  }

  const stdout = runCommandOrThrow('git', ['rev-parse', '--show-toplevel'], repositoryPath);
  return path.resolve(stdout.trim());
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

  return uniqueStrings(states);
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

function buildResult({ artifactPath, repositoryRoot, comparison }) {
  const mismatchCount = comparison.missingInArtifact.length + comparison.extraInArtifact.length;
  const hasMergeConflict = comparison.mergeConflicts.length > 0;
  let status = 'pass';
  if (hasMergeConflict) {
    status = 'fail';
  } else if (mismatchCount > 0) {
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

function evaluateArtifactAgainstGitEntries({ artifact, artifactPath, repositoryRoot, gitEntries }) {
  const comparison = compareArtifactToRepo(artifact, gitEntries);
  return buildResult({ artifactPath, repositoryRoot, comparison });
}

function evaluateArtifactAgainstRepository({ artifact, artifactPath, repositoryPath }) {
  const repositoryRoot = resolveGitRepositoryRoot(repositoryPath);
  const gitEntries = readGitChangedEntries(repositoryRoot);
  return evaluateArtifactAgainstGitEntries({ artifact, artifactPath, repositoryRoot, gitEntries });
}

module.exports = {
  PROJECT_ROOT,
  toPosixPath,
  readJsonOrThrow,
  normalizeMockGitEntry,
  readGitChangedEntries,
  resolveGitRepositoryRoot,
  compareArtifactToRepo,
  buildResult,
  evaluateArtifactAgainstGitEntries,
  evaluateArtifactAgainstRepository,
};