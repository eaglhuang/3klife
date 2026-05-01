#!/usr/bin/env node
// doc_id: doc_other_0009 - Normalize lazySlot fragment fill-root geometry.
'use strict';

const path = require('path');

const {
  assessReferencedFragmentGeometry,
  normalizeReferencedFragmentFiles,
} = require('./lib/dom-to-ui/fragment-geometry-contract');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = { screenId: null, write: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--screen-id': opts.screenId = next(); break;
      case '--write': opts.write = true; break;
      case '--dry-run': opts.write = false; break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        console.error(`[normalize-ucuf-fragment-geometry] unknown arg: ${token}`);
        process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/normalize-ucuf-fragment-geometry.js --screen-id <id> [--write]

Applies the screen-agnostic lazySlot fragment fill-root contract to every
fragment referenced by layout defaultFragment/fragments and screen tabRouting.`);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.screenId) {
    printHelp();
    process.exit(opts.help ? 0 : 2);
  }

  const result = normalizeReferencedFragmentFiles({
    repoRoot: ROOT,
    screenId: opts.screenId,
    write: opts.write,
  });
  console.log(`[normalize-ucuf-fragment-geometry] screen=${opts.screenId} write=${result.write} normalized=${result.normalizedCount} skipped=${result.skippedCount} failures=${result.failures.length}`);
  for (const item of result.normalized) {
    console.log(`  normalized ${item.path}: ${item.changes.map(change => change.path).join(', ')}`);
  }
  for (const item of result.failures) {
    console.error(`  failure ${item.ref}: ${item.code}${item.message ? ` ${item.message}` : ''}`);
  }

  const uiSpecRoot = path.join(ROOT, 'assets', 'resources', 'ui-spec');
  const assessment = assessReferencedFragmentGeometry({
    repoRoot: ROOT,
    uiSpecRoot,
    screenId: opts.screenId,
  });
  console.log(`[normalize-ucuf-fragment-geometry] postcheck=${assessment.status} ${assessment.summary}`);
  if (assessment.status === 'blocker') process.exit(12);
  if (!result.ok) process.exit(1);
}

if (require.main === module) main();

module.exports = { parseArgs };
