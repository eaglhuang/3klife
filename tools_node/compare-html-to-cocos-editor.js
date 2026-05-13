#!/usr/bin/env node
// HTML source package screenshot vs Cocos Editor screenshot visual gate.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { PNG } = require('pngjs');

const { resolveSourcePackage, writeHtmlWithSourceCss } = require('./lib/html-to-ucuf/source-package');
const { pixelDiff, writeHeatmap } = require('./lib/dom-to-ui/pixel-diff');
const { buildCssCapabilityReport } = require('./lib/dom-to-ui/css-capability-matrix');
const { appendRuntimeVisualCandidate } = require('./lib/dom-to-ui/rule-evolution2');
const { buildZoneOwnershipReport } = require('./lib/dom-to-ui/zone-ownership');
const { startCoverage, stopCoverage } = require('./lib/dom-to-ui/css-coverage-trace');
const {
  findFinalCaptureProtocolPath,
  readFinalCaptureProtocol,
  normalizeFinalCaptureProtocol,
  applyFinalCaptureProtocol,
} = require('./lib/dom-to-ui/final-capture-protocol');
const {
  readArtAuthorityWaivers,
  findArtAuthorityWaiverPath,
  validateArtAuthorityWaivers,
  artAuthorityRectsForPixelDiff,
  buildArtAuthorityScoreReport,
} = require('./lib/dom-to-ui/art-authority-waivers');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    sourceDir: null,
    mainHtml: null,
    screenId: null,
    editorScreenshot: null,
    output: null,
    browser: null,
    viewport: null,
    threshold: null,
    tolerance: null,
    editorCrop: null,
    sourceCrop: null,
    captureProtocol: null,
    captureReport: null,
    noCaptureProtocol: false,
    settleMs: null,
    artAuthorityWaivers: null,
    noArtAuthorityWaivers: false,
    evolutionLog: null,
    noEvolution: false,
    help: false,
    provided: {},
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i];
    switch (token) {
      case '--source-dir': opts.sourceDir = next(); break;
      case '--main-html': opts.mainHtml = next(); break;
      case '--screen-id': opts.screenId = next(); break;
      case '--editor-screenshot': opts.editorScreenshot = next(); break;
      case '--output': opts.output = next(); break;
      case '--browser': opts.browser = next(); break;
      case '--viewport': opts.viewport = next(); opts.provided.viewport = true; break;
      case '--threshold': opts.threshold = parseFloat(next()); opts.provided.threshold = true; break;
      case '--tolerance': opts.tolerance = parseInt(next(), 10); opts.provided.tolerance = true; break;
      case '--editor-crop': opts.editorCrop = parseRect(next()); opts.provided.editorCrop = true; break;
      case '--source-crop': opts.sourceCrop = parseRect(next()); opts.provided.sourceCrop = true; break;
      case '--capture-protocol': opts.captureProtocol = next(); opts.provided.captureProtocol = true; break;
      case '--capture-report': opts.captureReport = next(); break;
      case '--no-capture-protocol': opts.noCaptureProtocol = true; break;
      case '--settle-ms': opts.settleMs = parseInt(next(), 10); opts.provided.settleMs = true; break;
      case '--art-authority-waivers': opts.artAuthorityWaivers = next(); opts.provided.artAuthorityWaivers = true; break;
      case '--no-art-authority-waivers': opts.noArtAuthorityWaivers = true; break;
      case '--evolution-log': opts.evolutionLog = next(); break;
      case '--no-evolution': opts.noEvolution = true; break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        console.error(`[compare-html-to-cocos-editor] unknown arg: ${token}`);
        process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/compare-html-to-cocos-editor.js \
  --source-dir <dir> --main-html <relative-html> --screen-id <id> \
  --editor-screenshot <png> --output <dir> [options]

Options:
  --viewport <WxH>          HTML reference screenshot viewport (default: 1920x1080)
  --threshold <0..1>        pass threshold (default: 0.95)
  --tolerance <n>           RGB channel tolerance for pixel diff (default: 12)
  --editor-crop x,y,w,h     crop Editor screenshot before resize
  --source-crop x,y,w,h     crop source screenshot before compare
  --capture-protocol <json> fixed viewport/crop/DPR/settle protocol sidecar
  --capture-report <json>   formal capture metadata from capture-ui-screens.js
  --no-capture-protocol     disable auto-discovery of <screen>.final-capture-protocol.json
  --settle-ms <n>           HTML screenshot settle delay after fonts load
  --art-authority-waivers <json>
                            optional approved runtime-art delta sidecar
  --no-art-authority-waivers
                            disable auto-discovery of <screen>.art-authority-waivers.json
  --evolution-log <md>      append candidate here when score fails
  --no-evolution            do not append evolution candidate on failure
`);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) return printHelp();
  if (!opts.sourceDir || !opts.screenId || !opts.editorScreenshot || !opts.output) {
    printHelp();
    process.exit(2);
  }
  if (!fs.existsSync(path.resolve(opts.editorScreenshot))) {
    console.error(`[compare-html-to-cocos-editor] editor screenshot not found: ${opts.editorScreenshot}`);
    process.exit(2);
  }

  const sourcePackage = resolveSourcePackage({ sourceDir: opts.sourceDir, mainHtml: opts.mainHtml });
  if (!sourcePackage.ok) {
    for (const error of sourcePackage.errors) console.error(`[compare-html-to-cocos-editor] source package error: ${error}`);
    process.exit(2);
  }

  const outDir = path.resolve(opts.output);
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, opts.screenId);
  const preparedHtml = `${base}.html-cocos-source.html`;
  const sourcePng = `${base}.html-cocos-source.png`;
  const sourceNormalized = `${base}.html-cocos-source-normalized.png`;
  const editorNormalized = `${base}.html-cocos-editor-normalized.png`;
  const heatmapPng = `${base}.html-cocos-heatmap.png`;
  const adjustedHeatmapPng = `${base}.html-cocos-adjusted-heatmap.png`;
  const comparePng = `${base}.html-cocos-compare.png`;
  const offendersJson = `${base}.html-cocos-top-offenders.json`;
  const artAuthorityReportJson = `${base}.art-authority-report.json`;
  const zoneOwnershipJson = `${base}.zone-ownership.json`;
  const verdictJson = `${base}.html-cocos-verdict.json`;

  const captureAuthority = validateCaptureReportAuthority({
    opts,
    editorScreenshot: path.resolve(opts.editorScreenshot),
    screenId: opts.screenId,
  });
  if (!captureAuthority.ok) {
    const verdict = buildInvalidCaptureVerdict({
      opts,
      sourcePackage,
      captureAuthority,
      verdictJson,
    });
    fs.writeFileSync(verdictJson, JSON.stringify(verdict, null, 2) + '\n', 'utf8');
    console.error(`[compare-html-to-cocos-editor] final capture authority invalid: ${captureAuthority.violations.map(v => v.ruleId).join(',')}`);
    console.log(`[compare-html-to-cocos-editor] verdict=${rel(verdictJson)}`);
    process.exit(12);
  }

  const captureProtocol = loadCaptureProtocolForCompare({
    opts,
    outDir,
    sourceDir: sourcePackage.manifest.sourceDir,
  });
  if (captureProtocol.normalized && captureProtocol.normalized.ok) {
    applyFinalCaptureProtocol(opts, captureProtocol.normalized, opts.provided);
  } else if (captureProtocol.normalized && !captureProtocol.normalized.ok) {
    for (const error of captureProtocol.normalized.errors) console.error(`[compare-html-to-cocos-editor] capture protocol invalid: ${error}`);
    process.exit(2);
  }
  if (!opts.viewport) opts.viewport = '1920x1080';
  if (opts.threshold == null || Number.isNaN(opts.threshold)) opts.threshold = 0.95;
  if (opts.tolerance == null || Number.isNaN(opts.tolerance)) opts.tolerance = 12;
  if (opts.settleMs == null || Number.isNaN(opts.settleMs)) opts.settleMs = 250;

  writeHtmlWithSourceCss({
    htmlPath: sourcePackage.mainHtmlPath,
    cssPath: sourcePackage.cssPath,
    outputPath: preparedHtml,
    cssLabel: sourcePackage.manifest.css,
  });

  const viewport = parseViewport(opts.viewport);
  const cssCoverageData = await captureHtml(preparedHtml, sourcePng, viewport, opts.browser, opts.settleMs, captureProtocol.normalized);
  const sourceNormalization = normalizePng(
    sourcePng,
    sourceNormalized,
    viewport.width,
    viewport.height,
    opts.sourceCrop,
    'source-screenshot',
  );
  const editorNormalization = normalizePng(
    path.resolve(opts.editorScreenshot),
    editorNormalized,
    viewport.width,
    viewport.height,
    opts.editorCrop,
    'runtime-screenshot',
  );
  for (const warning of sourceNormalization.warnings || []) {
    console.warn(`[compare-html-to-cocos-editor] ${warning}`);
  }
  for (const warning of editorNormalization.warnings || []) {
    console.warn(`[compare-html-to-cocos-editor] ${warning}`);
  }

  const rawDiff = pixelDiff(sourceNormalized, editorNormalized, { tolerance: opts.tolerance });
  writeHeatmap(rawDiff.heatmap, heatmapPng);
  writeCompareBoard(sourceNormalized, editorNormalized, comparePng);

  const artAuthority = loadArtAuthorityForCompare({
    opts,
    outDir,
    sourceDir: sourcePackage.manifest.sourceDir,
    viewport,
    artAuthorityReportJson,
  });
  const artAuthorityRects = artAuthority.validation && artAuthority.validation.ok
    ? artAuthorityRectsForPixelDiff(artAuthority.validation, { targetWidth: viewport.width, targetHeight: viewport.height })
    : [];
  const adjustedDiff = artAuthorityRects.length > 0
    ? pixelDiff(sourceNormalized, editorNormalized, { tolerance: opts.tolerance, waivers: artAuthorityRects })
    : rawDiff;
  if (adjustedDiff !== rawDiff) writeHeatmap(adjustedDiff.heatmap, adjustedHeatmapPng);

  const cssCapabilities = buildCssCapabilityReport(sourcePackage.cssText);
  const traceCatalog = loadZoneTraceCatalogForCompare({
    screenId: opts.screenId,
  });
  const scoreReport = buildArtAuthorityScoreReport({
    rawDiff,
    adjustedDiff,
    validation: artAuthority.validation,
    threshold: opts.threshold,
  });
  const score = scoreReport.rawScore;
  const pass = scoreReport.verdict !== 'fail';
  const topOffenders = cssCapabilities.topOffenders.map(item => ({
    property: item.property,
    kind: item.capability,
    count: item.count,
    impact: `css ${item.capability} occurrences=${item.count}`,
  }));
  fs.writeFileSync(offendersJson, JSON.stringify({ cssCapabilities, sourceWarnings: sourcePackage.warnings }, null, 2) + '\n', 'utf8');
  const zoneOwnership = buildZoneOwnershipReport({
    screenId: opts.screenId,
    pixelDiff: adjustedDiff,
    cssCapabilities,
    artAuthorityValidation: artAuthority.validation,
    traceCatalog: traceCatalog.entries,
    cssCoverageData,
    layoutBundle: {
      traceCatalog: traceCatalog.entries,
    },
  });
  fs.writeFileSync(zoneOwnershipJson, JSON.stringify(zoneOwnership, null, 2) + '\n', 'utf8');

  let evolution = null;
  if (!pass && !opts.noEvolution) {
    evolution = appendRuntimeVisualCandidate({
      logPath: opts.evolutionLog,
      screenId: opts.screenId,
      sourcePackage: sourcePackage.manifest,
      score,
      threshold: opts.threshold,
      topOffenders: topOffenders.concat((scoreReport.unwaivedDiffTopList || []).slice(0, 5).map(item => ({
        property: 'pixel-diff',
        kind: 'unwaived-diff-bucket',
        count: item.mismatchPixels,
        impact: `rect=${item.rect.x},${item.rect.y},${item.rect.w},${item.rect.h}`,
      }))),
      proposedRule: '依 top offenders 補齊 CSS mapper、assetize 或 runtime skin layer 後重跑 HTML vs Cocos Editor visual gate。',
      verification: `node tools_node/compare-html-to-cocos-editor.js --source-dir "${sourcePackage.manifest.sourceDir}" --main-html "${sourcePackage.manifest.mainHtml}" --screen-id ${opts.screenId} --editor-screenshot <png> --output ${rel(outDir)}`,
    });
  }

  const verdict = {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    sourcePackage: sourcePackage.manifest,
    captureAuthority: captureAuthority.summary,
    runtimeVsSource: {
      score,
      adjustedScore: scoreReport.adjustedScore,
      threshold: opts.threshold,
      verdict: scoreReport.verdict,
      passMode: scoreReport.passMode,
      source: 'html-source-screenshot-vs-cocos-editor-screenshot',
      waiverCoverageRatio: scoreReport.waiverCoverageRatio,
      artDeltaScore: scoreReport.artDeltaScore,
      converterResidualScore: scoreReport.converterResidualScore,
    },
    pixelDiff: {
      width: rawDiff.width,
      height: rawDiff.height,
      totalPixels: rawDiff.totalPixels,
      matchedPixels: rawDiff.matchedPixels,
      waiverPixels: rawDiff.waiverPixels,
      coveragePercent: rawDiff.coveragePercent,
      adjustedCoverage: rawDiff.adjustedCoverage,
      tolerance: opts.tolerance,
      unwaivedDiffTopList: rawDiff.unwaivedDiffTopList,
    },
    adjustedPixelDiff: {
      width: adjustedDiff.width,
      height: adjustedDiff.height,
      totalPixels: adjustedDiff.totalPixels,
      matchedPixels: adjustedDiff.matchedPixels,
      waiverPixels: adjustedDiff.waiverPixels,
      coveragePercent: adjustedDiff.coveragePercent,
      adjustedCoverage: adjustedDiff.adjustedCoverage,
      tolerance: opts.tolerance,
      unwaivedDiffTopList: adjustedDiff.unwaivedDiffTopList,
    },
    captureProtocol: captureProtocol.normalized ? {
      path: captureProtocol.path ? rel(captureProtocol.path) : null,
      ok: captureProtocol.normalized.ok,
      warnings: captureProtocol.normalized.warnings,
      viewport: captureProtocol.normalized.viewport,
      safeArea: captureProtocol.normalized.safeArea,
      sourceCrop: captureProtocol.normalized.sourceCrop,
      editorCrop: captureProtocol.normalized.editorCrop,
      settleMs: captureProtocol.normalized.settleMs,
    } : null,
    normalization: {
      source: sourceNormalization,
      runtime: editorNormalization,
    },
    zoneOwnership: {
      report: rel(zoneOwnershipJson),
      summary: zoneOwnership.summary,
      nextFixes: zoneOwnership.nextFixes,
      compactResidualSummary: zoneOwnership.compactResidualSummary,
      traceCatalog: {
        bakeManifest: traceCatalog.bakeManifestPath ? rel(traceCatalog.bakeManifestPath) : null,
        layout: traceCatalog.layoutPath ? rel(traceCatalog.layoutPath) : null,
        entries: traceCatalog.entries.length,
      },
    },
    artAuthority: {
      path: artAuthority.path ? rel(artAuthority.path) : null,
      report: artAuthority.wroteReport ? rel(artAuthorityReportJson) : null,
      validation: artAuthority.validation ? {
        ok: artAuthority.validation.ok,
        errors: artAuthority.validation.errors,
        warnings: artAuthority.validation.warnings,
        waiverCount: artAuthority.validation.waiverCount,
        totalCoverageRatio: artAuthority.validation.totalCoverageRatio,
      } : null,
    },
    artifacts: {
      preparedHtml: rel(preparedHtml),
      sourcePng: rel(sourcePng),
      sourceNormalized: rel(sourceNormalized),
      editorNormalized: rel(editorNormalized),
      comparePng: rel(comparePng),
      heatmapPng: rel(heatmapPng),
      adjustedHeatmapPng: adjustedDiff !== rawDiff ? rel(adjustedHeatmapPng) : null,
      topOffendersJson: rel(offendersJson),
      zoneOwnershipJson: rel(zoneOwnershipJson),
      zoneTraceBakeManifestJson: traceCatalog.bakeManifestPath ? rel(traceCatalog.bakeManifestPath) : null,
      zoneTraceLayoutJson: traceCatalog.layoutPath ? rel(traceCatalog.layoutPath) : null,
      artAuthorityReportJson: artAuthority.wroteReport ? rel(artAuthorityReportJson) : null,
      evolutionLog: evolution ? rel(evolution.logPath) : null,
    },
  };
  fs.writeFileSync(verdictJson, JSON.stringify(verdict, null, 2) + '\n', 'utf8');

  console.log(`[compare-html-to-cocos-editor] runtimeVsSource.raw=${score.toFixed(4)} adjusted=${scoreReport.adjustedScore.toFixed(4)} threshold=${opts.threshold} verdict=${verdict.runtimeVsSource.verdict}`);
  console.log(`[compare-html-to-cocos-editor] verdict=${rel(verdictJson)}`);
  if (!pass) process.exit(12);
}

function validateCaptureReportAuthority(args) {
  const opts = args.opts;
  if (!opts.captureReport) {
    return { ok: true, path: null, capture: null, violations: [], summary: null };
  }
  const reportPath = path.resolve(opts.captureReport);
  const violations = [];
  if (!fs.existsSync(reportPath)) {
    violations.push(captureViolation('H2U-P4-021', `capture report not found: ${opts.captureReport}`, 'Pass --capture-report from the same formal capture run as --editor-screenshot.'));
    return { ok: false, path: reportPath, capture: null, violations, summary: null };
  }
  const report = readJson(reportPath);
  const captures = Array.isArray(report && report.captures) ? report.captures : [];
  const editorHash = sha256File(args.editorScreenshot);
  const capture = captures.find(entry => entry && entry.screenshotHash === editorHash)
    || captures.find(entry => entry && sameResolvedPath(entry.file, args.editorScreenshot))
    || (captures.length === 1 ? captures[0] : null);
  if (!capture) {
    violations.push(captureViolation('H2U-P4-021', 'capture report does not contain the editor screenshot being compared', `Use the screenshot emitted by ${opts.captureReport}, or pass the matching capture report.`));
    return { ok: false, path: reportPath, capture: null, violations, summary: { path: rel(reportPath), editorScreenshotHash: editorHash } };
  }

  const expectedScreenId = String(capture.expectedScreenId || '').trim();
  const actualScreenId = String(capture.actualScreenId || capture.screenId || '').trim();
  if (expectedScreenId !== args.screenId || actualScreenId !== args.screenId) {
    violations.push(captureViolation(
      'H2U-P4-021',
      `capture target mismatch: expected=${expectedScreenId || '(missing)'} actual=${actualScreenId || '(missing)'} compare=${args.screenId}`,
      'Capture the formal UIScreenPreviewHost route for the converted screenId before running the final gate.',
    ));
  }
  if (capture.captureMode !== 'formal-html-to-ucuf') {
    violations.push(captureViolation(
      'H2U-P4-023',
      `captureMode is not formal-html-to-ucuf: ${capture.captureMode || '(missing)'}`,
      'Use capture-ui-screens.js --formal-screen-id <screenId> instead of a legacy product preview target.',
    ));
  }
  const version = String(capture.runtimeVersion || capture.uiVersion || '').trim();
  const hashes = capture.runtimeSpecHash && typeof capture.runtimeSpecHash === 'object' ? capture.runtimeSpecHash : null;
  if (!version || !hashes || !hashes.screen || !hashes.layout || !hashes.skin) {
    violations.push(captureViolation(
      'H2U-P4-022',
      'formal capture is missing runtimeVersion/uiVersion or runtimeSpecHash',
      'Capture after workflow runtime sync and include uiVersion plus screen/layout/skin hashes in capture-report.json.',
    ));
  }
  if (capture.screenshotHash && capture.screenshotHash !== editorHash) {
    violations.push(captureViolation(
      'H2U-P4-021',
      'capture report screenshotHash does not match --editor-screenshot',
      'Pass the exact screenshot emitted by the formal capture run.',
    ));
  }

  const captureProtocol = capture.captureProtocol && typeof capture.captureProtocol === 'object'
    ? capture.captureProtocol
    : null;
  const editorSize = readPngSize(args.editorScreenshot);
  if (capture.captureMode === 'formal-html-to-ucuf') {
    if (!captureProtocol) {
      violations.push(captureViolation(
        'H2U-P4-024',
        'formal capture report is missing captureProtocol metadata',
        'Recapture with the updated capture-ui-screens.js so PNG dimensions, viewport, and resize eligibility are recorded.',
      ));
    } else {
      if (captureProtocol.finalCompareEligible === false) {
        const reasons = Array.isArray(captureProtocol.finalCompareViolations)
          ? captureProtocol.finalCompareViolations.join('; ')
          : 'capture protocol marked screenshot invalid for final compare';
        violations.push(captureViolation(
          'H2U-P4-024',
          `formal screenshot is not final-compare eligible: ${reasons}`,
          'Use a full-size formal capture at the declared viewport; do not compare resized debug screenshots.',
        ));
      }
      const expectedViewport = normalizeCaptureViewport(captureProtocol.viewport);
      const finalSize = normalizeImageSize(captureProtocol.finalImageSize || captureProtocol.imageSizeAfterScreenshot);
      if (!expectedViewport) {
        violations.push(captureViolation(
          'H2U-P4-024',
          'formal captureProtocol is missing viewport dimensions',
          'Recapture with capture-ui-screens.js so compare can prove the screenshot coordinate space.',
        ));
      }
      if (!finalSize) {
        violations.push(captureViolation(
          'H2U-P4-024',
          'formal captureProtocol is missing final PNG dimensions',
          'Recapture with capture-ui-screens.js so compare can reject resized debug screenshots.',
        ));
      }
      if (expectedViewport && finalSize && (finalSize.width !== expectedViewport.width || finalSize.height !== expectedViewport.height)) {
        violations.push(captureViolation(
          'H2U-P4-024',
          `formal capture dimensions ${finalSize.width}x${finalSize.height} do not match viewport ${expectedViewport.width}x${expectedViewport.height}`,
          'Use --maxWidth 0 or the default formal capture path, then pass that full-size screenshot to compare.',
        ));
      }
      if (expectedViewport && editorSize && (editorSize.width !== expectedViewport.width || editorSize.height !== expectedViewport.height)) {
        violations.push(captureViolation(
          'H2U-P4-024',
          `--editor-screenshot dimensions ${editorSize.width}x${editorSize.height} do not match formal viewport ${expectedViewport.width}x${expectedViewport.height}`,
          'Pass the full-size PNG emitted by the matching formal capture report.',
        ));
      }
    }
  }

  return {
    ok: violations.length === 0,
    path: reportPath,
    capture,
    violations,
    summary: {
      path: rel(reportPath),
      captureMode: capture.captureMode || null,
      expectedScreenId: expectedScreenId || null,
      actualScreenId: actualScreenId || null,
      target: capture.target || null,
      uiVersion: capture.uiVersion || null,
      runtimeVersion: capture.runtimeVersion || capture.uiVersion || null,
      screenshotHash: capture.screenshotHash || null,
      editorScreenshotHash: editorHash,
      runtimeSpecHash: hashes,
      captureProtocol: captureProtocol ? {
        finalCompareEligible: captureProtocol.finalCompareEligible,
        finalCompareViolations: captureProtocol.finalCompareViolations || [],
        viewport: captureProtocol.viewport || null,
        finalImageSize: captureProtocol.finalImageSize || null,
        imageSizeAfterScreenshot: captureProtocol.imageSizeAfterScreenshot || null,
        requestedMaxWidth: captureProtocol.requestedMaxWidth ?? null,
        effectiveMaxWidth: captureProtocol.effectiveMaxWidth ?? null,
      } : null,
      editorImageSize: editorSize,
      ok: violations.length === 0,
      violations,
    },
  };
}

function buildInvalidCaptureVerdict(args) {
  const opts = args.opts;
  return {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    sourcePackage: args.sourcePackage.manifest,
    runtimeVsSource: {
      score: 0,
      adjustedScore: 0,
      threshold: opts.threshold || 0.95,
      verdict: 'fail',
      passMode: 'invalid-gate-target-mismatch',
      source: 'capture-report-authority',
      waiverCoverageRatio: 0,
      artDeltaScore: 0,
      converterResidualScore: 0,
    },
    captureAuthority: args.captureAuthority.summary,
    pixelDiff: null,
    adjustedPixelDiff: null,
    artifacts: {
      verdictJson: rel(args.verdictJson),
    },
  };
}

function captureViolation(ruleId, summary, fixAction) {
  return { ruleId, severity: 'blocker', summary, evidence: summary, fixAction };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function firstExistingPath(candidates) {
  for (const candidate of candidates || []) {
    if (!candidate) continue;
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

function loadZoneTraceCatalogForCompare(args) {
  const screenId = args && args.screenId ? String(args.screenId) : null;
  if (!screenId) return { bakeManifestPath: null, layoutPath: null, entries: [] };
  const bakeManifestPath = firstExistingPath([
    path.join(ROOT, 'assets', 'resources', 'ui-spec', 'layouts', `${screenId}.layout.bake-manifest.json`),
  ]);
  const layoutPath = firstExistingPath([
    path.join(ROOT, 'assets', 'resources', 'ui-spec', 'layouts', `${screenId}.json`),
  ]);
  if (!bakeManifestPath || !layoutPath) {
    return { bakeManifestPath, layoutPath, entries: [] };
  }
  try {
    return {
      bakeManifestPath,
      layoutPath,
      entries: buildTraceCatalogFromArtifacts({
        bakeManifest: readJson(bakeManifestPath),
        layout: readJson(layoutPath),
      }),
    };
  } catch (error) {
    console.warn(`[compare-html-to-cocos-editor] trace catalog skipped: ${error.message}`);
    return { bakeManifestPath, layoutPath, entries: [] };
  }
}

function buildTraceCatalogFromArtifacts(args) {
  const bakeEntries = Array.isArray(args && args.bakeManifest && args.bakeManifest.entries)
    ? args.bakeManifest.entries
    : [];
  const index = buildLayoutTraceIndex(args && args.layout ? args.layout : null);
  return bakeEntries
    .map((entry) => buildTraceCatalogEntry(entry, index))
    .filter(Boolean);
}

function buildLayoutTraceIndex(layout) {
  const index = {
    byUcufId: new Map(),
    byId: new Map(),
    byNumericSuffix: new Map(),
  };
  const root = layout && layout.root ? layout.root : layout;
  walkLayoutTraceNode(root, index);
  return index;
}

function walkLayoutTraceNode(node, index) {
  if (!node || typeof node !== 'object') return;
  registerTraceDescriptor(index, {
    kind: 'node',
    nodeName: typeof node.name === 'string' ? node.name : null,
    nodeId: typeof node.id === 'string' ? node.id : null,
    ucufId: typeof node._ucufId === 'string' ? node._ucufId : null,
    slotRefs: buildNodeSlotRefs(node),
  });
  const skinLayers = Array.isArray(node.skinLayers) ? node.skinLayers : [];
  for (const layer of skinLayers) {
    registerTraceDescriptor(index, {
      kind: 'skin-layer',
      nodeName: typeof node.name === 'string' ? node.name : null,
      nodeId: typeof node.id === 'string' ? node.id : null,
      ucufId: typeof node._ucufId === 'string' ? node._ucufId : null,
      layerId: typeof layer.layerId === 'string' ? layer.layerId : null,
      slotRefs: typeof layer.slotId === 'string' && layer.slotId ? [{ slotId: layer.slotId, kind: 'skin-layer' }] : [],
    });
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) walkLayoutTraceNode(child, index);
}

function buildNodeSlotRefs(node) {
  const slotRefs = [];
  if (typeof node.skinSlot === 'string' && node.skinSlot) slotRefs.push({ slotId: node.skinSlot, kind: 'skin-slot' });
  if (typeof node.styleSlot === 'string' && node.styleSlot) slotRefs.push({ slotId: node.styleSlot, kind: 'style-slot' });
  return slotRefs;
}

function registerTraceDescriptor(index, descriptor) {
  if (!descriptor) return;
  if (descriptor.ucufId && !index.byUcufId.has(descriptor.ucufId)) {
    index.byUcufId.set(descriptor.ucufId, descriptor);
  }
  if (descriptor.nodeId && !index.byId.has(descriptor.nodeId)) {
    index.byId.set(descriptor.nodeId, descriptor);
  }
  const suffixes = [numericSuffix(descriptor.nodeName), numericSuffix(descriptor.layerId), numericSuffix(descriptor.nodeId)];
  for (const suffix of suffixes) {
    if (!suffix) continue;
    const bucket = index.byNumericSuffix.get(suffix) || [];
    bucket.push(descriptor);
    index.byNumericSuffix.set(suffix, bucket);
  }
}

function buildTraceCatalogEntry(entry, index) {
  if (!entry || typeof entry.property !== 'string') return null;
  const descriptor = resolveTraceDescriptor(entry, index);
  const slotRefs = descriptor && Array.isArray(descriptor.slotRefs) ? descriptor.slotRefs : [];
  return {
    property: entry.property,
    selector: typeof entry.selector === 'string' ? entry.selector : null,
    rect: normalizeTraceRect(entry.target),
    bakeAction: typeof entry.bakeAction === 'string' ? entry.bakeAction : null,
    bakeStatus: typeof entry.status === 'string' ? entry.status : null,
    runtimeAssetPath: typeof entry.runtimeAssetPath === 'string' ? entry.runtimeAssetPath : null,
    autoBake: typeof entry.autoBake === 'boolean' ? entry.autoBake : null,
    skinSlotKind: typeof entry.skinSlotKind === 'string' ? entry.skinSlotKind : null,
    ucufNodeSlots: slotRefs.map((slotRef) => ({
      ucufId: descriptor && descriptor.ucufId ? descriptor.ucufId : (typeof entry.ucufId === 'string' ? entry.ucufId : null),
      nodeName: descriptor && descriptor.nodeName ? descriptor.nodeName : null,
      nodeId: descriptor && descriptor.nodeId ? descriptor.nodeId : null,
      layerId: descriptor && descriptor.layerId ? descriptor.layerId : null,
      slotId: slotRef.slotId,
      kind: slotRef.kind,
    })),
    matchConfidence: descriptor ? 'bake-manifest-layout' : 'bake-manifest-only',
  };
}

function resolveTraceDescriptor(entry, index) {
  if (entry && typeof entry.ucufId === 'string' && index.byUcufId.has(entry.ucufId)) {
    return index.byUcufId.get(entry.ucufId);
  }
  const selectorId = selectorDomId(entry && entry.selector);
  if (selectorId && index.byId.has(selectorId)) {
    return index.byId.get(selectorId);
  }
  const numericNodeId = typeof entry.nodeId === 'number' && Number.isFinite(entry.nodeId)
    ? String(entry.nodeId)
    : numericSuffix(entry && entry.nodeId);
  if (numericNodeId && index.byNumericSuffix.has(numericNodeId)) {
    return pickBestTraceDescriptor(index.byNumericSuffix.get(numericNodeId), entry);
  }
  return null;
}

function pickBestTraceDescriptor(candidates, entry) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) return null;
  const property = String((entry && entry.property) || '').toLowerCase();
  let best = list[0];
  let bestScore = -1;
  for (const candidate of list) {
    let score = 0;
    if (candidate && Array.isArray(candidate.slotRefs) && candidate.slotRefs.length > 0) score += 5;
    if (/^background/.test(property) && candidate.kind === 'skin-layer') score += 30;
    if (/^(backdrop-filter|filter|box-shadow|drop-shadow|text-shadow)$/.test(property) && candidate.kind === 'node') score += 30;
    if (candidate.kind === 'node') score += 1;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function selectorDomId(selector) {
  const match = /#([A-Za-z0-9_-]+)/.exec(String(selector || ''));
  return match ? match[1] : null;
}

function numericSuffix(value) {
  const match = /(?:_|-)?(\d+)$/.exec(String(value || ''));
  return match ? match[1] : null;
}

function normalizeTraceRect(target) {
  if (!target || typeof target !== 'object') return null;
  const x = Number(target.x);
  const y = Number(target.y);
  const width = Number(target.width);
  const height = Number(target.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x, y, w: width, h: height };
}

function sha256File(filePath) {
  return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readPngSize(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 24) return null;
    const signature = buffer.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') return null;
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

function normalizeCaptureViewport(viewport) {
  if (!viewport || typeof viewport !== 'object') return null;
  const width = Number(viewport.width);
  const height = Number(viewport.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function normalizeImageSize(size) {
  if (!size || typeof size !== 'object') return null;
  const width = Number(size.width);
  const height = Number(size.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function sameResolvedPath(left, right) {
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function loadArtAuthorityForCompare(args) {
  const opts = args.opts;
  if (opts.noArtAuthorityWaivers) return { path: null, validation: null, wroteReport: false };
  const waiverPath = findArtAuthorityWaiverPath({
    explicitPath: opts.artAuthorityWaivers,
    screenId: opts.screenId,
    outputDir: args.outDir,
    sourceDir: args.sourceDir,
    repoRoot: ROOT,
  });
  if (!waiverPath) return { path: null, validation: null, wroteReport: false };
  if (!fs.existsSync(path.resolve(waiverPath))) {
    console.error(`[compare-html-to-cocos-editor] art-authority sidecar not found: ${waiverPath}`);
    process.exit(2);
  }
  const report = readArtAuthorityWaivers(waiverPath);
  const validation = validateArtAuthorityWaivers(report, {
    repoRoot: ROOT,
    screenId: opts.screenId,
    targetWidth: args.viewport.width,
    targetHeight: args.viewport.height,
  });
  fs.writeFileSync(args.artAuthorityReportJson, JSON.stringify({
    path: rel(waiverPath),
    validation,
  }, null, 2) + '\n', 'utf8');
  if (!validation.ok) {
    for (const error of validation.errors) console.error(`[compare-html-to-cocos-editor] art-authority invalid: ${error}`);
    process.exit(2);
  }
  return { path: waiverPath, validation, wroteReport: true };
}

function loadCaptureProtocolForCompare(args) {
  const opts = args.opts;
  if (opts.noCaptureProtocol) return { path: null, raw: null, normalized: null };
  const protocolPath = findFinalCaptureProtocolPath({
    explicitPath: opts.captureProtocol,
    screenId: opts.screenId,
    outputDir: args.outDir,
    sourceDir: args.sourceDir,
    repoRoot: ROOT,
  });
  if (!protocolPath) return { path: null, raw: null, normalized: null };
  if (!fs.existsSync(path.resolve(protocolPath))) {
    console.error(`[compare-html-to-cocos-editor] capture protocol not found: ${protocolPath}`);
    process.exit(2);
  }
  const raw = readFinalCaptureProtocol(protocolPath);
  const normalized = normalizeFinalCaptureProtocol(raw, { screenId: opts.screenId });
  if (normalized && normalized.artAuthorityWaivers && !path.isAbsolute(normalized.artAuthorityWaivers)) {
    normalized.artAuthorityWaivers = path.resolve(path.dirname(protocolPath), normalized.artAuthorityWaivers);
  }
  return { path: protocolPath, raw, normalized };
}

async function captureHtml(htmlPath, outputPng, viewport, browserPath, settleMs, captureProtocol) {
  const browserCaptureCore = require('./lib/browser-capture-core');
  
  const dpr = captureProtocol && captureProtocol.viewport && captureProtocol.viewport.dpr ? captureProtocol.viewport.dpr : 1;
  const browser = await browserCaptureCore.launchBrowser({
    executablePath: browserPath || findBrowser(),
    viewport: { ...viewport, deviceScaleFactor: dpr },
    headless: true,
  });

  try {
    const page = await browser.newPage();
    let coverageStarted = false;
    await browserCaptureCore.navigatePage(page, toFileUrl(htmlPath), {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    try {
      const coverageState = await startCoverage(page);
      coverageStarted = coverageState && coverageState.enabled === true;
    } catch (_) {
      coverageStarted = false;
    }
    await browserCaptureCore.waitForFonts(page);
    await browserCaptureCore.captureSelector(page, {
      path: outputPng,
      waitMs: settleMs,
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    });
    const coverageData = coverageStarted ? await stopCoverage(page) : { rawCoverage: [], selectorRects: [] };
    await page.close();
    return coverageData;
  } finally {
    await browserCaptureCore.closeBrowser(browser);
  }
}

function normalizePng(inputPath, outputPath, targetW, targetH, crop, label) {
  const src = PNG.sync.read(fs.readFileSync(inputPath));
  const resolved = resolveNormalizeRect(src, targetW, targetH, crop, label || path.basename(inputPath));
  const rect = resolved.rect;
  const out = new PNG({ width: targetW, height: targetH });
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const sx = clamp(rect.x + Math.floor((x / targetW) * rect.w), 0, src.width - 1);
      const sy = clamp(rect.y + Math.floor((y / targetH) * rect.h), 0, src.height - 1);
      const si = (sy * src.width + sx) * 4;
      const oi = (y * targetW + x) * 4;
      out.data[oi] = src.data[si];
      out.data[oi + 1] = src.data[si + 1];
      out.data[oi + 2] = src.data[si + 2];
      out.data[oi + 3] = src.data[si + 3];
    }
  }
  fs.writeFileSync(outputPath, PNG.sync.write(out));
  return {
    input: rel(inputPath),
    sourceWidth: src.width,
    sourceHeight: src.height,
    cropMode: resolved.mode,
    appliedCrop: rect,
    warnings: resolved.warnings,
  };
}

function resolveNormalizeRect(src, targetW, targetH, crop, label) {
  const fullRect = { x: 0, y: 0, w: src.width, h: src.height };
  if (!crop) {
    return { rect: fullRect, mode: 'full-image', warnings: [] };
  }

  const fits = crop.x >= 0
    && crop.y >= 0
    && crop.w > 0
    && crop.h > 0
    && crop.x + crop.w <= src.width
    && crop.y + crop.h <= src.height;
  if (fits) {
    return { rect: crop, mode: 'configured-crop', warnings: [] };
  }

  const alreadyMatchesViewport = src.width === targetW && src.height === targetH;
  if (alreadyMatchesViewport) {
    return {
      rect: fullRect,
      mode: 'auto-skip-out-of-bounds-crop',
      warnings: [
        `${label}: configured crop ${crop.x},${crop.y},${crop.w},${crop.h} exceeds input ${src.width}x${src.height}; `
        + 'input already matches target viewport, so crop was skipped to avoid double-cropping a canvas-only capture.',
      ],
    };
  }

  throw new Error(
    `${label}: configured crop ${crop.x},${crop.y},${crop.w},${crop.h} exceeds input ${src.width}x${src.height}`,
  );
}

function writeCompareBoard(leftPath, rightPath, outputPath) {
  const left = PNG.sync.read(fs.readFileSync(leftPath));
  const right = PNG.sync.read(fs.readFileSync(rightPath));
  const w = Math.min(left.width, right.width);
  const h = Math.min(left.height, right.height);
  const out = new PNG({ width: w * 2, height: h });
  blit(left, out, 0, 0, w, h);
  blit(right, out, w, 0, w, h);
  fs.writeFileSync(outputPath, PNG.sync.write(out));
}

function blit(src, dst, dx, dy, w, h) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const si = (y * src.width + x) * 4;
      const di = ((dy + y) * dst.width + dx + x) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

function findBrowser() {
  const candidates = [
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Cannot find Chrome or Edge. Pass --browser <path>.');
}

function parseViewport(value) {
  const match = String(value || '').match(/^(\d+)x(\d+)$/i);
  if (!match) throw new Error(`invalid viewport: ${value}`);
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}

function parseRect(value) {
  const nums = String(value || '').split(',').map(n => parseInt(n.trim(), 10));
  if (nums.length !== 4 || nums.some(n => !Number.isFinite(n))) throw new Error(`invalid rect: ${value}`);
  return { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFileUrl(filePath) {
  return encodeURI(`file:///${path.resolve(filePath).replace(/\\/g, '/')}`);
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

if (require.main === module) {
  main().catch(error => {
    console.error(`[compare-html-to-cocos-editor] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = { normalizePng, parseViewport, parseRect, parseArgs, main };
