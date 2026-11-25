'use strict';

/**
 * doc-id-allocation-guard.js
 *
 * Prevents doc_id collisions between agents that allocate on separate branches
 * or worktrees.
 *
 * - Allocation floor: next id = max(local registry, base ref registry,
 *   active local reservations) + 1. The base ref (origin/master by default) is
 *   refreshed with a best-effort fetch; reservations live in the git common
 *   dir so every worktree on the same machine sees them.
 * - Collision check: rejects doc_ids that a change newly collides with the
 *   base ref, and prints the next free number per prefix.
 *
 * Tunables live in doc-id-allocation-policy.json, not in control flow.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const DEFAULT_POLICY = require('./doc-id-allocation-policy.json');

const DOC_ID_RE = /^(doc_(?:server_[a-z]+|[a-z]+))_(\d{4})$/i;
const INJECTED_GREP_RE = 'doc_id:[[:space:]]*doc_[a-z]+(_[a-z]+)?_[0-9]{4}';
const INJECTED_PARSE_RE = /doc_id:\s*(doc_[a-z]+(?:_[a-z]+)?_\d{4})/i;

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function splitDocId(docId) {
  const match = DOC_ID_RE.exec(String(docId || ''));
  return match ? { prefix: match[1].toLowerCase(), number: Number(match[2]) } : null;
}

function formatDocId(prefix, number) {
  return `${prefix}_${String(number).padStart(4, '0')}`;
}

function runGit(root, args, options = {}) {
  return cp.spawnSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    timeout: options.timeout,
    windowsHide: true,
  });
}

function gitStdout(root, args, options) {
  const result = runGit(root, args, options);
  return result.status === 0 ? result.stdout : null;
}

function entriesFromShardJson(raw) {
  if (Array.isArray(raw)) {
    return raw
      .filter((entry) => entry && entry.id)
      .map((entry) => ({ id: String(entry.id), path: normalizePath(entry.path) }));
  }
  if (raw && Array.isArray(raw.entries)) return entriesFromShardJson(raw.entries);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([key]) => DOC_ID_RE.test(key))
      .map(([key, value]) => ({ id: key, path: normalizePath(value && value.path) }));
  }
  return [];
}

function isShardFile(name) {
  return /^registry-[a-z0-9-]+\.json$/i.test(path.basename(name));
}

/** Raw shard entries (duplicates preserved) from the working tree or a git ref. */
function readShardEntries(root, ref, policy = DEFAULT_POLICY) {
  const shardDir = normalizePath(policy.shardDir);
  const entries = [];
  if (!ref) {
    const absDir = path.join(root, shardDir);
    if (!fs.existsSync(absDir)) return entries;
    for (const name of fs.readdirSync(absDir).filter(isShardFile).sort()) {
      const raw = JSON.parse(fs.readFileSync(path.join(absDir, name), 'utf8'));
      entries.push(...entriesFromShardJson(raw));
    }
    return entries;
  }
  const listing = gitStdout(root, ['ls-tree', '--name-only', ref, '--', `${shardDir}/`]);
  if (listing === null) return null;
  for (const file of listing.split('\n').map((line) => line.trim()).filter(isShardFile).sort()) {
    const text = gitStdout(root, ['show', `${ref}:${file}`]);
    if (text === null) continue;
    entries.push(...entriesFromShardJson(JSON.parse(text)));
  }
  return entries;
}

/** Refresh and resolve the base ref; returns null when it cannot be resolved. */
function resolveBaseRef(root, policy = DEFAULT_POLICY, options = {}) {
  const ref = options.baseRef || process.env.DOC_ID_BASE_REF || policy.baseRef;
  const skipFetch = options.skipFetch || process.env.DOC_ID_SKIP_FETCH === '1';
  if (!skipFetch && !options.baseRef && policy.fetchRemote && policy.fetchBranch) {
    runGit(root, ['fetch', '--quiet', '--no-tags', policy.fetchRemote, policy.fetchBranch], {
      timeout: policy.fetchTimeoutMs,
    });
  }
  const resolved = gitStdout(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return resolved ? ref : null;
}

function reservationLedgerPath(root, policy = DEFAULT_POLICY) {
  const commonDir = gitStdout(root, ['rev-parse', '--git-common-dir']);
  if (!commonDir) return null;
  return path.join(path.resolve(root, commonDir.trim()), policy.reservationLedgerFile);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLedgerLock(ledgerPath, fn) {
  const lockPath = `${ledgerPath}.lock`;
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 30000) fs.rmSync(lockPath, { force: true });
      } catch (_) { /* lock vanished between checks */ }
      if (Date.now() > deadline) throw new Error(`doc-id reservation ledger is locked: ${lockPath}`);
      sleepSync(50);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
}

