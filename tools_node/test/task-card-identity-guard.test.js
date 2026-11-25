#!/usr/bin/env node
'use strict';

/**
 * Task card identity guard (PROG-2-10001). Replays the 9f3e7ed58 failure
 * class: an existing card (and its task-store entry) rewritten into different
 * work must fail, while ordinary progress edits, recorded renames and
 * registry-backed doc_id renumbering pass.
 */

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkTaskCardIdentity } = require('../lib/task-card-identity-guard');

const CARD = 'docs/agent-briefs/tasks/PROG/PROG-9-0001.md';
const STORE = 'docs/tasks/tasks-prog.json';

function git(root, ...args) {
  const result = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text, 'utf8');
}

function card({ docId = 'doc_task_0001', title = 'Battle HUD i18n', status = 'open', extra = '', identity = true } = {}) {
  const lines = ['---'];
  if (docId) lines.push(`doc_id: ${docId}`);
  lines.push('id: PROG-9-0001');
  if (identity) lines.push('created: 2026-11-25', 'created_by_agent: AgentA');
  lines.push(`status: ${status}`);
  if (extra) lines.push(extra);
  lines.push('---', `# [PROG-9-0001] ${title}`, '');
  return lines.join('\n');
}

function store(entry) {
  return `${JSON.stringify({ tasks: [entry] }, null, 2)}\n`;
}

const BASE_ENTRY = {
  doc_id: 'doc_task_0001',
  id: 'PROG-9-0001',
  title: 'Battle HUD i18n',
  status: 'open',
  created: '2026-11-25',
  created_by_agent: 'AgentA',
  brief: { doc: CARD },
};

function registry(entries) {
  const shard = entries.map(([id, p]) => ({ id, path: p, title: p, category: 'task' }));
  write(registryRootHolder.root, 'docs/doc-id-registry-shards/registry-task.json', `${JSON.stringify(shard, null, 2)}\n`);
}

const registryRootHolder = { root: '' };

function withRepo(fn) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'task-card-identity-')));
  registryRootHolder.root = root;
  try {
    git(root, 'init', '-q', '-b', 'master');
    git(root, 'config', 'user.email', 'test@example.invalid');
    git(root, 'config', 'user.name', 'identity-test');
    write(root, CARD, card());
    write(root, STORE, store(BASE_ENTRY));
    registry([['doc_task_0001', CARD]]);
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'base');
    git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function check(root) {
  return checkTaskCardIdentity(root, 'origin/master');
}

function testRepurposedCardFails() {
  withRepo((root) => {
    write(root, CARD, card({ docId: '', title: 'Biological child family registry', status: 'done', identity: false }));
    const { created, created_by_agent: _agent, doc_id: _doc, ...rest } = BASE_ENTRY;
    assert.ok(created);
    write(root, STORE, store({ ...rest, title: 'Biological child family registry', status: 'done' }));
    const result = check(root);
    assert.equal(result.ok, false);
    const text = result.errors.join('\n');
    for (const needle of ['"created" was removed', '"created_by_agent" was removed', 'doc_id "doc_task_0001" was removed', 'title changed']) {
      assert.ok(text.includes(`${CARD}: identity field ${needle}`) || text.includes(`${CARD}: ${needle}`), `card: ${needle}\n${text}`);
      assert.ok(text.includes(`${STORE}#PROG-9-0001`), text);
    }
  });
}

function testProgressEditPasses() {
  withRepo((root) => {
    write(root, CARD, card({ status: 'in-progress', extra: 'notes: "progress"' }));
    write(root, STORE, store({ ...BASE_ENTRY, status: 'in-progress', notes: 'progress' }));
    const result = check(root);
    assert.equal(result.ok, true, result.errors.join('\n'));
  });
}

function testRecordedRenamePasses() {
  withRepo((root) => {
    write(root, CARD, card({ title: 'Battle HUD and sortie i18n', extra: 'renamed_from: "Battle HUD i18n"' }));
    write(root, STORE, store({ ...BASE_ENTRY, title: 'Battle HUD and sortie i18n', renamed_from: 'Battle HUD i18n' }));
    const result = check(root);
    assert.equal(result.ok, true, result.errors.join('\n'));
  });
}

function testDocIdRenumberRequiresRegistry() {
  withRepo((root) => {
    write(root, CARD, card({ docId: 'doc_task_0002' }));
    write(root, STORE, store({ ...BASE_ENTRY, doc_id: 'doc_task_0002' }));
    let result = check(root);
    assert.equal(result.ok, false, 'hand-edited doc_id must fail');
    assert.ok(result.errors.some((error) => error.includes('registry does not assign doc_task_0002')), result.errors.join('\n'));

    registry([['doc_task_0002', CARD]]);
    result = check(root);
    assert.equal(result.ok, true, result.errors.join('\n'));
  });
}

function testStoreEntryRemovalWhileCardExistsFails() {
  withRepo((root) => {
    write(root, STORE, `${JSON.stringify({ tasks: [] }, null, 2)}\n`);
    const result = check(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('task-store entry was removed')), result.errors.join('\n'));
  });
}

function testHeadRefModeMatchesWorkingTree() {
  withRepo((root) => {
    write(root, CARD, card({ title: 'Something else' }));
    git(root, 'commit', '-q', '-am', 'repurpose');
    const head = git(root, 'rev-parse', 'HEAD');
    git(root, 'checkout', '-q', '--detach', 'origin/master');
    const result = checkTaskCardIdentity(root, `${head}~1`, { headRef: head });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('title changed')), result.errors.join('\n'));
  });
}

testRepurposedCardFails();
testProgressEditPasses();
testRecordedRenamePasses();
testDocIdRenumberRequiresRegistry();
testStoreEntryRemovalWhileCardExistsFails();
testHeadRefModeMatchesWorkingTree();
console.log('[task-card-identity-guard.test] ok');
