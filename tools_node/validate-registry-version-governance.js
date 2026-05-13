#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'atomic-registry.json');

function parseArgs(argv) {
  const parsed = {
    strict: false,
    apply: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--apply') {
      parsed.apply = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-registry-version-governance.js [--strict] [--apply] [--report <json>]');
  console.log('');
  console.log('Validates and optionally backfills registry currentVersion / versions[] history.');
  console.log('When --apply is provided, missing version history is materialized from the current registry snapshot.');
}

function rel(filePath) {
  return path.relative(PROJECT_ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function getEntryId(entry) {
  return normalizeText(entry?.atomId || entry?.mapId || entry?.id || '');
}

function getEntryKind(entry) {
  return entry && entry.mapId ? 'map' : 'atom';
}

function getEntryPointer(entry) {
  return normalizeText(
    entry?.currentVersion ||
    entry?.atomVersion ||
    entry?.mapVersion ||
    entry?.specVersion ||
    entry?.version ||
    ''
  );
}

function getVersionKey(version) {
  return normalizeText(
    version?.currentVersion ||
    version?.version ||
    version?.atomVersion ||
    version?.mapVersion ||
    version?.id ||
    ''
  );
}

function getVersionFingerprint(version) {
  return normalizeText(
    version?.semanticFingerprint ||
    version?.mapSemanticFingerprint ||
    version?.sf ||
    ''
  );
}

function isValidatedAtomVersion(version) {
  return Boolean(
    version &&
    getVersionKey(version) &&
    getVersionFingerprint(version) &&
    normalizeText(version.specHash) &&
    normalizeText(version.codeHash) &&
    normalizeText(version.testHash) &&
    normalizeText(version.status || version.lifecycleStatus || '')
  );
}

function isValidatedMapVersion(version) {
  return Boolean(
    version &&
    getVersionKey(version) &&
    getVersionFingerprint(version) &&
    normalizeText(version.mapHash) &&
    normalizeText(version.status || version.lifecycleStatus || '')
  );
}

function isValidatedVersion(version, entryKind) {
  return entryKind === 'map' ? isValidatedMapVersion(version) : isValidatedAtomVersion(version);
}

function buildCurrentSnapshotVersion(entry, generatedAt) {
  const entryId = getEntryId(entry);
  const entryKind = getEntryKind(entry);
  const versionKey = getEntryPointer(entry);
  const timestamp = normalizeText(generatedAt) || new Date().toISOString();

  if (entryKind === 'map') {
    return {
      entryId,
      version: versionKey,
      status: normalizeText(entry.status || 'active'),
      semanticFingerprint: normalizeText(entry.semanticFingerprint || ''),
      mapHash: normalizeText(entry.mapHash || ''),
      members: clone(entry.members) || [],
      edges: clone(entry.edges) || [],
      entrypoints: clone(entry.entrypoints) || [],
      qualityTargets: clone(entry.qualityTargets) || {},
      evidence: clone(entry.evidence) || [],
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      changeKind: 'current-snapshot',
    };
  }

  const selfVerification = entry.selfVerification || {};
  return {
    entryId,
    version: versionKey,
    status: normalizeText(entry.status || 'active'),
    semanticFingerprint: normalizeText(entry.semanticFingerprint || ''),
    specHash: normalizeText(selfVerification.specHash || ''),
    codeHash: normalizeText(selfVerification.codeHash || ''),
    testHash: normalizeText(selfVerification.testHash || ''),
    hashLock: clone(entry.hashLock) || {},
    evidence: clone(entry.evidence) || [],
    sourcePaths: clone(selfVerification.sourcePaths) || {},
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    changeKind: 'current-snapshot',
  };
}

function materializeEntryFromVersion(entry, version) {
  const entryKind = getEntryKind(entry);
  const versionKey = getVersionKey(version);
  if (!versionKey) {
    return entry;
  }

  entry.currentVersion = versionKey;
  if (entryKind === 'map') {
    entry.mapVersion = versionKey;
    if (normalizeText(version.mapHash)) {
      entry.mapHash = version.mapHash;
    }
    if (normalizeText(version.semanticFingerprint)) {
      entry.semanticFingerprint = version.semanticFingerprint;
    }
    if (Array.isArray(version.members)) {
      entry.members = clone(version.members);
    }
    if (Array.isArray(version.edges)) {
      entry.edges = clone(version.edges);
    }
    if (Array.isArray(version.entrypoints)) {
      entry.entrypoints = clone(version.entrypoints);
    }
    if (version.qualityTargets && typeof version.qualityTargets === 'object') {
      entry.qualityTargets = clone(version.qualityTargets);
    }
    if (Array.isArray(version.evidence)) {
      entry.evidence = clone(version.evidence);
    }
    return entry;
  }

  entry.atomVersion = versionKey;
  if (normalizeText(version.semanticFingerprint)) {
    entry.semanticFingerprint = version.semanticFingerprint;
  }
  if (version.hashLock && typeof version.hashLock === 'object') {
    entry.hashLock = clone(version.hashLock);
  }
  if (Array.isArray(version.evidence)) {
    entry.evidence = clone(version.evidence);
  }
  if (version.specHash || version.codeHash || version.testHash || version.sourcePaths) {
    const selfVerification = clone(entry.selfVerification) || {};
    if (normalizeText(version.specHash)) {
      selfVerification.specHash = version.specHash;
    }
    if (normalizeText(version.codeHash)) {
      selfVerification.codeHash = version.codeHash;
    }
    if (normalizeText(version.testHash)) {
      selfVerification.testHash = version.testHash;
    }
    if (version.sourcePaths && typeof version.sourcePaths === 'object') {
      selfVerification.sourcePaths = clone(version.sourcePaths);
    }
    entry.selfVerification = selfVerification;
  }
  return entry;
}

function buildReport(registryDocument, options = {}) {
  const generatedAt = normalizeText(registryDocument?.generatedAt) || new Date().toISOString();
  const entries = Array.isArray(registryDocument?.entries) ? registryDocument.entries : [];
  const findings = [];
  const plan = [];
  const summary = {
    entryCount: entries.length,
    atomEntryCount: 0,
    mapEntryCount: 0,
    backfillRequiredCount: 0,
    currentPointerDriftCount: 0,
    unverifiableHistoryCount: 0,
    alreadyAlignedCount: 0,
  };

  for (const entry of entries) {
    const entryId = getEntryId(entry);
    if (!entryId) {
      continue;
    }

    const entryKind = getEntryKind(entry);
    if (entryKind === 'map') {
      summary.mapEntryCount += 1;
    } else {
      summary.atomEntryCount += 1;
    }

    const history = Array.isArray(entry.versions) ? entry.versions : [];
    const currentSnapshot = buildCurrentSnapshotVersion(entry, generatedAt);
    const currentPointer = getEntryPointer(entry);
    const validatedHistory = history.filter((version) => isValidatedVersion(version, entryKind));
    const latestValidatedVersion = validatedHistory.length > 0
      ? validatedHistory[validatedHistory.length - 1]
      : currentSnapshot;
    const latestValidatedKey = getVersionKey(latestValidatedVersion);
    const hasHistory = history.length > 0;
    const isHistoryValidated = validatedHistory.length > 0;
    const isPointerAligned = currentPointer && latestValidatedKey && currentPointer === latestValidatedKey;
    const needsBackfill = !hasHistory;
    const needsPointerAlignment = hasHistory && isHistoryValidated && !isPointerAligned;
    const historyUnverifiable = hasHistory && !isHistoryValidated;

    if (needsBackfill) {
      summary.backfillRequiredCount += 1;
      plan.push({
        entryId,
        entryKind,
        action: 'backfill-version-history',
        status: 'pending',
        currentVersion: currentPointer || '',
        targetVersion: latestValidatedKey || currentSnapshot.version || '',
        reason: 'registry entry has no versions[] history yet',
        versionCount: 0,
      });
      findings.push({
        findingVersion: 'registry-version-governance-finding/v1',
        kind: 'registry-version-governance-finding',
        ruleId: 'registry-version-governance.missing-version-history',
        trigger: 'registry.version-governance.missing-version-history',
        scope: 'atomic-registry.json#entries[].versions[]',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '先把 current snapshot 回填成 versions[]，再談批次對齊與回滾。',
        message: `missing version history for ${entryId}`,
        file: rel(REGISTRY_PATH),
        line: 0,
        details: {
          entryId,
          entryKind,
          currentVersion: currentPointer || '',
          targetVersion: latestValidatedKey || currentSnapshot.version || '',
        },
      });
      continue;
    }

    if (historyUnverifiable) {
      summary.unverifiableHistoryCount += 1;
      plan.push({
        entryId,
        entryKind,
        action: 'skip-unverifiable-history',
        status: 'blocked',
        currentVersion: currentPointer || '',
        targetVersion: '',
        reason: 'versions[] exists but no validated snapshot can be selected safely',
        versionCount: history.length,
      });
      findings.push({
        findingVersion: 'registry-version-governance-finding/v1',
        kind: 'registry-version-governance-finding',
        ruleId: 'registry-version-governance.unverifiable-history',
        trigger: 'registry.version-governance.unverifiable-history',
        scope: 'atomic-registry.json#entries[].versions[]',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '現有 versions[] 沒有足夠的驗證證據，先人工修復再跑對齊。',
        message: `cannot select a validated version for ${entryId}`,
        file: rel(REGISTRY_PATH),
        line: 0,
        details: {
          entryId,
          entryKind,
          currentVersion: currentPointer || '',
          versionCount: history.length,
        },
      });
      continue;
    }

    if (!currentPointer || !latestValidatedKey || !isPointerAligned) {
      summary.currentPointerDriftCount += 1;
      plan.push({
        entryId,
        entryKind,
        action: 'align-current-pointer',
        status: 'pending',
        currentVersion: currentPointer || '',
        targetVersion: latestValidatedKey || currentSnapshot.version || '',
        reason: currentPointer ? 'currentVersion pointer drifts from latest validated version' : 'currentVersion pointer is missing',
        versionCount: history.length,
      });
      findings.push({
        findingVersion: 'registry-version-governance-finding/v1',
        kind: 'registry-version-governance-finding',
        ruleId: 'registry-version-governance.pointer-drift',
        trigger: 'registry.version-governance.pointer-drift',
        scope: 'atomic-registry.json#entries[].currentVersion',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '把 currentVersion 對齊到最新驗證版本，再進行 rollback / batch promotion。',
        message: `currentVersion pointer drifts for ${entryId}`,
        file: rel(REGISTRY_PATH),
        line: 0,
        details: {
          entryId,
          entryKind,
          currentVersion: currentPointer || '',
          targetVersion: latestValidatedKey || currentSnapshot.version || '',
        },
      });
      continue;
    }

    summary.alreadyAlignedCount += 1;
    plan.push({
      entryId,
      entryKind,
      action: 'no-op',
      status: 'pass',
      currentVersion: currentPointer,
      targetVersion: latestValidatedKey,
      reason: 'currentVersion already matches the latest validated version',
      versionCount: history.length,
    });
  }

  const blockerCount = findings.filter((finding) => finding.action === 'fail' || finding.severity === 'block').length;
  const warningCount = findings.length - blockerCount;

  return {
    validator: 'validate-registry-version-governance',
    registryPath: rel(REGISTRY_PATH),
    generatedAt,
    summary,
    plan,
    findings,
    checks: [
      {
        id: 'version-history-present',
        passed: summary.backfillRequiredCount === 0 && summary.unverifiableHistoryCount === 0,
      },
      {
        id: 'current-version-pointer-aligned',
        passed: summary.currentPointerDriftCount === 0,
      },
      {
        id: 'validated-version-selectable',
        passed: summary.unverifiableHistoryCount === 0,
      },
    ],
    passed: blockerCount === 0,
    blockerCount,
    warningCount,
  };
}

function applyGovernancePlan(registryDocument, report) {
  const generatedAt = normalizeText(registryDocument?.generatedAt) || report.generatedAt || new Date().toISOString();
  const entries = Array.isArray(registryDocument?.entries) ? registryDocument.entries : [];

  for (const entry of entries) {
    const entryId = getEntryId(entry);
    if (!entryId) {
      continue;
    }

    const entryKind = getEntryKind(entry);
    const history = Array.isArray(entry.versions) ? entry.versions : [];
    const currentSnapshot = buildCurrentSnapshotVersion(entry, generatedAt);
    const currentPointer = getEntryPointer(entry);
    const validatedHistory = history.filter((version) => isValidatedVersion(version, entryKind));
    const latestValidatedVersion = validatedHistory.length > 0
      ? validatedHistory[validatedHistory.length - 1]
      : currentSnapshot;
    const latestValidatedKey = getVersionKey(latestValidatedVersion);

    if (history.length === 0) {
      entry.currentVersion = latestValidatedKey || currentPointer;
      if (entryKind === 'map') {
        entry.mapVersion = entry.currentVersion;
      } else {
        entry.atomVersion = entry.currentVersion;
      }
      entry.versions = [currentSnapshot];
      materializeEntryFromVersion(entry, currentSnapshot);
      continue;
    }

    if (validatedHistory.length > 0 && latestValidatedKey) {
      materializeEntryFromVersion(entry, latestValidatedVersion);
    }
  }

  return registryDocument;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`registry document not found: ${REGISTRY_PATH}`);
  }

  const registryDocument = readJson(REGISTRY_PATH);
  const report = buildReport(registryDocument, { apply: args.apply });

  if (args.apply) {
    applyGovernancePlan(registryDocument, report);
    writeJson(REGISTRY_PATH, registryDocument);
    const appliedReport = buildReport(registryDocument, { apply: false });
    appliedReport.applied = true;
    appliedReport.appliedAt = new Date().toISOString();
    appliedReport.appliedCount = report.summary.backfillRequiredCount + report.summary.currentPointerDriftCount;
    appliedReport.passed = appliedReport.blockerCount === 0;
    if (args.report) {
      const out = path.resolve(args.report);
      writeJson(out, appliedReport);
      console.error(`[validate-registry-version-governance] report=${rel(out)}`);
    }
    process.stdout.write(`${JSON.stringify(appliedReport, null, 2)}\n`);
    console.error(`[validate-registry-version-governance] status=${appliedReport.passed ? 'pass' : 'fail'} blockers=${appliedReport.blockerCount} warnings=${appliedReport.warningCount}`);
    if (args.strict && !appliedReport.passed) {
      process.exit(1);
    }
    return;
  }

  if (args.report) {
    const out = path.resolve(args.report);
    writeJson(out, report);
    console.error(`[validate-registry-version-governance] report=${rel(out)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-registry-version-governance] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount} warnings=${report.warningCount}`);

  if (args.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[validate-registry-version-governance] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  buildReport,
  applyGovernancePlan,
  buildCurrentSnapshotVersion,
  materializeEntryFromVersion,
  isValidatedVersion,
};
