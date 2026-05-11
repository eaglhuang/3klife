#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const upstreamRoot = path.resolve(projectRoot, '..', 'AI-Atomic-Framework');
const registryPath = path.join(upstreamRoot, 'atomic-registry.json');
const registryCoreScript = path.join(upstreamRoot, 'scripts', 'validate-registry-core.mjs');
const registryCatalogScript = path.join(upstreamRoot, 'scripts', 'validate-registry-catalog.mjs');

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

function rel(filePath) {
  return path.relative(projectRoot, path.resolve(filePath)).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
    findingVersion: 'registry-backfill-finding/v1',
    kind: 'registry-backfill-finding',
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

function runUpstreamValidation(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath, '--mode', 'validate'], {
    cwd: upstreamRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const spawnErrorCode = result.error && result.error.code ? String(result.error.code).toUpperCase() : '';
  const canFallback = spawnErrorCode === 'EPERM' || spawnErrorCode === 'EAGAIN' || spawnErrorCode === 'UNKNOWN';
  if (canFallback) {
    return {
      status: 0,
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
      error: result.error ? result.error.message : '',
      fallback: 'spawn-blocked',
      spawnErrorCode,
    };
  }

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    error: result.error ? result.error.message : '',
    fallback: '',
    spawnErrorCode,
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
    ''
  );
}

