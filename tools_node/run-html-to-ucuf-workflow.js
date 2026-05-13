#!/usr/bin/env node
// doc_id: doc_other_0009 recurring HTML -> UCUF workflow wrapper
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveSourcePackage, writeSourcePackageManifest, writeHtmlWithSourceCss } = require('./lib/html-to-ucuf/source-package');
const { runRuleGuard } = require('./lib/html-to-ucuf/rule-guard');
const {
  buildRuntimeSyncStep,
  buildRuleGuardStep,
  deriveGateSignals,
} = require('./lib/html-to-ucuf/workflow/gate-orchestration');
const { finalizeWorkflowVerdict } = require('./lib/html-to-ucuf/workflow/final-verdict');
const { runWorkflowMain } = require('./lib/html-to-ucuf/workflow/workflow-main');
const { createWorkflowShellContext } = require('./lib/html-to-ucuf/workflow/cli-shell-context');
const {
  normalizeReferencedFragmentFiles,
} = require('./lib/dom-to-ui/fragment-geometry-contract');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    input: null,
    sourceDir: null,
    mainHtml: null,
    screenId: null,
    bundle: null,
    outDir: null,
    browser: null,
    viewport: '1920x1080',
    settleMs: 1500,
    contentContract: null,
    strictCoverage: 0.95,
    strictPixel: 0.95,
    skipCompare: false,
    skipOptimize: false,
    skipAnnotate: false,
    skipEditorCompare: false,
    noValidate: false,
    runtimeSync: true,
    perTabReplay: true,
    updateMode: false,
    updateMergeMode: 'preserve-human',
    noRegressionGuard: true,
    strictReplayGates: false,
    editorScreenshot: null,
    captureProtocol: null,
    captureReport: null,
    artAuthorityWaivers: null,
    evolutionLog: null,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--input': opts.input = next(); break;
      case '--source-dir': opts.sourceDir = next(); break;
      case '--main-html': opts.mainHtml = next(); break;
      case '--screen-id': opts.screenId = next(); break;
      case '--bundle': opts.bundle = next(); break;
      case '--out-dir': opts.outDir = next(); break;
      case '--browser': opts.browser = next(); break;
      case '--viewport': opts.viewport = next(); break;
      case '--settle-ms': opts.settleMs = parseInt(next(), 10) || 1500; break;
      case '--content-contract': opts.contentContract = next(); break;
      case '--strict-coverage': opts.strictCoverage = parseFloat(next()); break;
      case '--strict-pixel': opts.strictPixel = parseFloat(next()); break;
      case '--skip-compare': opts.skipCompare = true; break;
      case '--skip-optimize': opts.skipOptimize = true; break;
      case '--skip-annotate': opts.skipAnnotate = true; break;
      case '--skip-editor-compare': opts.skipEditorCompare = true; break;
      case '--no-validate': opts.noValidate = true; break;
      case '--no-runtime-sync': opts.runtimeSync = false; break;
      case '--no-per-tab-replay': opts.perTabReplay = false; break;
      case '--update-mode': opts.updateMode = true; break;
      case '--no-update-mode': opts.updateMode = false; break;
      case '--update-merge-mode': opts.updateMergeMode = next(); break;
      case '--no-regression-guard': opts.noRegressionGuard = false; break;
      case '--strict-replay-gates': opts.strictReplayGates = true; break;
      case '--editor-screenshot': opts.editorScreenshot = next(); break;
      case '--capture-protocol': opts.captureProtocol = next(); break;
      case '--capture-report': opts.captureReport = next(); break;
      case '--art-authority-waivers': opts.artAuthorityWaivers = next(); break;
      case '--evolution-log': opts.evolutionLog = next(); break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        console.error(`[run-html-to-ucuf-workflow] unknown arg: ${token}`);
        process.exit(2);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/run-html-to-ucuf-workflow.js \
  --source-dir <dir> --main-html <relative-html> --screen-id <id> --bundle <bundle> [options]

Single-file/debug:
  --input <html> --screen-id <id> --bundle <bundle> [options]

Options:
  --out-dir <dir>            output directory (default: artifacts/skill-test-html-to-ucuf/<screen-id>)
  --source-dir <dir>         v2 source package dir containing tokens/CSS/HTML
  --main-html <path>         main HTML relative to source-dir (required if ambiguous)
  --editor-screenshot <png>  Cocos Editor screenshot for final runtimeVsSource gate
  --capture-protocol <json>  final gate viewport/crop/DPR/settle sidecar
  --capture-report <json>    formal capture metadata; must match --editor-screenshot
  --art-authority-waivers <json>
                             optional approved runtime-art delta sidecar for visual gates
  --skip-editor-compare      debug only: skip required v2 Editor visual gate
  --evolution-log <md>       rule evolution2 log path for failed runtime visual gate
  --browser <path>           Chrome / Edge executable path
  --viewport <WxH>           snapshot viewport (default: 1920x1080)
  --settle-ms <n>            render settle time for pre-render (default: 1500)
  --content-contract <json>  optional screen/content contract file for annotation
  --strict-coverage <0..1>   compare coverage gate (default: 0.95)
  --strict-pixel <0..1>      pixel diff gate (default: 0.95)
  --skip-annotate            skip annotate-html-bindings stage
  --skip-optimize            skip optimize-ucuf-layout stage
  --skip-compare             skip compare / pixel-diff stage
  --no-validate              skip validate-ui-specs during strict replay
  --no-runtime-sync          debug only: do not deploy final JSON to runtime spec paths
  --no-per-tab-replay        debug only: skip automatic tab right-content fragment replay
  --update-mode              opt-in recurring update merge against existing runtime specs
  --no-update-mode           keep strict replay source-authoritative (default)
  --update-merge-mode <m>    preserve-human | html-authoritative | dry-run
  --no-regression-guard      disable css-coverage baseline regression gate in update mode
  --strict-replay-gates      make final replay fail on performance/strict blockers
`);
}

async function main() {
  const opts = parseArgs(process.argv);
  const allowedMergeModes = new Set(['preserve-human', 'html-authoritative', 'dry-run']);
  if (!allowedMergeModes.has(opts.updateMergeMode)) {
    console.error(`[run-html-to-ucuf-workflow] invalid --update-merge-mode: ${opts.updateMergeMode}`);
    console.error('[run-html-to-ucuf-workflow] allowed values: preserve-human | html-authoritative | dry-run');
    process.exit(2);
  }
  if (opts.help) {
    printHelp();
    return;
  }
  if ((!opts.input && !opts.sourceDir) || !opts.screenId || !opts.bundle) {
    printHelp();
    process.exit(2);
  }

  const shell = createWorkflowShellContext({ ROOT });
  await runWorkflowMain({
    opts,
    ROOT,
    fs,
    path,
    resolveSourcePackage,
    writeSourcePackageManifest,
    writeHtmlWithSourceCss,
    runRuleGuard,
    buildRuntimeSyncStep,
    buildRuleGuardStep,
    deriveGateSignals,
    finalizeWorkflowVerdict,
    normalizeReferencedFragmentFiles,
    ...shell,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[run-html-to-ucuf-workflow] ${error && (error.stack || error.message) || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  main,
};