function readLedger(ledgerPath) {
  if (!ledgerPath || !fs.existsSync(ledgerPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    return Array.isArray(raw.reservations) ? raw.reservations : [];
  } catch (_) {
    return [];
  }
}

function writeLedger(ledgerPath, reservations) {
  const tmp = `${ledgerPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ schema: 'doc-id-reservations.v1', reservations }, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, ledgerPath);
}

/** Drop reservations that expired or whose id already landed on the base ref. */
function pruneReservations(reservations, baseIds, now) {
  return reservations.filter((entry) => entry && entry.id
    && !baseIds.has(entry.id)
    && Date.parse(entry.expiresAt || 0) > now);
}

/**
 * Ids that a new allocation must stay above: base ref registry plus active
 * local reservations. The caller merges these with its own registry.
 */
function computeAllocationFloor(root, policy = DEFAULT_POLICY, options = {}) {
  const now = options.now || Date.now();
  const baseRef = resolveBaseRef(root, policy, options);
  const baseEntries = baseRef ? readShardEntries(root, baseRef, policy) || [] : [];
  const baseIds = new Set(baseEntries.map((entry) => entry.id));
  const ledgerPath = reservationLedgerPath(root, policy);
  let reservations = [];
  if (ledgerPath) {
    reservations = withLedgerLock(ledgerPath, () => {
      const kept = pruneReservations(readLedger(ledgerPath), baseIds, now);
      writeLedger(ledgerPath, kept);
      return kept;
    });
  }
  const ids = new Set([...baseIds, ...reservations.map((entry) => entry.id)]);
  return { ids, baseRef, baseIdCount: baseIds.size, reservationCount: reservations.length };
}

function reserveDocId(root, reservation, policy = DEFAULT_POLICY, options = {}) {
  const ledgerPath = reservationLedgerPath(root, policy);
  if (!ledgerPath) return null;
  const now = options.now || Date.now();
  const record = {
    id: reservation.id,
    path: normalizePath(reservation.path),
    actor: reservation.actor || process.env.ATM_ACTOR_ID || (gitStdout(root, ['config', 'user.name']) || '').trim() || 'unknown',
    branch: (gitStdout(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim(),
    worktree: normalizePath(root),
    reservedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + policy.reservationTtlHours * 3600 * 1000).toISOString(),
  };
  withLedgerLock(ledgerPath, () => {
    const kept = readLedger(ledgerPath).filter((entry) => entry && entry.id !== record.id);
    kept.push(record);
    writeLedger(ledgerPath, kept);
  });
  return record;
}

/** Map doc_id -> Set(path) for injected `doc_id:` markers in tracked/untracked markdown. */
function readInjectedIds(root, ref) {
  const args = ref
    ? ['grep', '-I', '-o', '-E', INJECTED_GREP_RE, ref, '--', '*.md']
    : ['grep', '-I', '-o', '--untracked', '-E', INJECTED_GREP_RE, '--', '*.md'];
  const stdout = gitStdout(root, args) || '';
  const prefix = ref ? `${ref}:` : '';
  const map = new Map();
  for (const line of stdout.split('\n')) {
    if (!line) continue;
    const body = prefix && line.startsWith(prefix) ? line.slice(prefix.length) : line;
    const match = INJECTED_PARSE_RE.exec(body);
    if (!match) continue;
    const filePath = normalizePath(body.slice(0, match.index).replace(/:$/, ''));
    if (!map.has(match[1])) map.set(match[1], new Set());
    map.get(match[1]).add(filePath);
  }
  return map;
}

function mirrorKey(filePath, policy = DEFAULT_POLICY) {
  const normalized = normalizePath(filePath);
  for (const rootDir of policy.mirrorRoots || []) {
    const prefix = `${normalizePath(rootDir).replace(/\/$/, '')}/`;
    if (normalized.startsWith(prefix)) return `<mirror>/${normalized.slice(prefix.length)}`;
  }
  return normalized;
}

function nextFreeByPrefix(idCollections) {
  const max = new Map();
  for (const collection of idCollections) {
    for (const id of collection) {
      const parsed = splitDocId(id);
      if (parsed) max.set(parsed.prefix, Math.max(max.get(parsed.prefix) || 0, parsed.number));
    }
  }
  return max;
}

/**
 * Detect doc_ids that the working tree newly collides on relative to baseRef.
 * Pre-existing duplicates on the base ref are not reported.
 */
function checkCollisions(root, baseRef, policy = DEFAULT_POLICY) {
  const errors = [];
  const headEntries = readShardEntries(root, null, policy);
  const baseEntries = readShardEntries(root, baseRef, policy);
  if (baseEntries === null) {
    return { ok: false, errors: [`Base ref ${baseRef} has no readable ${policy.shardDir}.`], suggestions: [] };
  }

  const seenId = new Map();
  const seenPath = new Map();
  for (const entry of headEntries) {
    if (seenId.has(entry.id) && seenId.get(entry.id) !== entry.path) {
      errors.push({ id: entry.id, message: `${entry.id} appears twice in the registry shards (${seenId.get(entry.id)} and ${entry.path}).` });
    }
    if (entry.path && seenPath.has(entry.path) && seenPath.get(entry.path) !== entry.id) {
      errors.push({ id: entry.id, message: `${entry.path} is registered twice (${seenPath.get(entry.path)} and ${entry.id}).` });
    }
    seenId.set(entry.id, entry.path);
    if (entry.path) seenPath.set(entry.path, entry.id);
  }

  const baseMap = new Map(baseEntries.map((entry) => [entry.id, entry.path]));
  const mergeBase = (gitStdout(root, ['merge-base', 'HEAD', baseRef]) || '').trim() || null;
  const existsAt = (ref, filePath) => runGit(root, ['cat-file', '-e', `${ref}:${filePath}`]).status === 0;
  for (const [id, headPath] of seenId) {
    const basePath = baseMap.get(id);
    if (!basePath || basePath === headPath || mirrorKey(basePath, policy) === mirrorKey(headPath, policy)) continue;
    // A legitimate rename/move: this change removed the doc that the base ref registers.
    const removedByChange = Boolean(mergeBase) && existsAt(mergeBase, basePath) && !fs.existsSync(path.join(root, basePath));
    const baseDocRenumbered = seenPath.has(basePath) && seenPath.get(basePath) !== id;
    if (existsAt(baseRef, basePath) && !removedByChange && !baseDocRenumbered) {
      errors.push({ id, message: `${id} is registered to ${headPath} here but to ${basePath} on ${baseRef}.` });
    }
  }

  const headInjected = readInjectedIds(root, null);
  const baseInjected = readInjectedIds(root, baseRef);
  for (const [id, paths] of headInjected) {
    const keys = new Set([...paths].map((p) => mirrorKey(p, policy)));
    if (keys.size < 2) continue;
    const baseKeys = new Set([...(baseInjected.get(id) || [])].map((p) => mirrorKey(p, policy)));
    const added = [...paths].filter((p) => !baseKeys.has(mirrorKey(p, policy)));
    if (added.length === 0) continue;
    errors.push({ id, message: `${id} is injected in ${keys.size} different docs; new in this change: ${added.join(', ')}.` });
  }

  // A doc_id marker this change adds must be one the registry assigns to that
  // doc. Hand-written ids (e.g. copying the task number into doc_task_NNNN)
  // bypass allocation and push the allocation floor toward exhaustion.
  const registeredScope = (policy.registeredInjectionPathPatterns || []).map((pattern) => new RegExp(pattern));
  if (registeredScope.length) {
    const registeredKey = new Map([...seenId].map(([id, p]) => [id, mirrorKey(p, policy)]));
    for (const [id, paths] of headInjected) {
      const baseKeys = new Set([...(baseInjected.get(id) || [])].map((p) => mirrorKey(p, policy)));
      for (const p of paths) {
        const key = mirrorKey(p, policy);
        if (!registeredScope.some((re) => re.test(normalizePath(p)))) continue;
        if (baseKeys.has(key) || registeredKey.get(id) === key) continue;
        errors.push({ id, message: `${id} is written in ${p} but the registry does not assign it to that doc; run node tools_node/doc-id-registry.js --assign ${p} (doc_id is allocated, never copied from the task number).` });
      }
    }
  }

  const unique = [];
  const seenMessages = new Set();
  for (const error of errors) {
    if (!seenMessages.has(error.message)) {
      seenMessages.add(error.message);
      unique.push(error);
    }
  }
  // Suggestions come from registered ids only, so hand-written outliers cannot
  // push the suggested next id toward the namespace limit.
  const maxByPrefix = nextFreeByPrefix([seenId.keys(), baseMap.keys()]);
  const prefixes = new Set(unique.map((error) => (splitDocId(error.id) || {}).prefix).filter(Boolean));
  const suggestions = [...prefixes].sort().map((prefix) => formatDocId(prefix, (maxByPrefix.get(prefix) || 0) + 1));
  return { ok: unique.length === 0, errors: unique.map((error) => error.message), suggestions };
}

module.exports = {
  DEFAULT_POLICY,
  splitDocId,
  formatDocId,
  readShardEntries,
  resolveBaseRef,
  reservationLedgerPath,
  pruneReservations,
  computeAllocationFloor,
  reserveDocId,
  readInjectedIds,
  mirrorKey,
  checkCollisions,
};
