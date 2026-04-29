#!/usr/bin/env node
// doc_id: doc_other_0009 — extract a collapsed UCUF subtree into lazy fragments
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const opts = {
    layout: null,
    node: null,
    uiSpecRoot: null,
    collapsedFragment: null,
    openFragment: null,
    defaultMode: 'collapsed',
    warmupHint: 'manual',
    dryRun: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--layout': opts.layout = next(); break;
      case '--node': opts.node = next(); break;
      case '--ui-spec-root': opts.uiSpecRoot = next(); break;
      case '--collapsed-fragment': opts.collapsedFragment = next(); break;
      case '--open-fragment': opts.openFragment = next(); break;
      case '--default-mode': opts.defaultMode = next(); break;
      case '--warmup-hint': opts.warmupHint = next(); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--force': opts.force = true; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`[extract-ucuf-lazy-fragment] unknown arg: ${arg}`);
        process.exit(2);
    }
  }
  for (const key of ['layout', 'node', 'collapsedFragment', 'openFragment']) {
    if (!opts[key]) {
      console.error(`[extract-ucuf-lazy-fragment] --${toKebab(key)} is required`);
      process.exit(2);
    }
  }
  if (!['collapsed', 'open'].includes(opts.defaultMode)) {
    console.error('[extract-ucuf-lazy-fragment] --default-mode must be collapsed or open');
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/extract-ucuf-lazy-fragment.js \\
  --layout assets/resources/ui-spec/layouts/<screen>.json \\
  --node <NodeName> \\
  --collapsed-fragment fragments/layouts/<screen>-<section>-collapsed \\
  --open-fragment fragments/layouts/<screen>-<section>-open \\
  [--default-mode collapsed|open] [--warmup-hint manual] [--dry-run] [--force]`);
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolveUiSpecRoot(layoutPath, explicitRoot) {
  if (explicitRoot) return path.resolve(explicitRoot);
  const normalized = path.resolve(layoutPath).replace(/\\/g, '/');
  const marker = '/assets/resources/ui-spec/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(0, markerIndex + marker.length - 1);
  }
  return path.resolve('assets/resources/ui-spec');
}

function resolveFragmentPath(uiSpecRoot, fragmentId) {
  const normalized = String(fragmentId).replace(/\\/g, '/').replace(/\.json$/i, '');
  if (!normalized.startsWith('fragments/')) {
    throw new Error(`fragment id must start with fragments/: ${fragmentId}`);
  }
  return path.join(uiSpecRoot, `${normalized}.json`);
}

function findNode(root, nodeName) {
  let found = null;
  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.name === nodeName) {
      found = node;
      return;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }
  walk(root);
  return found;
}

function countNodes(node) {
  if (!node || typeof node !== 'object') return 0;
  return 1 + (Array.isArray(node.children) ? node.children.reduce((sum, child) => sum + countNodes(child), 0) : 0);
}

function cloneJsonValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function buildFragmentRoot(baseNode, fragmentName, children) {
  const root = {
    type: 'container',
    name: fragmentName,
    widget: { top: 0, bottom: 0, left: 0, right: 0 },
    children,
  };
  if (baseNode && baseNode.layout) {
    root.layout = cloneJsonValue(baseNode.layout);
  }
  return root;
}

function buildOpenFragment(node, openName) {
  return buildFragmentRoot(node, openName, Array.isArray(node.children) ? node.children : []);
}

function buildCollapsedFragment(node, collapsedName) {
  return buildFragmentRoot(node, collapsedName, [
      { type: 'spacer', name: `${collapsedName}Anchor`, width: 1, height: 1 },
  ]);
}

function main() {
  const opts = parseArgs(process.argv);
  const layoutPath = path.resolve(opts.layout);
  const uiSpecRoot = resolveUiSpecRoot(layoutPath, opts.uiSpecRoot);
  const collapsedPath = resolveFragmentPath(uiSpecRoot, opts.collapsedFragment);
  const openPath = resolveFragmentPath(uiSpecRoot, opts.openFragment);
  const document = readJson(layoutPath);
  const root = document && document.root ? document.root : document;
  const node = findNode(root, opts.node);
  if (!node) {
    console.error(`[extract-ucuf-lazy-fragment] node not found: ${opts.node}`);
    process.exit(2);
  }
  if (!Array.isArray(node.children) || node.children.length === 0) {
    console.error(`[extract-ucuf-lazy-fragment] node has no children to extract: ${opts.node}`);
    process.exit(2);
  }
  if (!opts.force && !opts.dryRun) {
    for (const outputPath of [collapsedPath, openPath]) {
      if (fs.existsSync(outputPath)) {
        console.error(`[extract-ucuf-lazy-fragment] output exists; pass --force to overwrite: ${outputPath}`);
        process.exit(2);
      }
    }
  }

  const before = countNodes(root);
  const extractedCount = node.children.reduce((sum, child) => sum + countNodes(child), 0);
  const openName = `${opts.node}OpenFragment`;
  const collapsedName = `${opts.node}CollapsedFragment`;
  const openFragment = buildOpenFragment(node, openName);
  const collapsedFragment = buildCollapsedFragment(node, collapsedName);

  node.children = [
    { type: 'spacer', name: `${opts.node}_LazySlotAnchor`, width: 1, height: 1 },
  ];
  delete node.layout;
  node.lazySlot = true;
  node.defaultFragment = opts.defaultMode === 'open' ? opts.openFragment : opts.collapsedFragment;
  node.fragments = opts.defaultMode === 'open'
    ? [opts.collapsedFragment, opts.openFragment]
    : [opts.openFragment];
  node.warmupHint = opts.warmupHint;
  node._deferredFragmentReason = 'collapsed-initial-state';

  const after = countNodes(root);
  const summary = `[extract-ucuf-lazy-fragment] ${opts.node}: extracted ${extractedCount} node(s), layout ${before} -> ${after}`;
  if (opts.dryRun) {
    console.log(`${summary} (dry-run)`);
    console.log(`  collapsed=${collapsedPath}`);
    console.log(`  open=${openPath}`);
    return;
  }

  writeJson(collapsedPath, collapsedFragment);
  writeJson(openPath, openFragment);
  writeJson(layoutPath, document);
  console.log(summary);
  console.log(`  wrote ${path.relative(process.cwd(), collapsedPath)}`);
  console.log(`  wrote ${path.relative(process.cwd(), openPath)}`);
}

if (require.main === module) main();

module.exports = {
  buildCollapsedFragment,
  buildFragmentRoot,
  buildOpenFragment,
  cloneJsonValue,
  countNodes,
  findNode,
  resolveFragmentPath,
};