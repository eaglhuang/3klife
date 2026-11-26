#!/usr/bin/env node
'use strict';

// PROG-2-10117: .githooks/pre-commit must not fail outright in worktrees that
// lack tools_node (the mailbox branch). It falls back to the built-in staged
// BOM/U+FFFD check, and keeps running the full checker when tools_node exists.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const hooksDir = path.join(projectRoot, '.githooks');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function git(cwd, args) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'hook-test',
      GIT_AUTHOR_EMAIL: 'hook-test@example.invalid',
      GIT_COMMITTER_NAME: 'hook-test',
      GIT_COMMITTER_EMAIL: 'hook-test@example.invalid',
    },
  });
}

function makeRepo(root, name) {
  const repo = path.join(root, name);
  fs.mkdirSync(repo, { recursive: true });
  const init = git(repo, ['init', '-q']);
  assert(init.status === 0, `git init failed: ${init.stderr}`);
  git(repo, ['config', 'core.hooksPath', hooksDir]);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  return repo;
}

function commitFile(repo, file, content) {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), content);
  git(repo, ['add', '--', file]);
  return git(repo, ['commit', '-q', '-m', `add ${file}`]);
}

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-encoding-fallback-'));
  try {
    // 1. No tools_node: clean Markdown commits without extracting tools.
    const mailbox = makeRepo(root, 'mailbox');
    const clean = commitFile(mailbox, 'mailbox/to-codex/clean.md', '# 信件\n\n內容正常。\n');
    assert(clean.status === 0, `clean .md commit should pass without tools_node:\n${clean.stdout}\n${clean.stderr}`);
    assert(/built-in staged encoding check/.test(clean.stdout + clean.stderr), 'fallback notice should be printed');

    // 2. No tools_node: BOM is blocked and the file is named.
    const bom = commitFile(mailbox, 'mailbox/to-codex/bom.md', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# bom\n')]));
    assert(bom.status !== 0, 'BOM .md commit must be blocked');
    assert(/bom\.md: UTF-8 BOM/.test(bom.stderr), `BOM failure should name the file:\n${bom.stderr}`);
    git(mailbox, ['reset', '-q']);

    // 3. No tools_node: U+FFFD / invalid UTF-8 is blocked.
    const fffd = commitFile(mailbox, 'mailbox/to-codex/fffd.md', Buffer.from([0x23, 0x20, 0xe4, 0xb8, 0x0a]));
    assert(fffd.status !== 0, 'invalid UTF-8 .md commit must be blocked');
    assert(/fffd\.md: U\+FFFD/.test(fffd.stderr), `U+FFFD failure should name the file:\n${fffd.stderr}`);
    git(mailbox, ['reset', '-q']);

    // 4. With tools_node: the full checker still runs (stub records invocation).
    const full = makeRepo(root, 'full');
    const marker = path.join(root, 'full-checker-ran.txt');
    fs.mkdirSync(path.join(full, 'tools_node'), { recursive: true });
    fs.writeFileSync(
      path.join(full, 'tools_node', 'check-encoding-integrity.js'),
      `require('fs').writeFileSync(${JSON.stringify(marker)}, process.argv.slice(2).join(' '));\n`,
    );
    const withTools = commitFile(full, 'doc.md', '# ok\n');
    assert(withTools.status === 0, `commit with tools_node should pass:\n${withTools.stdout}\n${withTools.stderr}`);
    assert(fs.existsSync(marker), 'tools_node/check-encoding-integrity.js must run when present');
    assert(fs.readFileSync(marker, 'utf8') === '--staged', 'full checker must receive --staged');
    assert(!/built-in staged encoding check/.test(withTools.stdout + withTools.stderr), 'fallback must not run when tools_node exists');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('[precommit-encoding-fallback] ok (4 scenarios)');
}

run();
