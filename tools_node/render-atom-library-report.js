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
const defaultRegistryPath = path.join(upstreamRoot, 'atomic-registry.json');
const defaultOutputPath = path.join(projectRoot, 'atomic_workbench', '原子庫列表.md');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registryDocument = readJson(args.registryPath);

  const [
    { createRegistryCatalogRows },
    { createRegistryIndex },
    { formatAtmUrn, normalizeAtmNodeRef }
  ] = await Promise.all([
    import(pathToFileURL(path.join(upstreamRoot, 'packages/core/src/registry/registry-catalog.mjs')).href),
    import(pathToFileURL(path.join(upstreamRoot, 'packages/core/src/registry/registry-index.mjs')).href),
    import(pathToFileURL(path.join(upstreamRoot, 'packages/core/src/registry/urn.mjs')).href)
  ]);

  const catalogRows = createRegistryCatalogRows(registryDocument, {
    repositoryRoot: upstreamRoot,
    specRepositoryRoot: upstreamRoot
  });
  const registryIndex = createRegistryIndex(registryDocument);
  const report = renderAtomLibraryReviewMarkdown({
    registryDocument,
    catalogRows,
    registryIndex,
    formatAtmUrn,
    normalizeAtmNodeRef,
    renderTimestamp: new Date().toISOString(),
    sourceRegistryPath: args.registryPath,
    sourceRegistryLabel: toProjectPath(projectRoot, args.registryPath),
    outputPath: args.outputPath
  });

  if (args.dryRun) {
    process.stdout.write(report);
    return;
  }

  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.writeFileSync(args.outputPath, report, 'utf8');
  process.stdout.write(`[render-atom-library-report] wrote ${toProjectPath(projectRoot, args.outputPath)}\n`);
}

