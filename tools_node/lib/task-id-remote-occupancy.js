'use strict';

/**
 * Cross-worktree / cross-branch / cross-PR task-card id occupancy.
 *
 * The local task-id guard only sees the current worktree. Parallel agents
 * working from other worktrees, unmerged branches, or open pull requests
 * could therefore pick the same id. This module widens the occupancy view:
 *
 *   1. base ref (origin/master) task cards and task stores
 *   2. unmerged local + remote branches (commit messages and touched paths)
 *   3. recent pull requests (title, head branch, body) via `gh`
 *   4. a shared reservation ledger in the git common dir, visible to every
 *      local worktree of the same clone (atomic via a `wx` lockfile)
 *
 * Every remote source is best-effort: when git/gh/network is unavailable the
 * caller gets warnings and the local guard still applies.
 */

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = Object.freeze(require('./task-id-allocation-policy.json'));

const occupancyCache = new Map();
const fetchedRoots = new Set();

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idTokenRegex(prefix) {
  return new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(prefix)}-(\\d{4,})(?![0-9])`, 'g');
}

function runGit(root, args, options = {}) {
  const result = cp.spawnSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: options.timeoutMs,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? String(result.error.message || result.error) : ''),
  };
}

function normalizeFsPath(value) {
  return path.resolve(String(value || '')).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function isGitToplevel(root) {
  const result = runGit(root, ['rev-parse', '--show-toplevel']);
  return result.ok && normalizeFsPath(result.stdout.trim()) === normalizeFsPath(root);
}

function remoteChecksEnabled(root, options = {}) {
  if (options.remote === false) return false;
  if (process.env.TASK_ID_REMOTE_CHECK === '0') return false;
  if (options.remote === true) return true;
  return isGitToplevel(root);
}

function gitCommonDir(root) {
  const result = runGit(root, ['rev-parse', '--git-common-dir']);
  if (!result.ok) return null;
  return path.resolve(root, result.stdout.trim());
}

function refExists(root, ref) {
  return Boolean(ref) && runGit(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).ok;
}

function resolveBaseRef(root, policy, options = {}) {
  const warnings = [];
  const baseRef = process.env.TASK_ID_BASE_REF || options.baseRef || policy.baseRef;
  const skipFetch = options.skipFetch || process.env.TASK_ID_SKIP_FETCH === '1';
  const fetchKey = normalizeFsPath(root);
  if (!skipFetch && policy.fetchRemote && policy.fetchBranch && !fetchedRoots.has(fetchKey)) {
    fetchedRoots.add(fetchKey);
    const fetched = runGit(root, ['fetch', '--quiet', '--no-tags', policy.fetchRemote, policy.fetchBranch], {
      timeoutMs: policy.fetchTimeoutMs,
    });
    if (!fetched.ok) {
      warnings.push(`git fetch ${policy.fetchRemote} ${policy.fetchBranch} failed; using cached ${baseRef}`);
    }
  }
  if (!refExists(root, baseRef)) {
    warnings.push(`base ref ${baseRef} unavailable; base/unmerged occupancy skipped`);
    return { baseRef: null, warnings };
  }
  return { baseRef, warnings };
}

function addSource(map, taskId, source) {
  if (!map.has(taskId)) map.set(taskId, []);
  const list = map.get(taskId);
  if (!list.some((entry) => entry.kind === source.kind && entry.detail === source.detail)) {
    list.push(source);
  }
}

function collectTokens(text, prefix, onMatch) {
  const regex = idTokenRegex(prefix);
  let match = regex.exec(text);
  while (match) {
    onMatch(`${prefix}-${match[1]}`);
    match = regex.exec(text);
  }
}

function collectBaseRefIds(root, baseRef, prefix, policy, map) {
  const paths = Array.isArray(policy.baseScanPaths) ? policy.baseScanPaths : [];
  const listed = runGit(root, ['ls-tree', '-r', '--name-only', baseRef, '--', ...paths]);
  if (listed.ok) {
    for (const file of listed.stdout.split(/\r?\n/).filter(Boolean)) {
      collectTokens(path.posix.basename(file), prefix, (taskId) => addSource(map, taskId, {
        kind: 'base-ref',
        detail: `${baseRef}:${file}`,
      }));
    }
  }
  const grep = runGit(root, ['grep', '-h', '-o', '-E', `${prefix}-[0-9]{4,}`, baseRef, '--', ...paths]);
  if (grep.ok) {
    collectTokens(grep.stdout, prefix, (taskId) => addSource(map, taskId, {
      kind: 'base-ref',
      detail: `${baseRef} task store`,
    }));
  }
}

function collectUnmergedIds(root, baseRef, prefix, policy, map) {
  const selectors = Array.isArray(policy.unmergedRefSelectors) ? policy.unmergedRefSelectors : [];
  if (selectors.length === 0) return;
  const limit = Number(policy.unmergedCommitLimit) || 3000;
  const log = runGit(root, [
    'log', ...selectors, '--not', baseRef,
    `--max-count=${limit}`, '--format=%x1e%h%x1f%B', '--name-only',
  ]);
  if (!log.ok) return;
  for (const record of log.stdout.split('\x1e').filter((chunk) => chunk.trim())) {
    const [sha, body = ''] = record.split('\x1f');
    collectTokens(body, prefix, (taskId) => addSource(map, taskId, {
      kind: 'unmerged-commit',
      detail: `commit ${sha.trim()}`,
    }));
  }
}

function ghCandidates(policy) {
  const configured = Array.isArray(policy.ghExecutableCandidates) ? policy.ghExecutableCandidates : ['gh'];
  return [process.env.GH_PATH, ...configured].filter(Boolean);
}

function defaultGhRunner(root, args, policy) {
  let result = null;
  for (const executable of ghCandidates(policy)) {
    result = cp.spawnSync(executable, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: policy.ghTimeoutMs,
      windowsHide: true,
    });
    if (!(result.error && result.error.code === 'ENOENT')) break;
  }
  if (result.status !== 0) {
    const reason = result.error ? String(result.error.message || result.error) : (result.stderr || '').trim();
    throw new Error(reason || `gh exited ${result.status}`);
  }
  return result.stdout || '[]';
}

function collectPullRequestIds(root, prefix, policy, map, options = {}) {
  if (process.env.TASK_ID_SKIP_GH === '1' && !options.ghRunner) {
    return null;
  }
  const runner = options.ghRunner || defaultGhRunner;
  const args = [
    'pr', 'list',
    '--state', policy.pullRequestState || 'all',
    '--limit', String(policy.pullRequestLimit || 300),
    '--search', prefix,
    '--json', 'number,title,headRefName,body,state',
  ];
  let prs;
  try {
    prs = JSON.parse(runner(root, args, policy));
  } catch (error) {
    return `gh pr list unavailable (${error.message}); pull-request occupancy skipped`;
  }
  for (const pr of Array.isArray(prs) ? prs : []) {
    const text = [pr.title, pr.headRefName, pr.body].filter(Boolean).join('\n');
    collectTokens(text, prefix, (taskId) => addSource(map, taskId, {
      kind: 'pull-request',
      detail: `PR #${pr.number} (${String(pr.state || '').toLowerCase()})`,
    }));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shared reservation ledger (git common dir, shared by all local worktrees)
