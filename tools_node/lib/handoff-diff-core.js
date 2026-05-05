'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const config = require('./project-config');

const PROJECT_ROOT = config.ROOT;

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function normalizeScopeFiles(files) {
  return uniqueStrings(
    (Array.isArray(files) ? files : [])
      .map((entry) => toPosixPath(String(entry || '').trim()))
      .filter((entry) => entry.length > 0)
  ).sort((left, right) => left.localeCompare(right));
}

function buildEntryScopeCandidates(entry) {
  return uniqueStrings([
    entry && entry.path ? toPosixPath(entry.path) : '',
    entry && entry.previousPath ? toPosixPath(entry.previousPath) : '',
  ].filter((value) => value.length > 0));
}

function diffFilesAgainstScope(actualFiles, scopeFiles) {
  const scopeSet = new Set(normalizeScopeFiles(scopeFiles));
  return uniqueStrings((actualFiles || []).map((entry) => toPosixPath(entry)))
    .filter((entry) => !scopeSet.has(entry))
    .sort((left, right) => left.localeCompare(right));
}

function entryCoveredByScope(entry, scopeFiles) {
  const scopeSet = new Set(normalizeScopeFiles(scopeFiles));
  return buildEntryScopeCandidates(entry).some((candidate) => scopeSet.has(candidate));
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

function parseSimpleFrontmatter(content) {
  const lines = String(content || '').split(/\r?\n/);
  if (lines[0] !== '---') {
    return {};
  }

  const result = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === '---') {
      break;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      result[match[1]] = match[2].replace(/^"|"$/g, '').trim();
    }
  }
  return result;
}

