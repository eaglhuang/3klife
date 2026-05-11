#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const UPSTREAM_ROOT = path.resolve(process.env.ATM_UPSTREAM_REPO_ROOT || path.join(ROOT, '..', 'AI-Atomic-Framework'));
const LOCAL_WORKBENCH_ROOT = path.resolve(process.env.ATM_LOCAL_WORKBENCH_ROOT || path.join(ROOT, 'atomic_workbench'));
const LOCAL_REGISTRY_PATH = path.join(ROOT, 'atomic-registry.json');
const LOCAL_LIBRARY_MD = path.join(LOCAL_WORKBENCH_ROOT, '原子庫列表.md');
const MIGRATION_REPORT_PATH = path.join(LOCAL_WORKBENCH_ROOT, 'migration', 'h2u-adopter-localization.json');

const ATOM_IDS = ['ATM-CORE-0005', 'ATM-CORE-0006', 'ATM-CORE-0007'];
const MAP_IDS = ['ATM-MAP-0003'];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    upstreamRoot: UPSTREAM_ROOT,
    localWorkbenchRoot: LOCAL_WORKBENCH_ROOT,
    localRegistryPath: LOCAL_REGISTRY_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--upstream-root') {
      args.upstreamRoot = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--workbench-root') {
      args.localWorkbenchRoot = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--registry') {
      args.localRegistryPath = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function copyDir(src, dest, options = {}) {
  if (!fs.existsSync(src)) {
    throw new Error(`missing source directory: ${src}`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, destPath, options);
      continue;
    }
    if (options.skipReports && /\.test\.report\.json$/i.test(entry.name)) {
      continue;
    }
    fs.copyFileSync(sourcePath, destPath);
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`missing source file: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function toRootRelative(filePath) {
  return normalizeSlashes(path.relative(ROOT, path.resolve(filePath)));
}

function rewritePath(value, upstreamRoot) {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = normalizeSlashes(value);
  const upstreamPrefix = normalizeSlashes(upstreamRoot);
  if (normalized.startsWith(upstreamPrefix)) {
    return normalizeSlashes(path.join(ROOT, path.relative(upstreamRoot, value)));
  }
  return normalized;
}

function mapEvidencePath(value, upstreamRoot) {
  const text = String(value || '');
  const prefixMatch = text.match(/^(spec|code|test|report|workbench):(.*)$/);
  if (prefixMatch) {
    return `${prefixMatch[1]}:${rewritePath(prefixMatch[2].trim(), upstreamRoot)}`;
  }
  return rewritePath(text, upstreamRoot);
}

function rewriteEntry(entry, upstreamRoot) {
  const out = JSON.parse(JSON.stringify(entry));
  const entryId = out.atomId || out.mapId || out.id;
  out.owner = {
    name: '3KLife H2U adopter',
    contact: 'project-local',
  };
  out.projectOwnership = {
    ownerRepo: '3KLife',
    storageTier: 'adopter-local',
    migratedFrom: 'AI-Atomic-Framework',
    upstreamRole: 'tooling-and-schema-only',
  };
  if (out.location) {
    for (const key of ['specPath', 'reportPath', 'workbenchPath']) {
      if (out.location[key]) out.location[key] = rewritePath(out.location[key], upstreamRoot);
    }
    for (const key of ['codePaths', 'testPaths']) {
      if (Array.isArray(out.location[key])) {
        out.location[key] = out.location[key].map((item) => rewritePath(item, upstreamRoot));
      }
    }
  }
  if (Array.isArray(out.evidence)) {
    out.evidence = out.evidence.map((item) => mapEvidencePath(item, upstreamRoot));
  }
  if (out.selfVerification && out.selfVerification.sourcePaths) {
    const sourcePaths = out.selfVerification.sourcePaths;
    if (sourcePaths.spec) sourcePaths.spec = rewritePath(sourcePaths.spec, upstreamRoot);
    if (Array.isArray(sourcePaths.code)) sourcePaths.code = sourcePaths.code.map((item) => rewritePath(item, upstreamRoot));
    if (Array.isArray(sourcePaths.tests)) sourcePaths.tests = sourcePaths.tests.map((item) => rewritePath(item, upstreamRoot));
  }
  out.adopterLocalCanonical = true;
  out.migration = Object.assign({}, out.migration || {}, {
    strategy: 'adopter-localization',
    notes: `${entryId} is canonical in 3KLife atomic_workbench; upstream remains tooling/schema only.`,
  });
  return out;
}

function buildLocalRegistry(upstreamRegistry, upstreamRoot) {
  const selectedIds = new Set([...ATOM_IDS, ...MAP_IDS]);
  const entries = (Array.isArray(upstreamRegistry.entries) ? upstreamRegistry.entries : [])
    .filter((entry) => selectedIds.has(entry.atomId || entry.mapId || entry.id))
    .map((entry) => rewriteEntry(entry, upstreamRoot));
  const foundIds = new Set(entries.map((entry) => entry.atomId || entry.mapId || entry.id));
  const missing = [...selectedIds].filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error(`missing upstream registry entries: ${missing.join(', ')}`);
  }
  return {
    schemaId: 'atm.registry',
    specVersion: upstreamRegistry.specVersion || '0.1.0',
    registryId: '3klife.h2u.local',
    generatedAt: new Date().toISOString(),
    role: 'adopter-local-workbench',
    upstreamRegistryRef: normalizeSlashes(path.join(upstreamRoot, 'atomic-registry.json')),
    notes: [
      '3KLife owns project-derived H2U atoms locally.',
      'AI-Atomic-Framework supplies neutral schemas, validators, runners, and examples only.',
    ],
    entries,
  };
}

function renderLibraryMarkdown(registry, registryPath) {
  const lines = [
    '<!-- generated by tools_node/materialize-h2u-local-atomic-workbench.js -->',
    '# 3KLife Local Atomic Workbench',
    '',
    `> Source of truth: ${toRootRelative(registryPath)}`,
    `> Registry ID: \`${registry.registryId}\``,
    `> Generated at: \`${registry.generatedAt}\``,
    '',
    'This workbench is the canonical adopter-local home for H2U project atoms.',
    'AI-Atomic-Framework remains the neutral upstream core and no longer owns these project-derived artifacts.',
    '',
    '## Entries',
    '',
    '| id | logicalName | kind | status | specPath | workbenchPath |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const entry of registry.entries) {
    const id = entry.atomId || entry.mapId || entry.id;
    const kind = entry.mapId ? 'map' : 'atom';
    const logicalName = entry.logicalName || entry.qualityTargets?.pilotName || '';
    lines.push(`| \`${id}\` | \`${logicalName}\` | \`${kind}\` | \`${entry.status || 'draft'}\` | \`${entry.location?.specPath || ''}\` | \`${entry.location?.workbenchPath || ''}\` |`);
  }
  lines.push(
    '',
    '## Migration Policy',
    '',
    '- Keep existing atomId/mapId values during localization.',
    '- Store project lineage such as `legacy://3KLife/...` only in this project-local workbench.',
    '- Do not add project-derived H2U atoms back into the upstream core registry.',
    ''
  );
  return `${lines.join('\n')}\n`;
}

