'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { inspectH2uWorktreeIsolation } = require('../lib/h2u-worktree-isolation');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function testBaselineDiffBlocksOnlyNewUnrelatedDirty() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h2u-worktree-baseline-'));
  try {
    const baselinePath = path.join(tempRoot, 'baseline.txt');
    const currentPath = path.join(tempRoot, 'current.txt');
    const snapshotOut = path.join(tempRoot, 'snapshot-out.txt');

    writeText(baselinePath, ' M shared.js\n M legacy.js\n');
    writeText(currentPath, ' M shared.js\n M legacy.js\n M new-dirty.js\n');

    const result = inspectH2uWorktreeIsolation({
      root: tempRoot,
      baselineWorktreeStatusFile: baselinePath,
      worktreeStatusFile: currentPath,
      statusSnapshotOut: snapshotOut,
      allowDirtyPrefixes: [],
      strict: true,
      requireWorktreeCheck: true,
    });

    assert(result.passed === false, 'new unrelated dirty should block when baseline does not include it');
    assert(Array.isArray(result.baselineDirtyFiles) && result.baselineDirtyFiles.length === 2, 'baseline dirty files should be preserved');
    assert(Array.isArray(result.dirtyFiles) && result.dirtyFiles.length === 3, 'current dirty files should be captured');
    assert(Array.isArray(result.introducedDirtyFiles) && result.introducedDirtyFiles.length === 1, 'only one new dirty file should be introduced');
    assert(Array.isArray(result.unrelatedDirtyFiles) && result.unrelatedDirtyFiles[0] === 'new-dirty.js', 'new dirty file should be the only blocker');
    assert(fs.existsSync(snapshotOut), 'status snapshot out should be written');
    assert(String(fs.readFileSync(snapshotOut, 'utf8')).includes('new-dirty.js'), 'status snapshot out should mirror the current snapshot');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testAllowListStillWorksOnTopOfBaselineDiff() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'h2u-worktree-baseline-allow-'));
  try {
    const baselinePath = path.join(tempRoot, 'baseline.txt');
    const currentPath = path.join(tempRoot, 'current.txt');

    writeText(baselinePath, ' M shared.js\n');
    writeText(currentPath, ' M shared.js\n M assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json\n');

    const result = inspectH2uWorktreeIsolation({
      root: tempRoot,
      baselineWorktreeStatusFile: baselinePath,
      worktreeStatusFile: currentPath,
      allowDirtyPrefixes: ['assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json'],
      strict: true,
      requireWorktreeCheck: true,
    });

    assert(result.passed === true, 'allow-list prefix should remain allowed after baseline diffing');
    assert(Array.isArray(result.allowedDirtyFiles) && result.allowedDirtyFiles[0] === 'assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json', 'allowed dirty file should be tracked separately');
    assert(Array.isArray(result.unrelatedDirtyFiles) && result.unrelatedDirtyFiles.length === 0, 'no unrelated dirty files should remain');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  testBaselineDiffBlocksOnlyNewUnrelatedDirty();
  testAllowListStillWorksOnTopOfBaselineDiff();
  console.log('h2u worktree isolation tests passed');
}

main();