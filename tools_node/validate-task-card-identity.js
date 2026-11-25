#!/usr/bin/env node
'use strict';

/**
 * Usage: node tools_node/validate-task-card-identity.js [--base <ref>]
 * Fails when a change turns an existing task card or task-store entry into
 * different work (see tools_node/lib/task-card-identity-guard.js).
 */

const path = require('path');
const { checkTaskCardIdentity } = require('./lib/task-card-identity-guard');

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const baseRef = baseIndex >= 0 && args[baseIndex + 1] ? args[baseIndex + 1] : 'origin/master';
const root = path.resolve(__dirname, '..');

const result = checkTaskCardIdentity(root, baseRef);
if (result.ok) {
  console.log(`[task-card-identity] ok (compared with ${result.compareRef})`);
  process.exit(0);
}
console.error(`[task-card-identity] ${result.errors.length} identity violation(s) (compared with ${result.compareRef}):`);
for (const error of result.errors) console.error(`  - ${error}`);
process.exit(1);