function parseArgs(argv) {
  const args = {
    registryPath: defaultRegistryPath,
    outputPath: defaultOutputPath,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--registry' && argv[i + 1]) {
      args.registryPath = path.resolve(projectRoot, argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--output' && argv[i + 1]) {
      args.outputPath = path.resolve(projectRoot, argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function renderAtomLibraryReviewMarkdown(input) {
  const rows = buildReviewRows(input);
  const atoms = rows.filter((row) => row.kind === 'atom');
  const maps = rows.filter((row) => row.kind === 'map');
  const summary = buildSummary(rows, input.registryIndex);

  const lines = [
    '# 原子庫列表（Review）',
    '',
    '> 目的：讓人類快速判斷目前有哪些原子可用、版本路由是否齊全，以及哪一些條目需要進一步追蹤。',
    `> Source of truth: ${linkPath(input.sourceRegistryLabel, input.sourceRegistryPath)}`,
    `> Registry ID: \`${escapeInline(String(input.registryDocument?.registryId || 'registry.atoms'))}\``,
    `> Generated at: \`${escapeInline(input.renderTimestamp)}\``,
    '> 說明：FQID 只在 entry 有版本時顯示；未列版本的條目仍會保留派生 URN 與 trace 區塊，方便 review 與 debug。',
    '',
    '## 快速摘要',
    '',
    '| 指標 | 數量 | 備註 |',
    '| --- | ---: | --- |'
  ];

  for (const item of summary) {
    lines.push(`| ${escapeCell(item.label)} | ${item.count} | ${escapeCell(item.note)} |`);
  }

  lines.push(
    '',
    '## 可用原子',
    '',
    '| atomId | FQID / 派生 URN | logicalName | review summary | review_state | status | specPath | workbenchPath |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  );

  for (const row of atoms) {
    lines.push(renderAtomTableRow(row));
  }

  lines.push(
    '',
    '## 原子地圖',
    '',
    '| mapId | FQID / 派生 URN | review summary | review_state | status | specPath | workbenchPath |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );

  for (const row of maps) {
    lines.push(renderMapTableRow(row));
  }

  lines.push(
    '',
    '## Trace',
    '',
    '> 展開每筆條目可看 resolver input/output、版本索引、index snapshot 與 diagnostics。',
    ''
  );

  for (const row of rows) {
    lines.push(renderDetailsBlock(row));
  }

  return `${lines.join('\n')}\n`;
}

function buildReviewRows(input) {
  const rawEntries = Array.isArray(input.registryDocument?.entries) ? input.registryDocument.entries : [];
  const entriesById = new Map();
  for (const entry of rawEntries) {
    const entryId = resolveEntryId(entry);
    if (entryId) {
      entriesById.set(entryId, entry);
    }
  }

  const indexSummary = {
    entryCount: input.registryIndex.size,
    atomIdIndexSize: input.registryIndex.atomIdIndex.size,
    mapIdIndexSize: input.registryIndex.mapIdIndex.size,
    logicalNameIndexSize: input.registryIndex.logicalNameIndex.size,
    fingerprintIndexSize: input.registryIndex.fingerprintIndex.size,
    versionIndexSize: input.registryIndex.versionIndex.size,
    diagnosticsCount: input.registryIndex.diagnostics.length
  };

  return input.catalogRows.map((row) => {
    const entry = entriesById.get(row.entryId) || {};
    const kind = resolveKind(entry, row.entryId);
    const nodeKind = kind === 'map' ? 'map' : 'atom';
    const version = resolveVersion(entry, input.registryIndex, row.entryId);
    const fqid = version ? `${row.entryId}@${version}` : '—';
    const resolverInput = version
      ? { nodeKind, canonicalId: row.entryId, version }
      : { nodeKind, canonicalId: row.entryId };
    const resolverOutput = input.normalizeAtmNodeRef(resolverInput);
    const versionRecord = input.registryIndex.getVersions(row.entryId);
    const lookupSnapshot = buildLookupSnapshot({
      kind,
      row,
      entry,
      input,
      version,
      versionRecord
    });
    const diagnostics = buildDiagnostics({
      kind,
      entry,
      row,
      version,
      versionRecord,
      indexSummary
    });
    const reviewState = buildReviewState({ kind, entry, version });
    const workbenchPath = resolveWorkbenchPath(entry, row.entryId, kind);
    const specPathAbsolute = resolveAbsoluteUpstreamPath(row.specPath);
    const workbenchPathAbsolute = resolveAbsoluteUpstreamPath(workbenchPath);
    const reviewSummary = row.functionSummary || row.derivedCategory || '—';
    const evidence = normalizeEvidence(entry);

    return {
      kind,
      entryId: row.entryId,
      logicalName: row.logicalName || '—',
      reviewSummary,
      derivedCategory: row.derivedCategory,
      provenance: row.provenance,
      status: row.status || '—',
      specPath: row.specPath || '—',
      specPathAbsolute,
      workbenchPath,
      workbenchPathAbsolute,
      fqid,
      version,
      reviewState,
      resolverInput,
      resolverOutput,
      versionRecord,
      lookupSnapshot,
      diagnostics,
      evidence,
      indexSummary
    };
  });
}

function buildSummary(rows, registryIndex) {
  const atoms = rows.filter((row) => row.kind === 'atom');
  const maps = rows.filter((row) => row.kind === 'map');
  const versionedAtoms = atoms.filter((row) => Boolean(row.version));
  const versionlessAtoms = atoms.filter((row) => !row.version);
  const governedAtoms = atoms.filter((row) => row.status === 'governed');
  const activeAtoms = atoms.filter((row) => row.status === 'active');

  return [
    { label: '總條目', count: rows.length, note: 'registry 內目前可查詢的 entry 總數' },
    { label: '原子', count: atoms.length, note: 'review 主表以原子為主' },
    { label: '原子地圖', count: maps.length, note: '附錄區，不與原子混排' },
    { label: 'governed', count: governedAtoms.length, note: '正式受治理的原子' },
    { label: 'active', count: activeAtoms.length, note: '可直接使用的活動原子' },
    { label: '有版本的原子', count: versionedAtoms.length, note: '可顯示 FQID 的條目' },
    { label: '版本未列入的原子', count: versionlessAtoms.length, note: '仍可 review，但 FQID 以派生 URN 呈現' },
    { label: 'Index diagnostics', count: registryIndex.diagnostics.length, note: 'registryIndex 建立時的診斷數量' }
  ];
}

function renderAtomTableRow(row) {
  return [
    `| \`${escapeCell(row.entryId)}\``,
    `| \`${escapeCell(row.fqid)}\``,
    `| \`${escapeCell(row.logicalName)}\``,
    `| ${escapeCell(row.reviewSummary)}`,
    `| \`${escapeCell(row.reviewState)}\``,
    `| \`${escapeCell(row.status)}\``,
    `| ${linkPath(row.specPath, row.specPathAbsolute)}`,
    `| ${linkPath(row.workbenchPath, row.workbenchPathAbsolute)} |`
  ].join(' ');
}

function renderMapTableRow(row) {
  return [
    `| \`${escapeCell(row.entryId)}\``,
    `| \`${escapeCell(row.fqid)}\``,
    `| ${escapeCell(row.reviewSummary)}`,
    `| \`${escapeCell(row.reviewState)}\``,
    `| \`${escapeCell(row.status)}\``,
    `| ${linkPath(row.specPath, row.specPathAbsolute)}`,
    `| ${linkPath(row.workbenchPath, row.workbenchPathAbsolute)} |`
  ].join(' ');
}

function renderDetailsBlock(row) {
  const summary = `${row.entryId} · ${row.reviewState} · ${row.fqid}`;
  const resolverInput = renderJsonBlock(row.resolverInput);
  const resolverOutput = renderJsonBlock(row.resolverOutput);
  const versionRecord = renderJsonBlock(row.versionRecord);
  const indexSnapshot = renderJsonBlock({
    registryIndex: row.indexSummary,
    lookup: row.lookupSnapshot
  });
  const diagnostics = row.diagnostics.length > 0
    ? row.diagnostics.map((item) => `- ${item}`).join('\n')
    : '- none';
  const evidence = row.evidence.length > 0
    ? row.evidence.map((item) => `- ${renderEvidenceItem(item)}`).join('\n')
    : '- none';

  return [
    `<details>`,
    `<summary>${escapeInline(summary)}</summary>`,
    '',
    `- Kind: \`${escapeInline(row.kind)}\``,
    `- Logical Name: \`${escapeInline(row.logicalName)}\``,
    `- Review Summary: ${escapeInline(row.reviewSummary)}`,
    `- Derived Category: \`${escapeInline(row.derivedCategory)}\``,
    `- Provenance: \`${escapeInline(row.provenance)}\``,
    `- Status: \`${escapeInline(row.status)}\``,
    `- Spec Path: ${linkPath(row.specPath, row.specPathAbsolute)}`,
    `- Workbench Path: ${linkPath(row.workbenchPath, row.workbenchPathAbsolute)}`,
    `- FQID: \`${escapeInline(row.fqid)}\``,
    '',
    `- Resolver input:`,
    resolverInput,
    '',
    `- Resolver output:`,
    resolverOutput,
    '',
    `- Version index:`,
    versionRecord,
    '',
    `- Index snapshot:`,
    indexSnapshot,
    '',
    `- Diagnostics:`,
    diagnostics,
    '',
    `- Evidence:`,
    evidence,
    '',
    `</details>`,
    ''
  ].join('\n');
}

function buildLookupSnapshot({ kind, row, entry, input, _version, versionRecord }) {
  const logicalNameHits = row.logicalName ? input.registryIndex.findByLogicalName(row.logicalName).length : 0;
  const fingerprintValue = resolveFingerprint(entry);
  const fingerprintHits = fingerprintValue ? input.registryIndex.findBySemanticFingerprint(fingerprintValue).length : 0;
  const canonicalHit = input.registryIndex.getByCanonicalId(row.entryId) ? 'hit' : 'miss';

  return {
    canonicalId: canonicalHit,
    logicalName: row.logicalName ? `${logicalNameHits} hit(s)` : 'none',
    fingerprint: fingerprintValue ? `${fingerprintHits} hit(s)` : 'none',
    version: versionRecord.current ? `current=${versionRecord.current}` : 'none',
    kind
  };
}

function buildDiagnostics({ kind, entry, row, version, versionRecord, indexSummary }) {
  const diagnostics = [];
  if (!version) {
    diagnostics.push('FQID 版本欄位未列入 registry，報表僅輸出派生 URN。');
  }
  if (!entry?.status) {
    diagnostics.push('registry entry status missing or blank.');
  }
  if (kind === 'map') {
    diagnostics.push('map 條目獨立成附錄，不與 atom 主表混排。');
  }
  if (versionRecord.current === null && versionRecord.versions.length === 0) {
    diagnostics.push('version index 沒有 current / historical record。');
  }
  if (indexSummary.diagnosticsCount > 0) {
    diagnostics.push(`registryIndex diagnostics count = ${indexSummary.diagnosticsCount}`);
  }
  if (row.provenance === 'unmarked') {
    diagnostics.push('provenance 未標記，建議回頭補 generator witness。');
  }
  return diagnostics;
}

function buildReviewState({ kind, entry, version }) {
  const status = String(entry?.status || '').trim().toLowerCase();
  if (kind === 'map') {
    return version ? '附錄 / 已路由' : '附錄 / 待補版本';
  }
  if (status === 'governed' || status === 'active') {
    return version ? '可用' : '可用（待補 FQID）';
  }
  if (!status) {
    return '待補狀態';
  }
  return status;
}

function resolveKind(entry, entryId) {
  if (entry?.schemaId === 'atm.atomicMap' || String(entry?.mapId || entryId).startsWith('ATM-MAP-')) {
    return 'map';
  }
  return 'atom';
}

function resolveVersion(entry, registryIndex, entryId) {
  return String(entry?.atomVersion || entry?.mapVersion || entry?.currentVersion || registryIndex.getVersions(entryId).current || '').trim() || null;
}

function resolveWorkbenchPath(entry, entryId, kind) {
  const explicit = String(entry?.location?.workbenchPath || '').trim();
  if (explicit) {
    return explicit;
  }
  return kind === 'map'
    ? `atomic_workbench/maps/${entryId}`
    : `atomic_workbench/atoms/${entryId}`;
}

function resolveEntryId(entry) {
  return String(entry?.atomId || entry?.mapId || entry?.id || '').trim();
}

function resolveFingerprint(entry) {
  const value = entry?.semanticFingerprint ?? entry?.mapSemanticFingerprint ?? null;
  return value ? String(value).trim() : '';
}

function normalizeEvidence(entry) {
  const evidence = [];
  if (Array.isArray(entry?.evidence)) {
    evidence.push(...entry.evidence.filter(Boolean).map((value) => String(value).trim()).filter(Boolean));
  }
  if (entry?.selfVerification?.sourcePaths?.spec) {
    evidence.push(`spec:${entry.selfVerification.sourcePaths.spec}`);
  }
  if (Array.isArray(entry?.selfVerification?.sourcePaths?.code)) {
    for (const codePath of entry.selfVerification.sourcePaths.code) {
      evidence.push(`code:${String(codePath).trim()}`);
    }
  }
  if (Array.isArray(entry?.selfVerification?.sourcePaths?.tests)) {
    for (const testPath of entry.selfVerification.sourcePaths.tests) {
      evidence.push(`test:${String(testPath).trim()}`);
    }
  }
  if (entry?.location?.reportPath) {
    evidence.push(`report:${String(entry.location.reportPath).trim()}`);
  }
  if (entry?.location?.workbenchPath) {
    evidence.push(`workbench:${String(entry.location.workbenchPath).trim()}`);
  }
  return Array.from(new Set(evidence));
}

function renderEvidenceItem(item) {
  const text = String(item || '').trim();
  if (!text) {
    return '`—`';
  }
  const prefixedPath = text.match(/^(spec|code|test|report|workbench):(.*)$/);
  if (prefixedPath) {
    const prefix = prefixedPath[1];
    const value = prefixedPath[2].trim();
    if (value) {
      return `${prefix}: ${linkPath(value, resolveEvidencePath(value))}`;
    }
  }
  if (looksLikePath(text)) {
    return linkPath(text, resolveEvidencePath(text));
  }
  return `\`${escapeInline(text)}\``;
}

function looksLikePath(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  return text.startsWith('atomic_workbench/')
    || text.startsWith('specs/')
    || text.startsWith('packages/')
    || text.startsWith('scripts/')
    || text.startsWith('.github/')
    || text.startsWith('tests/')
    || text.startsWith('docs/')
    || text.startsWith('tools/')
    || text.startsWith('atomic-registry.json')
    || /^[A-Za-z]:[\\/]/.test(text)
    || text.startsWith('/');
}

function resolveEvidencePath(item) {
  const text = String(item || '').trim();
  if (!looksLikePath(text)) {
    return '';
  }
  if (text.startsWith('atomic_workbench/')) {
    return path.resolve(upstreamRoot, text);
  }
  if (text.startsWith('specs/')
    || text.startsWith('packages/')
    || text.startsWith('scripts/')
    || text.startsWith('.github/')
    || text.startsWith('tests/')
    || text.startsWith('docs/')
    || text.startsWith('tools/')
    || text.startsWith('atomic-registry.json')) {
    return path.resolve(upstreamRoot, text);
  }
  return path.isAbsolute(text) ? path.normalize(text) : path.resolve(projectRoot, text);
}

function resolveAbsoluteUpstreamPath(relativePath) {
  const text = String(relativePath || '').trim();
  if (!text) {
    return '';
  }
  return path.isAbsolute(text) ? path.normalize(text) : path.resolve(upstreamRoot, text);
}

function renderJsonBlock(value) {
  const text = JSON.stringify(value, null, 2);
  return ['```json', text, '```'].join('\n');
}

function escapeInline(value) {
  return String(value ?? '')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function escapeCell(value) {
  return escapeInline(value).replace(/\s+/g, ' ').trim();
}

function linkPath(displayText, absolutePath) {
  const display = escapeInline(displayText || '—');
  const target = String(absolutePath || '').trim().replace(/\\/g, '/');
  if (!target) {
    return `\`${display}\``;
  }
  return `[${display}](<${target}>)`;
}

function toProjectPath(repositoryRoot, filePath) {
  const relative = path.relative(repositoryRoot, filePath).replace(/\\/g, '/');
  if (!relative || relative.startsWith('..')) {
    return filePath.replace(/\\/g, '/');
  }
  return relative;
}

main().catch((error) => {
  process.stderr.write(`[render-atom-library-report] ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
