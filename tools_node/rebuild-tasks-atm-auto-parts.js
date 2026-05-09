#!/usr/bin/env node
'use strict';

const path = require('path');
const { runTaskStoreTruthPipeline } = require('./sync-atm-stabilization-milestone');

const projectRoot = path.resolve(__dirname, '..');

function main() {
  const pipeline = runTaskStoreTruthPipeline(projectRoot, {
    check: false,
    verifyAfterSync: true,
  });
  const report = pipeline.report;

  console.log(JSON.stringify({
    source: report.paths.indexPath,
    milestone: report.paths.milestonePath,
    outputDir: report.paths.partsDir,
    itemCount: report.summary.total,
    done: report.summary.done,
    inProgress: report.summary.in_progress,
    open: report.summary.open,
    changedFiles: report.changedFiles,
    postSyncCheckPassed: report.postSyncCheck ? report.postSyncCheck.passed : true,
  }, null, 2));

  if (!report.passed) {
    throw new Error('post-sync strict verification failed');
  }
}

try {
  main();
} catch (error) {
  console.error(`[rebuild-tasks-atm-auto-parts] ${error.message}`);
  process.exit(1);
}