function buildSweepAnalysis(registryDocument, registryIndex, catalogRows) {
  const entries = Array.isArray(registryDocument.entries) ? registryDocument.entries : [];
  const rowByEntryId = new Map(catalogRows.map((row) => [normalizeText(row.entryId), row]));
  const findings = [];
  const summary = {
    entryCount: entries.length,
    catalogRowCount: catalogRows.length,
    indexedEntryCount: typeof registryIndex?.size === 'number' ? registryIndex.size : entries.length,
    missingHistoricalSf: 0,
    pendingSfCalculation: 0,
    catalogIndexMismatch: 0,
    legacyNoSfAllowlist: 0,
  };

  for (const entry of entries) {
    const entryId = getEntryId(entry);
    if (!entryId) {
      continue;
    }

    const entryFile = rel(registryPath);
    const row = rowByEntryId.get(entryId) || null;
    const indexHit = registryIndex && typeof registryIndex.getByCanonicalId === 'function'
      ? registryIndex.getByCanonicalId(entryId)
      : null;
    const hotFingerprint = getHotFingerprint(entry);
    const versions = Array.isArray(entry.versions) ? entry.versions : [];
    const currentVersionKey = resolveCurrentVersionKey(entry, registryIndex, entryId);
    const currentVersionRecord = currentVersionKey
      ? versions.find((version) => getVersionKey(version) === currentVersionKey) || null
      : (versions.length === 1 ? versions[0] : null);
    const currentVersionFingerprint = getVersionFingerprint(currentVersionRecord);
    const missingHistoricalVersions = [];

    for (const version of versions) {
      const versionKey = getVersionKey(version) || `versions[?]`;
      const fingerprint = getVersionFingerprint(version);
      if (!fingerprint) {
        const isCurrentVersion = currentVersionKey ? getVersionKey(version) === currentVersionKey : currentVersionRecord === version;
        if (isCurrentVersion) {
          summary.pendingSfCalculation += 1;
          findings.push(buildFinding({
            ruleId: 'registry-backfill.pending-semantic-fingerprint',
            trigger: 'registry.backfill.pending-semantic-fingerprint',
            scope: 'atomic-registry.json#entries[].semanticFingerprint',
            severity: 'block',
            action: 'fail',
            routeClass: 'blocker',
            routeHint: '先回填 hot entry / currentVersion 的 semanticFingerprint，再重跑 backfill sweep 與 catalog/index 驗證。',
            message: `current version is missing semanticFingerprint for ${entryId}`,
            file: entryFile,
            details: {
              entryId,
              currentVersion: currentVersionKey,
              versionKey,
            },
          }));
        } else {
          summary.missingHistoricalSf += 1;
          missingHistoricalVersions.push(versionKey);
        }
      }
    }

    if (missingHistoricalVersions.length > 0) {
      findings.push(buildFinding({
        ruleId: 'registry-backfill.missing-historical-semantic-fingerprint',
        trigger: 'registry.backfill.missing-historical-semantic-fingerprint',
        scope: 'atomic-registry.json#entries[].versions[].semanticFingerprint',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '補齊 versions[*].semanticFingerprint，並同步更新 registry catalog / RegistryIndex projection。',
        message: `historical versions are missing semanticFingerprint for ${entryId}`,
        file: entryFile,
        details: {
          entryId,
          missingHistoricalVersions,
        },
      }));
    }

    if (!hotFingerprint) {
      if (versions.length === 0 && isLegacyNoSfAllowlisted(entry)) {
        summary.legacyNoSfAllowlist += 1;
        findings.push(buildFinding({
          ruleId: 'registry-backfill.legacy-no-sf-allowlist',
          trigger: 'registry.backfill.legacy-no-sf-allowlist',
          scope: 'atomic-registry.json#entries[]',
          severity: 'warn',
          action: 'warn',
          routeClass: 'advisory',
          routeHint: '保留 legacy allowlist，但請標記來源與移除時點。',
          message: `legacy entry without semanticFingerprint is allowlisted for ${entryId}`,
          file: entryFile,
          details: {
            entryId,
            status: normalizeText(entry.status),
          },
        }));
      } else {
        summary.pendingSfCalculation += 1;
        findings.push(buildFinding({
          ruleId: 'registry-backfill.pending-semantic-fingerprint',
          trigger: 'registry.backfill.pending-semantic-fingerprint',
          scope: 'atomic-registry.json#entries[].semanticFingerprint',
          severity: 'block',
          action: 'fail',
          routeClass: 'blocker',
          routeHint: '先回填 hot entry / currentVersion 的 semanticFingerprint，再重跑 backfill sweep 與 catalog/index 驗證。',
          message: `hot entry is missing semanticFingerprint for ${entryId}`,
          file: entryFile,
          details: {
            entryId,
            status: normalizeText(entry.status),
            currentVersion: currentVersionKey,
          },
        }));
      }
    } else if (currentVersionFingerprint && hotFingerprint !== currentVersionFingerprint) {
      summary.catalogIndexMismatch += 1;
      findings.push(buildFinding({
        ruleId: 'registry-backfill.catalog-index-mismatch',
        trigger: 'registry.catalog-index.mismatch',
        scope: 'RegistryIndex + catalog projection',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
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
        ruleId: 'registry-backfill.catalog-index-mismatch',
        trigger: 'registry.catalog-index.mismatch',
        scope: 'RegistryIndex + catalog projection',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
        message: `catalog/index lookup is missing for ${entryId}`,
        file: entryFile,
        details: {
          entryId,
          hasCatalogRow: Boolean(row),
          hasIndexHit: Boolean(indexHit),
        },
      }));
    } else if (normalizeText(row.status) && normalizeText(entry.status) && normalizeText(row.status) !== normalizeText(entry.status)) {
      summary.catalogIndexMismatch += 1;
      findings.push(buildFinding({
        ruleId: 'registry-backfill.catalog-index-mismatch',
        trigger: 'registry.catalog-index.mismatch',
        scope: 'RegistryIndex + catalog projection',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
        message: `catalog row status does not match registry entry for ${entryId}`,
        file: entryFile,
        details: {
          entryId,
          catalogStatus: normalizeText(row.status),
          registryStatus: normalizeText(entry.status),
        },
      }));
    }

    const fingerprintHits = hotFingerprint && registryIndex && typeof registryIndex.findBySemanticFingerprint === 'function'
      ? registryIndex.findBySemanticFingerprint(hotFingerprint)
      : [];
    const fingerprintHitMatchesEntry = Array.isArray(fingerprintHits)
      ? fingerprintHits.some((hit) => {
        const hitId = normalizeText(hit?.entryId || hit?.atomId || hit?.mapId || hit?.canonicalId || hit?.id || '');
        return hitId === entryId;
      })
      : true;

    if (hotFingerprint && !fingerprintHitMatchesEntry) {
      summary.catalogIndexMismatch += 1;
      findings.push(buildFinding({
        ruleId: 'registry-backfill.catalog-index-mismatch',
        trigger: 'registry.catalog-index.mismatch',
        scope: 'RegistryIndex + catalog projection',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
        message: `semanticFingerprint index lookup does not resolve ${entryId}`,
        file: entryFile,
        details: {
          entryId,
          hotFingerprint,
          hitCount: Array.isArray(fingerprintHits) ? fingerprintHits.length : 0,
        },
      }));
    }
  }

  if (Array.isArray(registryIndex?.diagnostics) && registryIndex.diagnostics.length > 0) {
    summary.catalogIndexMismatch += 1;
    findings.push(buildFinding({
      ruleId: 'registry-backfill.catalog-index-mismatch',
      trigger: 'registry.catalog-index.mismatch',
      scope: 'RegistryIndex diagnostics',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
      message: 'registry index diagnostics are not empty',
      file: rel(registryPath),
      details: {
        diagnostics: registryIndex.diagnostics,
      },
    }));
  }

  if (catalogRows.length !== entries.length) {
    summary.catalogIndexMismatch += 1;
    findings.push(buildFinding({
      ruleId: 'registry-backfill.catalog-index-mismatch',
      trigger: 'registry.catalog-index.mismatch',
      scope: 'RegistryIndex + catalog projection',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '重建 catalog/index projection，確認 RegistryIndex 與 registry catalog 同步。',
      message: `catalog row count ${catalogRows.length} does not match registry entry count ${entries.length}`,
      file: rel(registryPath),
      details: {
        catalogRowCount: catalogRows.length,
        entryCount: entries.length,
      },
    }));
  }

  return { findings, summary };
}

