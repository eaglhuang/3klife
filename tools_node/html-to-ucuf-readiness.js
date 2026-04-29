#!/usr/bin/env node
// HTML-to-UCUF 95% readiness gate.
'use strict';

const fs = require('fs');
const path = require('path');
const { buildReadinessReport } = require('./lib/dom-to-ui/readiness-gate');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = { screenId: null, output: null, failOnBlocker: false, paths: {} };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--screen-id': opts.screenId = next(); break;
      case '--output': opts.output = next(); break;
      case '--fail-on-blocker': opts.failOnBlocker = true; break;
      case '--layout': opts.paths.layout = next(); break;
      case '--skin': opts.paths.skin = next(); break;
      case '--screen': opts.paths.screen = next(); break;
      case '--capture-protocol': opts.paths.captureProtocol = next(); break;
      case '--zone-ownership': opts.paths.zoneOwnership = next(); break;
      case '--tab-routing': opts.paths.tabRouting = next(); break;
      case '--preload': opts.paths.preload = next(); break;
      case '--performance': opts.paths.performance = next(); break;
      case '--bake-manifest': opts.paths.bakeManifest = next(); break;
      case '--art-authority-waivers': opts.paths.artAuthorityWaivers = next(); break;
      case '--final-verdict': opts.paths.finalVerdict = next(); break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`[html-to-ucuf-readiness] unknown arg: ${token}`);
        process.exit(2);
    }
  }
  if (!opts.screenId) {
    printHelp();
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/html-to-ucuf-readiness.js --screen-id <id> [--output <json>] [sidecar overrides]

Reads layout/skin/screen sidecars and reports bounded remaining work toward the 95% HTML source vs Cocos Editor gate.`);
}

function main() {
  const opts = parseArgs(process.argv);
  const report = buildReadinessReport({ repoRoot: ROOT, screenId: opts.screenId, paths: opts.paths });
  const text = JSON.stringify(report, null, 2) + '\n';
  if (opts.output) {
    const out = path.resolve(opts.output);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text, 'utf8');
    console.log(`[html-to-ucuf-readiness] wrote ${rel(out)}`);
  } else {
    process.stdout.write(text);
  }
  console.log(`[html-to-ucuf-readiness] verdict=${report.verdict} readinessScore=${report.readinessScore} actionUnits=${report.summary.actionUnits} blockers=${report.summary.blockerUnits}`);
  console.log(`[html-to-ucuf-readiness] next=${report.summary.nextCriticalAction}`);
  if (opts.failOnBlocker && report.summary.blockerUnits > 0) process.exit(12);
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(`[html-to-ucuf-readiness] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = { parseArgs };