function materialize(args) {
  const upstreamRoot = path.resolve(args.upstreamRoot);
  const upstreamRegistryPath = path.join(upstreamRoot, 'atomic-registry.json');
  const upstreamRegistry = readJson(upstreamRegistryPath);
  const localRegistry = buildLocalRegistry(upstreamRegistry, upstreamRoot);
  const localWorkbenchRoot = path.resolve(args.localWorkbenchRoot);
  const copied = [];

  for (const atomId of ATOM_IDS) {
    const source = path.join(upstreamRoot, 'atomic_workbench', 'atoms', atomId);
    const dest = path.join(localWorkbenchRoot, 'atoms', atomId);
    copied.push({ kind: 'atom', id: atomId, source: normalizeSlashes(source), dest: normalizeSlashes(dest) });
    if (!args.dryRun) copyDir(source, dest, { skipReports: true });
  }

  for (const mapId of MAP_IDS) {
    const source = path.join(upstreamRoot, 'atomic_workbench', 'maps', mapId);
    const dest = path.join(localWorkbenchRoot, 'maps', mapId);
    copied.push({ kind: 'map', id: mapId, source: normalizeSlashes(source), dest: normalizeSlashes(dest) });
    if (!args.dryRun) copyDir(source, dest);
  }

  const specs = [
    'normalize-css-color.atom.json',
    'parse-css-length.atom.json',
    'parse-fragment-list.atom.json',
  ];
  for (const spec of specs) {
    const source = path.join(upstreamRoot, 'specs', spec);
    const dest = path.join(ROOT, 'specs', spec);
    copied.push({ kind: 'spec', id: spec, source: normalizeSlashes(source), dest: normalizeSlashes(dest) });
    if (!args.dryRun) copyFile(source, dest);
  }

  const report = {
    schemaId: 'atm.adopterLocalizationReport',
    generatedAt: new Date().toISOString(),
    upstreamRoot: normalizeSlashes(upstreamRoot),
    localWorkbenchRoot: normalizeSlashes(localWorkbenchRoot),
    localRegistryPath: normalizeSlashes(args.localRegistryPath),
    copied,
    registryEntryCount: localRegistry.entries.length,
  };

  if (!args.dryRun) {
    writeJson(args.localRegistryPath, localRegistry);
    writeText(LOCAL_LIBRARY_MD, renderLibraryMarkdown(localRegistry, args.localRegistryPath));
    writeJson(MIGRATION_REPORT_PATH, report);
  }

  return { report, registry: localRegistry };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { report } = materialize(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[materialize-h2u-local-atomic-workbench] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  materialize,
  buildLocalRegistry,
  renderLibraryMarkdown,
};