// ---------------------------------------------------------------------------

function ledgerPath(root, policy) {
  const commonDir = gitCommonDir(root);
  return commonDir ? path.join(commonDir, policy.reservationLedgerFile) : null;
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLedgerLock(filePath, fn) {
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if (!error || error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 30000) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) {
        const busy = new Error('task id reservation ledger busy; retry shortly');
        busy.code = 'TASK_ID_RESERVATION_BUSY';
        throw busy;
      }
      sleepMs(50);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.unlinkSync(lockPath); } catch { /* best effort */ }
  }
}

function readLedger(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data.reservations) ? data.reservations : [];
  } catch {
    return [];
  }
}

function writeLedger(filePath, reservations) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({ version: 1, reservations }, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function isExpired(entry, policy, now) {
  const reservedAt = Date.parse(entry.reservedAt || '');
  if (!Number.isFinite(reservedAt)) return true;
  return now - reservedAt > Number(policy.reservationTtlHours || 168) * 3600 * 1000;
}

function worktreeGone(entry, policy) {
  if (policy.pruneMissingWorktreeReservations === false || !entry.worktree) return false;
  return !fs.existsSync(entry.worktree);
}

function pruneLedger(reservations, policy, now, landedIds) {
  return reservations.filter((entry) => entry && entry.taskId
    && !isExpired(entry, policy, now)
    && !(landedIds && landedIds.has(entry.taskId))
    && !worktreeGone(entry, policy));
}

function listSharedReservations(root, policy = DEFAULT_POLICY, options = {}) {
  const filePath = ledgerPath(root, policy);
  if (!filePath) return [];
  const now = options.now || Date.now();
  return pruneLedger(readLedger(filePath), policy, now, null).map((entry) => ({
    ...entry,
    ledgerPath: filePath,
  }));
}

function sameWorktree(entry, root) {
  return normalizeFsPath(entry.worktree || '') === normalizeFsPath(root);
}

/**
 * Atomically claim taskId in the shared ledger. Returns { ok: true } or
 * { ok: false, holder } when another agent or another worktree already holds it.
 */
function recordSharedReservation(root, { taskId, agentName }, policy = DEFAULT_POLICY, options = {}) {
  const filePath = ledgerPath(root, policy);
  if (!filePath) return { ok: true, skipped: true };
  const now = options.now || Date.now();
  let outcome = { ok: true };
  withLedgerLock(filePath, () => {
    const reservations = pruneLedger(readLedger(filePath), policy, now, options.landedIds || null);
    const holder = reservations.find((entry) => entry.taskId === taskId
      && !(entry.agentName === agentName && sameWorktree(entry, root)));
    if (holder) {
      outcome = { ok: false, holder };
      writeLedger(filePath, reservations);
      return;
    }
    const kept = reservations.filter((entry) => entry.taskId !== taskId);
    kept.push({
      taskId,
      agentName,
      worktree: path.resolve(root).replace(/\\/g, '/'),
      reservedAt: new Date(now).toISOString(),
    });
    writeLedger(filePath, kept);
  });
  invalidateOccupancyCache();
  return outcome;
}

function dropSharedReservation(root, { taskId, agentName }, policy = DEFAULT_POLICY) {
  const filePath = ledgerPath(root, policy);
  if (!filePath || !fs.existsSync(filePath)) return false;
  let dropped = false;
  withLedgerLock(filePath, () => {
    const reservations = readLedger(filePath);
    const kept = reservations.filter((entry) => !(entry.taskId === taskId && entry.agentName === agentName && sameWorktree(entry, root)));
    dropped = kept.length !== reservations.length;
    if (dropped) writeLedger(filePath, kept);
  });
  invalidateOccupancyCache();
  return dropped;
}

// ---------------------------------------------------------------------------
// Aggregated occupancy
// ---------------------------------------------------------------------------

function invalidateOccupancyCache() {
  occupancyCache.clear();
}

/**
 * @returns {{ enabled: boolean, baseRef: string|null, sources: Map<string, Array<{kind:string, detail:string}>>, reservations: Array<object>, warnings: string[] }}
 */
function collectRemoteOccupancy(root, prefix, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const empty = { enabled: false, baseRef: null, sources: new Map(), reservations: [], warnings: [] };
  if (!prefix || !remoteChecksEnabled(root, options)) return empty;

  const cacheKey = `${normalizeFsPath(root)}|${prefix}`;
  const cached = occupancyCache.get(cacheKey);
  const now = options.now || Date.now();
  if (!options.noCache && cached && now - cached.at < Number(policy.occupancyCacheMs || 0)) {
    return cached.value;
  }

  const sources = new Map();
  const { baseRef, warnings } = resolveBaseRef(root, policy, options);
  if (baseRef) {
    collectBaseRefIds(root, baseRef, prefix, policy, sources);
    collectUnmergedIds(root, baseRef, prefix, policy, sources);
  }
  const ghWarning = collectPullRequestIds(root, prefix, policy, sources, options);
  if (ghWarning) warnings.push(ghWarning);

  const reservations = listSharedReservations(root, policy, { now })
    .filter((entry) => String(entry.taskId).startsWith(`${prefix}-`));

  const value = { enabled: true, baseRef, sources, reservations, warnings };
  occupancyCache.set(cacheKey, { at: now, value });
  return value;
}

module.exports = {
  DEFAULT_POLICY,
  collectRemoteOccupancy,
  dropSharedReservation,
  idTokenRegex,
  invalidateOccupancyCache,
  isGitToplevel,
  listSharedReservations,
  recordSharedReservation,
  remoteChecksEnabled,
  sameWorktree,
};
