'use strict';

/**
 * task-card-identity-guard.js (PROG-2-10001)
 *
 * Rejects changes that silently turn an existing task card (or its task-store
 * entry) into a different piece of work: removing or changing immutable
 * identity fields, dropping or hand-editing doc_id, retitling without
 * recording the old title, or deleting a store entry whose card still exists.
 *
 * The comparison point is merge-base(HEAD, baseRef) so newer base-ref edits
 * are never attributed to the change under review. Rules live in
 * task-card-identity-policy.json.
 */

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = require('./task-card-identity-policy.json');
const docIdGuard = require('./doc-id-allocation-guard');

function git(root, args) {
  const result = cp.spawnSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout : null;
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function readAt(root, ref, filePath) {
  if (!ref) {
    const abs = path.join(root, filePath);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  }
  return git(root, ['show', `${ref}:${filePath}`]);
}

function unquote(value) {
  const text = String(value || '').trim();
  const quoted = text.length >= 2
    && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('\'') && text.endsWith('\'')));
  return quoted ? text.slice(1, -1) : text;
}

/** Parse a task card into { fields, title }. */
function parseCard(text) {
  const fields = {};
  const body = String(text || '').replace(/\r\n/g, '\n');
  let rest = body;
  if (body.startsWith('---\n')) {
    const end = body.indexOf('\n---', 4);
    if (end !== -1) {
      for (const line of body.slice(4, end).split('\n')) {
        const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
        if (match) fields[match[1]] = unquote(match[2]);
      }
      rest = body.slice(end + 4);
    }
  }
  let title = fields.title || '';
  if (!title) {
    const heading = /^#\s+(.+)$/m.exec(rest);
    if (heading) title = heading[1].replace(/^\[[^\]]+\]\s*/, '');
  }
  return { fields, title: title.trim() };
}

function storeEntries(text) {
  if (text === null) return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    return null;
  }
  const list = Array.isArray(data) ? data : (Array.isArray(data.tasks) ? data.tasks : []);
  const map = new Map();
  for (const entry of list) {
    if (entry && entry.id) map.set(String(entry.id), entry);
  }
  return map;
}

function registeredPathsById(root, ref) {
  const map = new Map();
  for (const entry of docIdGuard.readShardEntries(root, ref || null) || []) {
    if (entry && entry.id) map.set(entry.id, normalizePath(entry.path));
  }
  return map;
}

function isBlank(value) {
  return value === undefined || value === null || String(value) === '';
}

/** Compare one identity record (card front matter or task-store entry). */
function compareIdentity({ label, before, after, beforeTitle, afterTitle, cardPath, registry, policy }) {
  const errors = [];
  for (const field of policy.immutableFields) {
    const prev = before[field];
    if (isBlank(prev)) continue;
    const next = after[field];
    if (isBlank(next)) {
      errors.push(`${label}: identity field "${field}" was removed (was "${prev}").`);
    } else if (String(next) !== String(prev)) {
      errors.push(`${label}: identity field "${field}" changed "${prev}" -> "${next}".`);
    }
  }
  const docField = policy.docIdField;
  const prevDoc = String(before[docField] || '');
  const nextDoc = String(after[docField] || '');
  if (prevDoc && !nextDoc) {
    errors.push(`${label}: ${docField} "${prevDoc}" was removed.`);
  } else if (prevDoc && nextDoc !== prevDoc && (!cardPath || registry.get(nextDoc) !== cardPath)) {
    errors.push(`${label}: ${docField} changed "${prevDoc}" -> "${nextDoc}" but the registry does not assign ${nextDoc} to ${cardPath || 'this card'}; use node tools_node/doc-id-registry.js --renumber <card>.`);
  }
  if (beforeTitle && afterTitle && beforeTitle !== afterTitle) {
    const renamedFrom = String(after[policy.renamedFromField] || '').trim();
    if (renamedFrom !== beforeTitle) {
      errors.push(`${label}: title changed "${beforeTitle}" -> "${afterTitle}". For a rename of the same work set ${policy.renamedFromField}: "${beforeTitle}"; for different work reserve a new task id (node tools_node/task-lock.js reserve <prefix> <agent>).`);
    }
  }
  return errors;
}

function resolveComparisonRef(root, baseRef) {
  const mergeBase = (git(root, ['merge-base', 'HEAD', baseRef]) || '').trim();
  return mergeBase || baseRef;
}

/**
 * @param {string} root repository root
 * @param {string} baseRef e.g. origin/master
 * @param {object} [options] { policy, headRef } headRef omitted = working tree
 */
function checkTaskCardIdentity(root, baseRef, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const cardRe = new RegExp(policy.cardPathPattern);
  const storeRe = new RegExp(policy.taskStorePathPattern);
  const headRef = options.headRef || null;
  const compareRef = options.headRef
    ? ((git(root, ['merge-base', headRef, baseRef]) || '').trim() || baseRef)
    : resolveComparisonRef(root, baseRef);
  if (git(root, ['rev-parse', '--verify', '--quiet', `${compareRef}^{commit}`]) === null) {
    return { ok: false, compareRef, errors: [`Base ref ${baseRef} is not available.`] };
  }
  const changed = (git(root, headRef ? ['diff', '--name-only', compareRef, headRef, '--'] : ['diff', '--name-only', compareRef, '--']) || '')
    .split('\n')
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean);
  const registry = registeredPathsById(root, headRef);
  const errors = [];
  const cardPathById = new Map();

  for (const file of changed.filter((name) => cardRe.test(name))) {
    const beforeText = readAt(root, compareRef, file);
    const afterText = readAt(root, headRef, file);
    if (beforeText === null || afterText === null) continue; // added or deleted card
    const before = parseCard(beforeText);
    const after = parseCard(afterText);
    if (before.fields.id) cardPathById.set(before.fields.id, file);
    errors.push(...compareIdentity({
      label: file,
      before: before.fields,
      after: after.fields,
      beforeTitle: before.title,
      afterTitle: after.title,
      cardPath: file,
      registry,
      policy,
    }));
  }

  for (const file of changed.filter((name) => storeRe.test(name))) {
    const beforeMap = storeEntries(readAt(root, compareRef, file));
    const afterMap = storeEntries(readAt(root, headRef, file));
    if (!beforeMap || !afterMap) continue;
    for (const [id, before] of beforeMap) {
      const after = afterMap.get(id);
      const cardPath = before.brief && before.brief.doc
        ? normalizePath(before.brief.doc)
        : (cardPathById.get(id) || '');
      if (!after) {
        if (cardPath && readAt(root, headRef, cardPath) !== null) {
          errors.push(`${file}#${id}: task-store entry was removed while its card ${cardPath} still exists.`);
        }
        continue;
      }
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      errors.push(...compareIdentity({
        label: `${file}#${id}`,
        before,
        after,
        beforeTitle: String(before.title || '').trim(),
        afterTitle: String(after.title || '').trim(),
        cardPath,
        registry,
        policy,
      }));
    }
  }

  return { ok: errors.length === 0, compareRef, errors };
}

module.exports = { DEFAULT_POLICY, parseCard, compareIdentity, checkTaskCardIdentity };
