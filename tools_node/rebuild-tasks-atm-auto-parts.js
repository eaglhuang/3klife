#!/usr/bin/env node
'use strict';

const path = require('path');
const {
  DEFAULT_MAX_PART_BYTES,
  DEFAULT_MAX_PART_LINES,
  readTasksAtmStore,
  writeTasksAtmStore,
} = require('./lib/tasks-atm-shard-store');

const projectRoot = path.resolve(__dirname, '..');

function main() {
  const state = readTasksAtmStore(projectRoot);
  const result = writeTasksAtmStore(projectRoot, state.tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines: DEFAULT_MAX_PART_LINES,
  });

  console.log(JSON.stringify({
    source: result.paths.indexPath,
    outputDir: result.paths.partsDir,
    itemCount: state.tasks.length,
    partsNeeded: result.parts.length,
    generatedParts: result.parts.length,
    maxPartKB: DEFAULT_MAX_PART_BYTES / 1024,
    maxPartLines: DEFAULT_MAX_PART_LINES,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`[rebuild-tasks-atm-auto-parts] ${error.message}`);
  process.exit(1);
}