function readTaskLockEvidence(taskId, taskLockDir) {
  if (!taskLockDir) {
    return { checked: false, found: false, path: '', taskId: '', agentName: '', files: [], error: '' };
  }

  const lockPath = path.join(taskLockDir, `${taskId}.lock.json`);
  if (!fs.existsSync(lockPath)) {
    return { checked: true, found: false, path: toPosixPath(lockPath), taskId: '', agentName: '', files: [], error: '' };
  }

  try {
    const parsed = readJsonOrThrow(lockPath, 'task lock');
    return {
      checked: true,
      found: true,
      path: toPosixPath(lockPath),
      taskId: String(parsed.taskId || '').trim(),
      agentName: String(parsed.agentName || '').trim(),
      files: normalizeScopeFiles(parsed.files),
      error: '',
    };
  } catch (error) {
    return {
      checked: true,
      found: true,
      path: toPosixPath(lockPath),
      taskId: '',
      agentName: '',
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readAllTaskLocks(taskLockDir) {
  if (!taskLockDir) {
    return { checked: false, lockDir: '', locks: [], issues: [] };
  }

  if (!fs.existsSync(taskLockDir)) {
    return {
      checked: true,
      lockDir: toPosixPath(taskLockDir),
      locks: [],
      issues: [
        {
          layer: 'lock-dir',
          severity: 'warn',
          message: 'task lock directory does not exist',
          expected: 'existing .task-locks directory',
          actual: toPosixPath(taskLockDir),
        },
      ],
    };
  }

  const locks = [];
  const issues = [];
  const entries = fs.readdirSync(taskLockDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.lock.json'))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const lockPath = path.join(taskLockDir, entry.name);
    try {
      const parsed = readJsonOrThrow(lockPath, 'task lock');
      const taskId = String(parsed.taskId || '').trim();
      const files = normalizeScopeFiles(parsed.files);
      const lock = {
        path: toPosixPath(lockPath),
        taskId,
        agentName: String(parsed.agentName || '').trim(),
        lockedAt: String(parsed.lockedAt || '').trim(),
        files,
      };
      locks.push(lock);

      if (!taskId) {
        issues.push({
          layer: 'lock',
          severity: 'fail',
          message: 'task lock missing taskId',
          expected: 'non-empty task id',
          actual: lock.path,
        });
      } else if (files.length === 0) {
        issues.push({
          layer: 'lock',
          severity: 'warn',
          message: 'task lock files[] is empty; scope enforcement degrades to advisory only',
          expected: 'non-empty files[]',
          actual: taskId,
        });
      }
    } catch (error) {
      issues.push({
        layer: 'lock',
        severity: 'fail',
        message: error instanceof Error ? error.message : String(error),
        expected: 'valid task lock json',
        actual: toPosixPath(lockPath),
      });
    }
  }

  return {
    checked: true,
    lockDir: toPosixPath(taskLockDir),
    locks,
    issues,
  };
}

function readTaskCardEvidence(taskId, taskCardDir) {
  if (!taskCardDir) {
    return { checked: false, found: false, path: '', id: '', status: '', startedByAgent: '', error: '' };
  }

  const cardPath = path.join(taskCardDir, `${taskId}.md`);
  if (!fs.existsSync(cardPath)) {
    return { checked: true, found: false, path: toPosixPath(cardPath), id: '', status: '', startedByAgent: '', error: '' };
  }

  try {
    const frontmatter = parseSimpleFrontmatter(fs.readFileSync(cardPath, 'utf8'));
    return {
      checked: true,
      found: true,
      path: toPosixPath(cardPath),
      id: String(frontmatter.id || '').trim(),
      status: String(frontmatter.status || '').trim(),
      startedByAgent: String(frontmatter.started_by_agent || '').trim(),
      error: '',
    };
  } catch (error) {
    return {
      checked: true,
      found: true,
      path: toPosixPath(cardPath),
      id: '',
      status: '',
      startedByAgent: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildTaskScopeResult({ artifact, repositoryRoot, taskLockDir = '', taskCardDir = '' } = {}) {
  const artifactTask = String(artifact && artifact.task ? artifact.task : '').trim();
  const issues = [];
  const defaultCardDir = path.join(repositoryRoot || PROJECT_ROOT, 'docs', 'agent-briefs', 'tasks');
  let resolvedLockDir = taskLockDir ? path.resolve(repositoryRoot || PROJECT_ROOT, taskLockDir) : '';
  let resolvedCardDir = taskCardDir ? path.resolve(repositoryRoot || PROJECT_ROOT, taskCardDir) : defaultCardDir;
  const artifactFiles = Array.isArray(artifact && artifact.files)
    ? normalizeScopeFiles(artifact.files.map((entry) => entry && entry.path ? entry.path : ''))
    : [];

  if (!artifactTask) {
    issues.push({ layer: 'artifact', severity: 'warn', message: 'artifact.task is missing', expected: 'non-empty task id', actual: '' });
  }

  if (artifactTask && resolvedLockDir) {
    const cardLikePath = path.join(resolvedLockDir, `${artifactTask}.md`);
    const lockLikePath = path.join(resolvedLockDir, `${artifactTask}.lock.json`);
    if (!fs.existsSync(lockLikePath) && fs.existsSync(cardLikePath) && !taskCardDir) {
      resolvedCardDir = resolvedLockDir;
      resolvedLockDir = '';
    }
  }

  const lock = artifactTask
    ? readTaskLockEvidence(artifactTask, resolvedLockDir)
    : { checked: Boolean(resolvedLockDir), found: false, path: '', taskId: '', agentName: '', files: [], error: '' };
  const frontmatter = artifactTask
    ? readTaskCardEvidence(artifactTask, resolvedCardDir)
    : { checked: Boolean(resolvedCardDir), found: false, path: '', id: '', status: '', startedByAgent: '', error: '' };

  if (lock.error) {
    issues.push({ layer: 'lock', severity: 'fail', message: lock.error, expected: artifactTask, actual: '' });
  } else if (lock.found && lock.taskId !== artifactTask) {
    issues.push({ layer: 'lock', severity: 'fail', message: 'task lock id does not match artifact.task', expected: artifactTask, actual: lock.taskId });
  }

  if (frontmatter.error) {
    issues.push({ layer: 'frontmatter', severity: 'fail', message: frontmatter.error, expected: artifactTask, actual: '' });
  } else if (frontmatter.found && frontmatter.id !== artifactTask) {
    issues.push({ layer: 'frontmatter', severity: 'fail', message: 'task card frontmatter id does not match artifact.task', expected: artifactTask, actual: frontmatter.id });
  }

  const outOfScopeFiles = lock.found
    ? diffFilesAgainstScope(artifactFiles, lock.files)
    : [];

  if (lock.found && lock.files.length === 0 && artifactFiles.length > 0) {
    issues.push({
      layer: 'scope',
      severity: 'warn',
      message: 'task lock exists but files[] is empty; cannot prove artifact files stay within task scope',
      expected: 'non-empty files[]',
      actual: artifactTask,
    });
  }

  if (outOfScopeFiles.length > 0) {
    issues.push({
      layer: 'scope',
      severity: 'fail',
      message: 'artifact files exceed task lock scope',
      expected: lock.files.join(', '),
      actual: outOfScopeFiles.join(', '),
    });
  }

  if (artifactTask && !lock.found && !frontmatter.found) {
    issues.push({ layer: 'lock', severity: 'warn', message: 'no task lock or task card frontmatter found for artifact.task', expected: artifactTask, actual: '' });
  }

  const status = issues.some((issue) => issue.severity === 'fail')
    ? 'fail'
    : issues.length > 0 ? 'warn' : 'pass';

  return {
    status,
    artifactTask,
    source: lock.found ? 'lock' : frontmatter.found ? 'frontmatter' : 'none',
    lock,
    frontmatter,
    scopeFiles: lock.files,
    artifactFiles,
    outOfScopeFiles,
    issues,
  };
}

function buildGitTaskScopeCoverage({ repositoryRoot, gitEntries, taskLockDir = '', taskCardDir = '', taskId = '' } = {}) {
  const root = repositoryRoot || PROJECT_ROOT;
  const resolvedLockDir = taskLockDir ? path.resolve(root, taskLockDir) : path.join(root, '.task-locks');
  const resolvedCardDir = taskCardDir ? path.resolve(root, taskCardDir) : path.join(root, 'docs', 'agent-briefs', 'tasks');
  const lockInventory = readAllTaskLocks(resolvedLockDir);
  const issues = [...lockInventory.issues];
  const locksWithScope = lockInventory.locks.filter((lock) => lock.files.length > 0);

  const currentTaskLock = taskId
    ? readTaskLockEvidence(taskId, resolvedLockDir)
    : { checked: Boolean(resolvedLockDir), found: false, path: '', taskId: '', agentName: '', files: [], error: '' };
  const currentTaskCard = taskId
    ? readTaskCardEvidence(taskId, resolvedCardDir)
    : { checked: Boolean(resolvedCardDir), found: false, path: '', id: '', status: '', startedByAgent: '', error: '' };

  if (taskId) {
    if (currentTaskLock.error) {
      issues.push({ layer: 'lock', severity: 'fail', message: currentTaskLock.error, expected: taskId, actual: '' });
    } else if (!currentTaskLock.found) {
      issues.push({ layer: 'lock', severity: 'fail', message: 'task lock not found for requested task', expected: taskId, actual: '' });
    } else if (currentTaskLock.taskId !== taskId) {
      issues.push({ layer: 'lock', severity: 'fail', message: 'task lock id does not match requested task', expected: taskId, actual: currentTaskLock.taskId });
    } else if (currentTaskLock.files.length === 0) {
      issues.push({ layer: 'scope', severity: 'fail', message: 'requested task lock has empty files[] and cannot enforce scope', expected: 'non-empty files[]', actual: taskId });
    }

    if (currentTaskCard.error) {
      issues.push({ layer: 'frontmatter', severity: 'fail', message: currentTaskCard.error, expected: taskId, actual: '' });
    } else if (!currentTaskCard.found) {
      issues.push({ layer: 'frontmatter', severity: 'warn', message: 'task card not found for requested task', expected: taskId, actual: '' });
    } else if (currentTaskCard.id !== taskId) {
      issues.push({ layer: 'frontmatter', severity: 'fail', message: 'task card id does not match requested task', expected: taskId, actual: currentTaskCard.id });
    }
  }

  const coverage = (gitEntries || []).map((entry) => {
    const matchedLocks = locksWithScope
      .filter((lock) => entryCoveredByScope(entry, lock.files))
      .map((lock) => ({
        taskId: lock.taskId,
        agentName: lock.agentName,
        matchedBy: buildEntryScopeCandidates(entry).filter((candidate) => lock.files.includes(candidate)),
      }));
    return {
      path: entry.path,
      previousPath: entry.previousPath,
      rawStatus: entry.rawStatus,
      states: entry.states,
      matchedLocks,
    };
  });

  const uncoveredFiles = coverage
    .filter((entry) => entry.matchedLocks.length === 0)
    .map((entry) => entry.path)
    .sort((left, right) => left.localeCompare(right));

  const overlappingFiles = coverage
    .filter((entry) => entry.matchedLocks.length > 1)
    .map((entry) => ({
      path: entry.path,
      taskIds: entry.matchedLocks.map((lock) => lock.taskId).sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const foreignScopedFiles = taskId
    ? coverage
      .filter((entry) => entry.matchedLocks.length > 0 && !entry.matchedLocks.some((lock) => lock.taskId === taskId))
      .map((entry) => ({
        path: entry.path,
        taskIds: entry.matchedLocks.map((lock) => lock.taskId).sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
    : [];

  const currentTaskFiles = taskId
    ? coverage
      .filter((entry) => entry.matchedLocks.some((lock) => lock.taskId === taskId))
      .map((entry) => entry.path)
      .sort((left, right) => left.localeCompare(right))
    : [];

  if (uncoveredFiles.length > 0) {
    issues.push({
      layer: 'coverage',
      severity: 'fail',
      message: 'git changed files are not covered by any active task scope',
      expected: 'each changed file must appear in exactly one active task lock files[]',
      actual: uncoveredFiles.join(', '),
    });
  }

  if (overlappingFiles.length > 0) {
    issues.push({
      layer: 'coverage',
      severity: 'fail',
      message: 'git changed files are covered by multiple task scopes',
      expected: 'each changed file should be claimed by one task scope only',
      actual: overlappingFiles.map((entry) => `${entry.path} => ${entry.taskIds.join('|')}`).join(', '),
    });
  }

  const status = issues.some((issue) => issue.severity === 'fail')
    ? 'fail'
    : issues.length > 0 ? 'warn' : 'pass';

  return {
    status,
    repositoryRoot: toPosixPath(root),
    taskId,
    lockDir: toPosixPath(resolvedLockDir),
    cardDir: toPosixPath(resolvedCardDir),
    currentTaskLock,
    currentTaskCard,
    locks: lockInventory.locks,
    coverage,
    uncoveredFiles,
    overlappingFiles,
    foreignScopedFiles,
    currentTaskFiles,
    issues,
  };
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

function buildResult({ artifactPath, repositoryRoot, comparison, taskScope = null }) {
  const mismatchCount = comparison.missingInArtifact.length + comparison.extraInArtifact.length;
  const hasMergeConflict = comparison.mergeConflicts.length > 0;
  let status = 'pass';
  if (hasMergeConflict) {
    status = 'fail';
  } else if (mismatchCount > 0) {
    status = 'warn';
  }

  if (taskScope && taskScope.status === 'fail') {
    status = 'fail';
  } else if (taskScope && taskScope.status === 'warn' && status === 'pass') {
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
      taskScopeIssues: taskScope ? taskScope.issues.length : 0,
    },
    mismatch: {
      missingInArtifact: comparison.missingInArtifact,
      extraInArtifact: comparison.extraInArtifact,
      dirtyButUnreported: comparison.dirtyButUnreported,
      mergeConflicts: comparison.mergeConflicts,
    },
    taskScope,
  };
}

function evaluateArtifactAgainstGitEntries({ artifact, artifactPath, repositoryRoot, gitEntries, taskScope: taskScopeOptions = null }) {
  const comparison = compareArtifactToRepo(artifact, gitEntries);
  const taskScope = taskScopeOptions
    ? buildTaskScopeResult({ artifact, repositoryRoot, ...taskScopeOptions })
    : null;
  return buildResult({ artifactPath, repositoryRoot, comparison, taskScope });
}

function evaluateArtifactAgainstRepository({ artifact, artifactPath, repositoryPath, taskScope = null }) {
  const repositoryRoot = resolveGitRepositoryRoot(repositoryPath);
  const gitEntries = readGitChangedEntries(repositoryRoot);
  return evaluateArtifactAgainstGitEntries({ artifact, artifactPath, repositoryRoot, gitEntries, taskScope });
}

module.exports = {
  PROJECT_ROOT,
  toPosixPath,
  normalizeScopeFiles,
  readJsonOrThrow,
  normalizeMockGitEntry,
  readGitChangedEntries,
  resolveGitRepositoryRoot,
  compareArtifactToRepo,
  parseSimpleFrontmatter,
  readTaskLockEvidence,
  readTaskCardEvidence,
  readAllTaskLocks,
  buildTaskScopeResult,
  buildGitTaskScopeCoverage,
  buildResult,
  evaluateArtifactAgainstGitEntries,
  evaluateArtifactAgainstRepository,
};