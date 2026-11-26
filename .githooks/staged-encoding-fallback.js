#!/usr/bin/env node
'use strict';

// Built-in, dependency-free staged encoding check used by .githooks/pre-commit
// when the worktree has no tools_node/check-encoding-integrity.js (for example
// the mailbox branch). It reads staged blobs from the index, so it checks what
// will actually be committed, and blocks UTF-8 BOM and U+FFFD (which also
// covers invalid UTF-8 byte sequences after decoding).

const path = require('path');
const { execFileSync } = require('child_process');

const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt', '.json', '.jsonl', '.yml', '.yaml', '.toml',
  '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.scss',
  '.ps1', '.sh', '.py', '.csv', '.xml', '.svg',
]);

function git(args, options = {}) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, ...options });
}

function stagedTextFiles() {
  const raw = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' });
  return raw.split('\0').filter(Boolean).filter((file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
}

function inspect(file) {
  const bytes = git(['show', `:${file}`]);
  const issues = [];
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    issues.push('UTF-8 BOM');
  }
  const replacementCount = (bytes.toString('utf8').match(new RegExp(String.fromCharCode(0xfffd), 'g')) || []).length;
  if (replacementCount > 0) {
    issues.push(`U+FFFD or invalid UTF-8 x${replacementCount}`);
  }
  return issues;
}

function main() {
  const files = stagedTextFiles();
  const failures = [];
  for (const file of files) {
    const issues = inspect(file);
    if (issues.length > 0) failures.push({ file, issues });
  }
  if (failures.length > 0) {
    console.error('[encoding-fallback] staged text files failed the built-in encoding check:');
    for (const failure of failures) {
      console.error(`  - ${failure.file}: ${failure.issues.join(', ')}`);
    }
    console.error('  Fix: re-save these files as UTF-8 without BOM and re-stage them.');
    return 1;
  }
  console.log(`[encoding-fallback] ok (${files.length} staged text file(s) checked for BOM/U+FFFD)`);
  return 0;
}

process.exit(main());