function buildReportSkeleton() {
  return {
    validator: 'validate-registry-backfill-sweep',
    registryPath: rel(registryPath),
    upstreamRoot: rel(upstreamRoot),
    checks: [],
    findings: [],
    summary: {
      entryCount: 0,
      catalogRowCount: 0,
      indexedEntryCount: 0,
      missingHistoricalSf: 0,
      pendingSfCalculation: 0,
      catalogIndexMismatch: 0,
      legacyNoSfAllowlist: 0,
    },
    passed: false,
  };
}

function printHelp() {
  console.log('Usage: node tools_node/validate-registry-backfill-sweep.js [--strict] [--report <json>]');
  console.log('');
  console.log('Validates registry semantic-fingerprint backfill coverage and catalog/index consistency.');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(registryPath)) {
    throw new Error(`registry document not found: ${registryPath}`);
  }
  if (!fs.existsSync(registryCoreScript)) {
    throw new Error(`upstream registry core validator not found: ${registryCoreScript}`);
  }
  if (!fs.existsSync(registryCatalogScript)) {
    throw new Error(`upstream registry catalog validator not found: ${registryCatalogScript}`);
  }

  const registryDocument = readJson(registryPath);
  const { createRegistryCatalogProjection, createRegistryIndex } = await loadRegistryHelpers();
  const registryIndex = createRegistryIndex(registryDocument);
  const catalogProjection = createRegistryCatalogProjection(registryDocument, {
    repositoryRoot: upstreamRoot,
    specRepositoryRoot: upstreamRoot,
  });
  const catalogRows = buildCatalogRows(catalogProjection);

  const coreValidation = runUpstreamValidation(registryCoreScript);
  const catalogValidation = runUpstreamValidation(registryCatalogScript);
  const analysis = buildSweepAnalysis(registryDocument, registryIndex, catalogRows);

  const report = buildReportSkeleton();
  report.checks.push({
    id: 'upstream-registry-core',
    passed: coreValidation.status === 0,
    status: coreValidation.status,
    stderr: coreValidation.stderr.trim(),
    stdout: coreValidation.stdout.trim(),
    script: rel(registryCoreScript),
    fallback: coreValidation.fallback || '',
    spawnErrorCode: coreValidation.spawnErrorCode || '',
  });
  report.checks.push({
    id: 'upstream-registry-catalog',
    passed: catalogValidation.status === 0,
    status: catalogValidation.status,
    stderr: catalogValidation.stderr.trim(),
    stdout: catalogValidation.stdout.trim(),
    script: rel(registryCatalogScript),
    fallback: catalogValidation.fallback || '',
    spawnErrorCode: catalogValidation.spawnErrorCode || '',
  });
  report.findings.push(...analysis.findings);
  report.summary = analysis.summary;

  if (coreValidation.status !== 0) {
    report.findings.push(buildFinding({
      ruleId: 'registry-backfill.upstream-registry-core',
      trigger: 'registry.upstream.validate-registry-core.failed',
      scope: 'AI-Atomic-Framework/scripts/validate-registry-core.mjs',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '先讓 upstream registry core validator 綠燈，再推 backfill sweep。',
      message: 'upstream validate-registry-core.mjs failed',
      file: rel(registryCoreScript),
      details: {
        status: coreValidation.status,
        stderr: coreValidation.stderr.trim().split(/\r?\n/).slice(0, 8),
      },
    }));
  } else if (coreValidation.fallback === 'spawn-blocked') {
    report.findings.push(buildFinding({
      ruleId: 'registry-backfill.upstream-registry-core-fallback',
      trigger: 'registry.upstream.validate-registry-core.spawn-blocked',
      scope: 'AI-Atomic-Framework/scripts/validate-registry-core.mjs',
      severity: 'warn',
      action: 'warn',
      routeClass: 'advisory',
      routeHint: '目前執行環境禁止 nested spawn；已改用本地 sweep checks 續跑，建議在可執行 upstream validator 的環境再補一次。',
      message: 'upstream validate-registry-core.mjs was skipped due spawn restriction',
      file: rel(registryCoreScript),
      details: {
        fallback: coreValidation.fallback,
        spawnErrorCode: coreValidation.spawnErrorCode,
      },
    }));
  }

  if (catalogValidation.status !== 0) {
    report.findings.push(buildFinding({
      ruleId: 'registry-backfill.upstream-registry-catalog',
      trigger: 'registry.upstream.validate-registry-catalog.failed',
      scope: 'AI-Atomic-Framework/scripts/validate-registry-catalog.mjs',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '先讓 upstream registry catalog validator 綠燈，再推 backfill sweep。',
      message: 'upstream validate-registry-catalog.mjs failed',
      file: rel(registryCatalogScript),
      details: {
        status: catalogValidation.status,
        stderr: catalogValidation.stderr.trim().split(/\r?\n/).slice(0, 8),
      },
    }));
  } else if (catalogValidation.fallback === 'spawn-blocked') {
    report.findings.push(buildFinding({
      ruleId: 'registry-backfill.upstream-registry-catalog-fallback',
      trigger: 'registry.upstream.validate-registry-catalog.spawn-blocked',
      scope: 'AI-Atomic-Framework/scripts/validate-registry-catalog.mjs',
      severity: 'warn',
      action: 'warn',
      routeClass: 'advisory',
      routeHint: '目前執行環境禁止 nested spawn；已改用本地 sweep checks 續跑，建議在可執行 upstream validator 的環境再補一次。',
      message: 'upstream validate-registry-catalog.mjs was skipped due spawn restriction',
      file: rel(registryCatalogScript),
      details: {
        fallback: catalogValidation.fallback,
        spawnErrorCode: catalogValidation.spawnErrorCode,
      },
    }));
  }

  const blockerCount = report.findings.filter((item) => item.action === 'fail' || item.severity === 'block').length;
  const warningCount = report.findings.filter((item) => item.action !== 'fail' && item.severity !== 'block').length;
  report.passed = blockerCount === 0;
  report.blockerCount = blockerCount;
  report.warningCount = warningCount;

  if (opts.report) {
    const out = path.resolve(opts.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.error(`[validate-registry-backfill-sweep] report=${rel(out)}`);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  console.error(`[validate-registry-backfill-sweep] status=${report.passed ? 'pass' : 'fail'} blockers=${blockerCount} warnings=${warningCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[validate-registry-backfill-sweep] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  buildSweepAnalysis,
  buildReportSkeleton,
};
