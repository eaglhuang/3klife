'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/');
}

function uniquePaths(items) {
  const seen = new Set();
  const output = [];
  for (const item of items || []) {
    const value = normalizePath(item).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

function parseGitStatusLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ''))
    .filter(Boolean)
    .map((line) => {
      const body = line.length > 3 ? line.slice(3).trim() : '';
      const renamed = body.includes(' -> ') ? body.split(' -> ').pop() : body;
      return normalizePath(renamed);
    })
    .filter(Boolean);
}

function buildStatusSnapshotText(files) {
  const normalized = uniquePaths(files).map((filePath) => normalizePath(filePath));
  if (normalized.length === 0) {
    return '\n';
  }
  return `${normalized.map((filePath) => ` M ${filePath}`).join('\n')}\n`;
}

function rel(filePath, root = ROOT) {
  return path.relative(root, path.resolve(filePath)).replace(/\\/g, '/');
}

function readStatusSnapshotFromFile(inputPath, root = ROOT, sourceLabel = 'status-file') {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    return {
      ok: false,
      source: sourceLabel,
      error: `${sourceLabel} path missing`,
      files: [],
      rawStatusOutput: '',
      absolutePath: '',
    };
  }

  const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  try {
    const output = fs.readFileSync(absolute, 'utf8');
    return {
      ok: true,
      source: `${sourceLabel}:${rel(absolute, root)}`,
      error: '',
      files: uniquePaths(parseGitStatusLines(output)),
      rawStatusOutput: output,
      absolutePath: absolute,
    };
  } catch (error) {
    return {
      ok: false,
      source: `${sourceLabel}:${rel(absolute, root)}`,
      error: `${sourceLabel} unreadable: ${String(error && (error.message || error) || 'unknown')}`,
      files: [],
      rawStatusOutput: '',
      absolutePath: absolute,
    };
  }
}

function readGitStatusSnapshot(root = ROOT) {
  const proc = cp.spawnSync('git', ['status', '--short'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (typeof proc.status !== 'number' || proc.status !== 0 || proc.error) {
    const stderr = String(proc && proc.stderr || '').trim();
    const errMsg = String(proc && proc.error && (proc.error.message || proc.error) || '').trim();
    return {
      ok: false,
      source: 'git-status',
      error: errMsg || stderr || `git status exit=${proc.status}`,
      files: [],
      rawStatusOutput: '',
      absolutePath: '',
    };
  }

  return {
    ok: true,
    source: 'git-status',
    error: '',
    files: uniquePaths(parseGitStatusLines(proc.stdout || '')),
    rawStatusOutput: String(proc.stdout || ''),
    absolutePath: '',
  };
}

function writeStatusSnapshot(outPath, snapshotText, root = ROOT) {
  const raw = String(outPath || '').trim();
  if (!raw) {
    return {
      ok: false,
      error: 'status-snapshot-out path missing',
      path: '',
    };
  }

  const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  try {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, String(snapshotText || ''), 'utf8');
    return {
      ok: true,
      error: '',
      path: rel(absolute, root),
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error && (error.message || error) || 'failed to write status snapshot'),
      path: rel(absolute, root),
    };
  }
}

