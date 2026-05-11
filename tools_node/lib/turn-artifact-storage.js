'use strict';

const path = require('path');

const config = require('./project-config');

const PROJECT_ROOT = config.ROOT;
const FORMAL_ROOT = path.join(config.paths.artifactsDir, 'turn-artifacts');
const SCRATCH_ROOT = path.join(PROJECT_ROOT, 'scratch');
const LEGACY_FORMAL_PATH_ALLOWLIST = Object.freeze([
  Object.freeze({
    path: 'artifacts/turn-artifacts/atm-3-0001/context-summary/ATM-3-0001.json',
    ownerTask: 'ATM-3-0001',
    reason: 'adapter-owned context summary legacy path pending canonical migration plan',
    reviewBy: '2026-06-30',
  }),
  Object.freeze({
    path: 'artifacts/turn-artifacts/h2u-refactor-0006-rule-guard.json',
    ownerTask: 'H2U-P4-020',
    reason: 'legacy pilot rule-guard snapshot retained for first-win replay evidence',
    reviewBy: '2026-06-30',
  }),
]);

const TURN_ARTIFACT_STORAGE_POLICY = Object.freeze({
  schemaVersion: 'turn-artifact-storage/v1',
  formalPattern: 'artifacts/turn-artifacts/<YYYY-MM-DD>/<workflow>/<task>.json',
  formalRoot: 'artifacts/turn-artifacts',
  scratchRoot: 'scratch',
  formalUsage: '正式收工、handoff、metrics、history query 可消費的 turn artifact。',
  scratchUsage: '臨時 smoke、一次性 fixture、debug output；不得作為正式歷史查詢來源。',
  retention: {
    permanent: [
      '正式任務卡 done commit 對應的 artifact',
      'release / milestone / pilot adoption artifact',
      '用於 regression fixture 或 metrics baseline 的 artifact',
    ],
    cleanupEligible: [
      'scratch 下的一次性 smoke artifact',
      '失敗重試後已被同 task 更新版取代的 debug artifact',
      '未對應 task card、commit 或 baseline 的 local probe artifact',
    ],
  },
  legacyFormalPathAllowlist: LEGACY_FORMAL_PATH_ALLOWLIST,
});

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function toProjectRelative(absolutePath) {
  return toPosixPath(path.relative(PROJECT_ROOT, path.resolve(absolutePath)));
}

function normalizeRelativeTurnArtifactPath(filePath) {
  const raw = path.isAbsolute(String(filePath || ''))
    ? toProjectRelative(filePath)
    : toPosixPath(String(filePath || ''));
  return raw
    .replace(/^[./\\]+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

function normalizeDatePart(value = new Date()) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value || '').trim();
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0];
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error(`invalid turn artifact date: ${text || '(empty)'}`);
}

function sanitizePathSegment(value, label) {
  const segment = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!segment) {
    throw new Error(`missing ${label} for turn artifact storage path`);
  }

  return segment;
}

function isFormalTurnArtifactPath(filePath) {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath || '');
  const relativePath = toProjectRelative(absolutePath);
  const formalRelative = toProjectRelative(FORMAL_ROOT);
  return relativePath === formalRelative || relativePath.startsWith(`${formalRelative}/`);
}

function isScratchTurnArtifactPath(filePath) {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath || '');
  const relativePath = toProjectRelative(absolutePath);
  const scratchRelative = toProjectRelative(SCRATCH_ROOT);
  return relativePath === scratchRelative || relativePath.startsWith(`${scratchRelative}/`);
}

function describeTurnArtifactStorage() {
  return {
    schemaVersion: TURN_ARTIFACT_STORAGE_POLICY.schemaVersion,
    formalPattern: TURN_ARTIFACT_STORAGE_POLICY.formalPattern,
    formalRoot: toProjectRelative(FORMAL_ROOT),
    scratchRoot: toProjectRelative(SCRATCH_ROOT),
    formalUsage: TURN_ARTIFACT_STORAGE_POLICY.formalUsage,
    scratchUsage: TURN_ARTIFACT_STORAGE_POLICY.scratchUsage,
    retention: TURN_ARTIFACT_STORAGE_POLICY.retention,
    legacyFormalPathAllowlist: TURN_ARTIFACT_STORAGE_POLICY.legacyFormalPathAllowlist,
  };
}

function buildFormalTurnArtifactPath({ workflow, task, generatedAt = new Date() } = {}) {
  const datePart = normalizeDatePart(generatedAt);
  const workflowSegment = sanitizePathSegment(workflow, 'workflow');
  const taskSegment = sanitizePathSegment(task, 'task');
  const absolutePath = path.join(FORMAL_ROOT, datePart, workflowSegment, `${taskSegment}.json`);

  return {
    absolutePath,
    relativePath: toProjectRelative(absolutePath),
    datePart,
    workflowSegment,
    taskSegment,
    policy: TURN_ARTIFACT_STORAGE_POLICY.formalPattern,
  };
}

function classifyTurnArtifactPath(filePath) {
  if (isFormalTurnArtifactPath(filePath)) {
    return 'formal';
  }
  if (isScratchTurnArtifactPath(filePath)) {
    return 'scratch';
  }
  return 'custom';
}

const LEGACY_ALLOWLIST_LOOKUP = new Map(
  TURN_ARTIFACT_STORAGE_POLICY.legacyFormalPathAllowlist.map((entry) => [
    normalizeRelativeTurnArtifactPath(entry.path).toLowerCase(),
    entry,
  ]),
);

function findLegacyFormalPathAllowlistEntry(filePath) {
  const key = normalizeRelativeTurnArtifactPath(filePath).toLowerCase();
  if (!key) {
    return null;
  }
  return LEGACY_ALLOWLIST_LOOKUP.get(key) || null;
}

module.exports = {
  PROJECT_ROOT,
  FORMAL_ROOT,
  SCRATCH_ROOT,
  TURN_ARTIFACT_STORAGE_POLICY,
  toPosixPath,
  toProjectRelative,
  normalizeRelativeTurnArtifactPath,
  normalizeDatePart,
  sanitizePathSegment,
  isFormalTurnArtifactPath,
  isScratchTurnArtifactPath,
  describeTurnArtifactStorage,
  buildFormalTurnArtifactPath,
  classifyTurnArtifactPath,
  findLegacyFormalPathAllowlistEntry,
};
