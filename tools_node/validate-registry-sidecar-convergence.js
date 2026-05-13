#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { resolveUpstreamRepoRoot } = require('./lib/upstream-env');

const projectRoot = path.resolve(__dirname, '..');
const upstreamRoot = resolveUpstreamRepoRoot({
  projectRoot,
}).upstreamRepoRoot;
const registryPath = path.join(upstreamRoot, 'atomic-registry.json');

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
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
  console.log('Usage: node tools_node/validate-registry-sidecar-convergence.js [--strict] [--report <json>]');
  console.log('');
  console.log('Checks registry sharding + versions[] sidecar convergence for hot entry / versions / index / catalog / rollback target.');
}

function rel(filePath) {
  return path.relative(projectRoot, path.resolve(filePath)).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeFingerprint(value) {
  return normalizeText(value);
}

function getEntryId(entry) {
  return normalizeText(entry?.atomId || entry?.mapId || entry?.id || '');
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
  return normalizeFingerprint(
    version?.semanticFingerprint ||
    version?.mapSemanticFingerprint ||
    version?.sf ||
    ''
  );
}

function getHotFingerprint(entry) {
  return normalizeFingerprint(
    entry?.semanticFingerprint ||
    entry?.mapSemanticFingerprint ||
    entry?.sf ||
    ''
  );
}

function hasHistoricalPayload(version) {
  if (!version || typeof version !== 'object') {
    return false;
  }
  return ['specHash', 'codeHash', 'testHash', 'timestamp', 'createdAt', 'updatedAt', 'status'].some((key) => Boolean(version[key]));
}

function isLegacyNoSfAllowlisted(entry) {
  const status = normalizeText(entry?.status).toLowerCase();
  return ['seed', 'governed', 'legacy', 'deprecated', 'quarantined'].includes(status);
}

function buildFinding({
  ruleId,
  trigger,
  scope,
  severity,
  action,
  routeClass,
  routeHint,
  message,
  file,
  details,
}) {
  return {
    findingVersion: 'registry-sidecar-convergence-finding/v1',
    kind: 'registry-sidecar-convergence-finding',
    ruleId,
    trigger,
    scope,
    severity,
    action,
    routeClass,
    routeHint,
    message,
    file: file || '',
    line: 0,
    details: details || {},
  };
}

async function loadRegistryHelpers() {
  const [catalogModule, indexModule] = await Promise.all([
    import(pathToFileURL(path.join(upstreamRoot, 'packages/core/src/registry/registry-catalog.mjs')).href),
    import(pathToFileURL(path.join(upstreamRoot, 'packages/core/src/registry/registry-index.mjs')).href),
  ]);

  return {
    createRegistryCatalogProjection: catalogModule.createRegistryCatalogProjection,
    createRegistryIndex: indexModule.createRegistryIndex,
  };
}

function buildCatalogRows(projection) {
  const atoms = Array.isArray(projection?.atoms) ? projection.atoms : [];
  const maps = Array.isArray(projection?.maps) ? projection.maps : [];
  return [
    ...atoms.map((row) => ({
      ...row,
      entryId: normalizeText(row?.entryId),
    })),
    ...maps.map((row) => ({
      ...row,
      entryId: normalizeText(row?.mapId),
    })),
  ];
}

function resolveCurrentVersionKey(entry, registryIndex, entryId) {
  const indexVersionRecord = registryIndex && typeof registryIndex.getVersions === 'function'
    ? registryIndex.getVersions(entryId)
    : null;

  return normalizeText(
    indexVersionRecord?.current ||
    entry?.currentVersion ||
    entry?.atomVersion ||
    entry?.mapVersion ||
    entry?.specVersion ||
    ''
  );
}

function extractRollbackTarget(entry) {
  return normalizeText(
    entry?.rollbackTarget ||
    entry?.rollbackVersion ||
    entry?.rollback?.targetVersion ||
    entry?.rollback?.target ||
    entry?.lifecycle?.rollbackTarget ||
    entry?.lifecycle?.rollbackVersion ||
    entry?.governance?.rollbackTarget ||
    ''
  );
}

function findVersionByKey(versions, key) {
  if (!key) {
    return null;
  }
  return versions.find((version) => getVersionKey(version) === key) || null;
}

function readEntryBinding(entry, version) {
  const sidecarEntryId = normalizeText(
    version?.sidecarEntryId ||
    version?.sidecar?.entryId ||
    entry?.sidecarEntryId ||
    entry?.sidecar?.entryId ||
    ''
  );
  const canonicalEntryId = normalizeText(
    version?.canonicalEntryId ||
    version?.canonical?.entryId ||
    entry?.canonicalEntryId ||
    entry?.canonical?.entryId ||
    ''
  );

  return { sidecarEntryId, canonicalEntryId };
}

function analyze(registryDocument, registryIndex, catalogRows) {
  const findings = [];
  const summary = {
    entryCount: 0,
    versionedEntryCount: 0,
    rollbackTargetChecks: 0,
    missingHistoricalSf: 0,
    pendingSfCalculation: 0,
    catalogIndexMismatch: 0,
    sidecarCanonicalMismatch: 0,
    rollbackTargetMismatch: 0,
    legacyNoSfAllowlist: 0,
  };

  const entries = Array.isArray(registryDocument?.entries) ? registryDocument.entries : [];
  summary.entryCount = entries.length;

  const rowByEntryId = new Map(catalogRows.map((row) => [normalizeText(row.entryId), row]));

  for (const entry of entries) {
    const entryId = getEntryId(entry);
    if (!entryId) {
      continue;
    }

    const entryFile = rel(registryPath);
    const versions = Array.isArray(entry.versions) ? entry.versions : [];
    if (versions.length > 0) {
      summary.versionedEntryCount += 1;
    }
    const hotFingerprint = getHotFingerprint(entry);
    const currentVersionKey = resolveCurrentVersionKey(entry, registryIndex, entryId);
    const currentVersionRecord = currentVersionKey
      ? findVersionByKey(versions, currentVersionKey)
      : (versions.length === 1 ? versions[0] : null);
    const currentVersionFingerprint = getVersionFingerprint(currentVersionRecord);
    const row = rowByEntryId.get(entryId) || null;
    const indexHit = registryIndex && typeof registryIndex.getByCanonicalId === 'function'
      ? registryIndex.getByCanonicalId(entryId)
      : null;

    const missingHistoricalVersions = [];
    for (const version of versions) {
      const versionKey = getVersionKey(version) || 'versions[?]';
      const fingerprint = getVersionFingerprint(version);
      if (!fingerprint && hasHistoricalPayload(version)) {
        const isCurrentVersion = currentVersionKey ? getVersionKey(version) === currentVersionKey : currentVersionRecord === version;
        if (isCurrentVersion) {
          summary.pendingSfCalculation += 1;
          findings.push(buildFinding({
            ruleId: 'registry-sidecar-convergence.pending-semantic-fingerprint',
            trigger: 'registry.sidecar.pending-semantic-fingerprint',
            scope: 'entries[].semanticFingerprint + versions[].semanticFingerprint',
            severity: 'block',
            action: 'fail',
            routeClass: 'blocker',
            routeHint: '先補 current version 的 semanticFingerprint，再收斂 sidecar/catalog/index。',
            message: `current version is missing semanticFingerprint for ${entryId}`,
            file: entryFile,
            details: { entryId, currentVersion: currentVersionKey, versionKey },
          }));
        } else {
          summary.missingHistoricalSf += 1;
          missingHistoricalVersions.push(versionKey);
        }
      }
    }

    if (missingHistoricalVersions.length > 0) {
      findings.push(buildFinding({
        ruleId: 'registry-sidecar-convergence.missing-historical-semantic-fingerprint',
        trigger: 'registry.sidecar.missing-historical-semantic-fingerprint',
        scope: 'entries[].versions[].semanticFingerprint',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '補齊歷史版本 semanticFingerprint，避免 versions[] 與 hot entry 漂移。',
        message: `historical versions are missing semanticFingerprint for ${entryId}`,
        file: entryFile,
        details: { entryId, missingHistoricalVersions },
      }));
    }

    if (!hotFingerprint) {
      if (versions.length === 0 && isLegacyNoSfAllowlisted(entry)) {
        summary.legacyNoSfAllowlist += 1;
        findings.push(buildFinding({
          ruleId: 'registry-sidecar-convergence.legacy-no-sf-allowlist',
          trigger: 'registry.sidecar.legacy-no-sf-allowlist',
          scope: 'entries[] legacy allowlist',
          severity: 'warn',
          action: 'warn',
          routeClass: 'advisory',
          routeHint: 'legacy allowlist 可保留，但後續版本治理仍建議補 semanticFingerprint。',
          message: `legacy entry without semanticFingerprint is allowlisted for ${entryId}`,
          file: entryFile,
          details: { entryId, status: normalizeText(entry.status) },
        }));
      } else {
        summary.pendingSfCalculation += 1;
        findings.push(buildFinding({
          ruleId: 'registry-sidecar-convergence.pending-semantic-fingerprint',
          trigger: 'registry.sidecar.pending-semantic-fingerprint',
          scope: 'entries[].semanticFingerprint',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: 'hot entry 缺 semanticFingerprint 時，catalog/index 與 sidecar 無法判定一致。',
          message: `hot entry is missing semanticFingerprint for ${entryId}`,
          file: entryFile,
          details: { entryId, status: normalizeText(entry.status), currentVersion: currentVersionKey },
        }));
      }
    } else if (currentVersionFingerprint && hotFingerprint !== currentVersionFingerprint) {
      summary.catalogIndexMismatch += 1;
      findings.push(buildFinding({
        ruleId: 'registry-sidecar-convergence.catalog-index-mismatch',
        trigger: 'registry.sidecar.catalog-index.mismatch',
        scope: 'hot entry vs current version fingerprint',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '先對齊 hot entry 與 current version 的 fingerprint，再進行 sidecar 收斂。',
        message: `hot semanticFingerprint does not match current version for ${entryId}`,
        file: entryFile,
        details: {
          entryId,
          hotFingerprint,
          currentVersionFingerprint,
          currentVersion: currentVersionKey,
        },
      }));
    }

    if (!row || !indexHit) {
      summary.catalogIndexMismatch += 1;
      findings.push(buildFinding({
        ruleId: 'registry-sidecar-convergence.catalog-index-mismatch',
        trigger: 'registry.sidecar.catalog-index.mismatch',
        scope: 'RegistryIndex + catalog projection',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '確保同一 entry 同時可被 RegistryIndex 與 catalog projection 命中。',
        message: `catalog/index lookup is missing for ${entryId}`,
        file: entryFile,
        details: { entryId, hasCatalogRow: Boolean(row), hasIndexHit: Boolean(indexHit) },
      }));
    }

    const rollbackTarget = extractRollbackTarget(entry);
    if (rollbackTarget) {
      summary.rollbackTargetChecks += 1;
      const targetRecord = findVersionByKey(versions, rollbackTarget);
      if (!targetRecord) {
        summary.rollbackTargetMismatch += 1;
        findings.push(buildFinding({
          ruleId: 'registry-sidecar-convergence.rollback-target-mismatch',
          trigger: 'registry.sidecar.rollback-target.missing',
          scope: 'rollback target',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: 'rollback target 必須可在 versions[] 解析到對應版本。',
          message: `rollback target ${rollbackTarget} is missing for ${entryId}`,
          file: entryFile,
          details: { entryId, rollbackTarget },
        }));
      } else {
        const binding = readEntryBinding(entry, targetRecord);
        if (binding.sidecarEntryId && binding.sidecarEntryId !== entryId) {
          summary.sidecarCanonicalMismatch += 1;
          findings.push(buildFinding({
            ruleId: 'registry-sidecar-convergence.sidecar-entry-mismatch',
            trigger: 'registry.sidecar.binding.mismatch',
            scope: 'sidecar entry binding',
            severity: 'block',
            action: 'fail',
            routeClass: 'blocker',
            routeHint: 'sidecar entryId 必須指回目前 canonical entryId。',
            message: `sidecar entryId ${binding.sidecarEntryId} does not match ${entryId}`,
            file: entryFile,
            details: { entryId, rollbackTarget, sidecarEntryId: binding.sidecarEntryId },
          }));
        }
        if (binding.canonicalEntryId && binding.canonicalEntryId !== entryId) {
          summary.sidecarCanonicalMismatch += 1;
          findings.push(buildFinding({
            ruleId: 'registry-sidecar-convergence.canonical-entry-mismatch',
            trigger: 'registry.sidecar.binding.mismatch',
            scope: 'canonical entry binding',
            severity: 'block',
            action: 'fail',
            routeClass: 'blocker',
            routeHint: 'canonical entryId 必須與目前 entryId 一致。',
            message: `canonical entryId ${binding.canonicalEntryId} does not match ${entryId}`,
            file: entryFile,
            details: { entryId, rollbackTarget, canonicalEntryId: binding.canonicalEntryId },
          }));
        }
        if (binding.sidecarEntryId && binding.canonicalEntryId && binding.sidecarEntryId !== binding.canonicalEntryId) {
          summary.sidecarCanonicalMismatch += 1;
          findings.push(buildFinding({
            ruleId: 'registry-sidecar-convergence.sidecar-canonical-mismatch',
            trigger: 'registry.sidecar.binding.mismatch',
            scope: 'sidecar/canonical linkage',
            severity: 'block',
            action: 'fail',
            routeClass: 'blocker',
            routeHint: 'sidecar 與 canonical 的 entryId 需一致，避免 rollback 指向錯誤目標。',
            message: `sidecar entryId ${binding.sidecarEntryId} does not match canonical entryId ${binding.canonicalEntryId}`,
            file: entryFile,
            details: { entryId, rollbackTarget, sidecarEntryId: binding.sidecarEntryId, canonicalEntryId: binding.canonicalEntryId },
          }));
        }
      }
    }
  }

  if (Array.isArray(registryIndex?.diagnostics) && registryIndex.diagnostics.length > 0) {
    summary.catalogIndexMismatch += 1;
    findings.push(buildFinding({
      ruleId: 'registry-sidecar-convergence.catalog-index-mismatch',
      trigger: 'registry.sidecar.catalog-index.diagnostics',
      scope: 'RegistryIndex diagnostics',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '先清空 RegistryIndex diagnostics，再收斂 sidecar convergence。',
      message: 'registry index diagnostics are not empty',
      file: rel(registryPath),
      details: { diagnostics: registryIndex.diagnostics },
    }));
  }

  if (catalogRows.length !== entries.length) {
    summary.catalogIndexMismatch += 1;
    findings.push(buildFinding({
      ruleId: 'registry-sidecar-convergence.catalog-index-mismatch',
      trigger: 'registry.sidecar.catalog-index.row-count-mismatch',
      scope: 'catalog row count',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: 'catalog projection row count 必須和 registry entries 對齊。',
      message: `catalog row count ${catalogRows.length} does not match registry entry count ${entries.length}`,
      file: rel(registryPath),
      details: { catalogRowCount: catalogRows.length, entryCount: entries.length },
    }));
  }

  return { findings, summary };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function buildReport() {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`registry document not found: ${registryPath}`);
  }

  const registryDocument = readJson(registryPath);
  const { createRegistryCatalogProjection, createRegistryIndex } = await loadRegistryHelpers();
  const registryIndex = createRegistryIndex(registryDocument);
  const catalogProjection = createRegistryCatalogProjection(registryDocument, {
    repositoryRoot: upstreamRoot,
    specRepositoryRoot: upstreamRoot,
  });
  const catalogRows = buildCatalogRows(catalogProjection);

  const analysis = analyze(registryDocument, registryIndex, catalogRows);
  const blockerCount = analysis.findings.filter((item) => item.action === 'fail' || item.severity === 'block').length;
  const warningCount = analysis.findings.length - blockerCount;

  return {
    validator: 'validate-registry-sidecar-convergence',
    registryPath: rel(registryPath),
    upstreamRoot: rel(upstreamRoot),
    checks: [
      {
        id: 'hot-version-index-catalog-convergence',
        passed: blockerCount === 0,
      },
      {
        id: 'rollback-target-and-sidecar-binding',
        passed: analysis.summary.rollbackTargetMismatch === 0 && analysis.summary.sidecarCanonicalMismatch === 0,
      },
    ],
    findings: analysis.findings,
    summary: analysis.summary,
    passed: blockerCount === 0,
    blockerCount,
    warningCount,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = await buildReport();
  if (args.report) {
    const out = path.resolve(args.report);
    writeJson(out, report);
    console.error(`[validate-registry-sidecar-convergence] report=${rel(out)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-registry-sidecar-convergence] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount} warnings=${report.warningCount}`);

  if (args.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[validate-registry-sidecar-convergence] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  analyze,
  buildReport,
};