function isPathAllowed(filePath, allowPrefixes) {
  const normalized = normalizePath(filePath);
  for (const prefixRaw of allowPrefixes || []) {
    const prefix = normalizePath(prefixRaw);
    if (!prefix) continue;
    if (prefix.endsWith('/')) {
      if (normalized.startsWith(prefix)) {
        return true;
      }
      continue;
    }
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

function inspectH2uWorktreeIsolation(options = {}) {
  const root = path.resolve(options.root || ROOT);
  const allowDirtyPrefixes = uniquePaths(options.allowDirtyPrefixes || []);
  const strict = Boolean(options.strict);
  const requireWorktreeCheck = Boolean(options.requireWorktreeCheck);
  const baselinePath = String(options.baselineWorktreeStatusFile || '').trim();
  const currentPath = String(options.worktreeStatusFile || '').trim();
  const statusSnapshotOut = String(options.statusSnapshotOut || '').trim();

  const current = currentPath
    ? readStatusSnapshotFromFile(currentPath, root, 'worktree-status-file')
    : readGitStatusSnapshot(root);
  const baseline = baselinePath
    ? readStatusSnapshotFromFile(baselinePath, root, 'baseline-worktree-status-file')
    : {
      ok: true,
      source: 'baseline:none',
      error: '',
      files: [],
      rawStatusOutput: '',
      absolutePath: '',
    };

  let snapshotWrite = {
    ok: true,
    error: '',
    path: '',
  };
  if (statusSnapshotOut && current.ok) {
    const snapshotText = String(current.rawStatusOutput || '').trim().length > 0
      ? String(current.rawStatusOutput)
      : buildStatusSnapshotText(current.files);
    snapshotWrite = writeStatusSnapshot(statusSnapshotOut, snapshotText, root);
  }

  const unavailableError = current.ok ? baseline.error : current.error;
  const unavailableSource = current.ok ? baseline.source : current.source;
  if (!current.ok || !baseline.ok) {
    const blockOnSkip = strict || requireWorktreeCheck;
    return {
      id: 'worktree-isolation',
      passed: !blockOnSkip,
      status: blockOnSkip ? 1 : 0,
      skipped: true,
      checkUnavailable: true,
      error: unavailableError,
      method: unavailableSource,
      stderr: `worktree check skipped: ${unavailableError}`,
      dirtyFiles: current.files || [],
      baselineDirtyFiles: baseline.files || [],
      introducedDirtyFiles: [],
      unrelatedDirtyFiles: [],
      allowedDirtyFiles: [],
      baselineSource: baseline.source,
      currentSource: current.source,
      statusSnapshotOut,
      snapshotWrite,
    };
  }

  const baselineDirtyFiles = uniquePaths(baseline.files || []);
  const currentDirtyFiles = uniquePaths(current.files || []);
  const baselineSet = new Set(baselineDirtyFiles);
  const introducedDirtyFiles = baselinePath
    ? currentDirtyFiles.filter((filePath) => !baselineSet.has(filePath))
    : currentDirtyFiles;
  const unrelatedDirtyFiles = introducedDirtyFiles.filter((filePath) => !isPathAllowed(filePath, allowDirtyPrefixes));
  const allowedDirtyFiles = introducedDirtyFiles.filter((filePath) => isPathAllowed(filePath, allowDirtyPrefixes));
  const snapshotWriteFailed = statusSnapshotOut && !snapshotWrite.ok;
  const passed = unrelatedDirtyFiles.length === 0 && !snapshotWriteFailed;

  return {
    id: 'worktree-isolation',
    passed,
    status: passed ? 0 : 1,
    skipped: false,
    checkUnavailable: false,
    error: snapshotWriteFailed ? snapshotWrite.error : '',
    method: current.source,
    stderr: unrelatedDirtyFiles.length === 0
      ? (snapshotWriteFailed ? `statusSnapshotOut=${snapshotWrite.error}` : '')
      : `unrelatedDirty=${unrelatedDirtyFiles.join(',')}`,
    dirtyFiles: currentDirtyFiles,
    baselineDirtyFiles,
    introducedDirtyFiles,
    unrelatedDirtyFiles,
    allowedDirtyFiles,
    baselineSource: baseline.source,
    currentSource: current.source,
    statusSnapshotOut,
    snapshotWrite,
  };
}

module.exports = {
  buildStatusSnapshotText,
  inspectH2uWorktreeIsolation,
  isPathAllowed,
  normalizePath,
  parseGitStatusLines,
  readGitStatusSnapshot,
  readStatusSnapshotFromFile,
  uniquePaths,
  writeStatusSnapshot,
};