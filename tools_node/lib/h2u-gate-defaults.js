'use strict';

const _path = require('node:path');

const DEFAULT_H2U_WORKTREE_STATUS_FILE = 'artifacts/legacy-h2u-first-win/worktree-status.txt';
const DEFAULT_H2U_BASELINE_WORKTREE_STATUS_FILE = 'artifacts/legacy-h2u-first-win/worktree-baseline.txt';
const DEFAULT_H2U_STATUS_SNAPSHOT_OUT = 'artifacts/legacy-h2u-first-win/worktree-status.snapshot.txt';
const DEFAULT_H2U_ALLOW_DIRTY_PREFIXES = Object.freeze([
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json',
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.readiness.json',
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.runtime-version.json',
]);

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

function resolveH2uGateConfig(options = {}) {
  const configuredStatusFile = String(options.worktreeStatusFile || '').trim();
  const configuredBaselineFile = String(options.baselineWorktreeStatusFile || '').trim();
  const configuredSnapshotOut = String(options.statusSnapshotOut || '').trim();
  return {
    worktreeStatusFile: configuredStatusFile || DEFAULT_H2U_WORKTREE_STATUS_FILE,
    baselineWorktreeStatusFile: configuredBaselineFile || DEFAULT_H2U_BASELINE_WORKTREE_STATUS_FILE,
    statusSnapshotOut: configuredSnapshotOut || DEFAULT_H2U_STATUS_SNAPSHOT_OUT,
    allowDirtyPrefixes: uniquePaths([
      ...DEFAULT_H2U_ALLOW_DIRTY_PREFIXES,
      ...(Array.isArray(options.allowDirtyPrefixes) ? options.allowDirtyPrefixes : []),
    ]),
  };
}

function buildH2uGateArgs(options = {}) {
  const resolved = resolveH2uGateConfig(options);
  const args = ['--worktree-status-file', resolved.worktreeStatusFile];
  if (resolved.baselineWorktreeStatusFile) {
    args.push('--baseline-worktree-status-file', resolved.baselineWorktreeStatusFile);
  }
  if (resolved.statusSnapshotOut) {
    args.push('--status-snapshot-out', resolved.statusSnapshotOut);
  }
  for (const prefix of resolved.allowDirtyPrefixes) {
    args.push('--allow-dirty-prefix', prefix);
  }
  return args;
}

module.exports = {
  DEFAULT_H2U_BASELINE_WORKTREE_STATUS_FILE,
  DEFAULT_H2U_WORKTREE_STATUS_FILE,
  DEFAULT_H2U_STATUS_SNAPSHOT_OUT,
  DEFAULT_H2U_ALLOW_DIRTY_PREFIXES,
  buildH2uGateArgs,
  resolveH2uGateConfig,
};
