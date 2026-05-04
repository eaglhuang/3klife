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
  await captureHtml(preparedHtml, sourcePng, viewport, opts.browser, opts.settleMs, captureProtocol.normalized);
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

function sha256File(filePath) {
  return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
  let puppeteer;
  try { puppeteer = require('puppeteer-core'); }
  catch (error) { throw new Error('puppeteer-core is required for HTML source screenshot'); }
  const browser = await puppeteer.launch({
    executablePath: browserPath || findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    const dpr = captureProtocol && captureProtocol.viewport && captureProtocol.viewport.dpr ? captureProtocol.viewport.dpr : 1;
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: dpr });
    await page.goto(toFileUrl(htmlPath), { waitUntil: 'networkidle0', timeout: 30000 });
    try { await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()); } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, settleMs));
    await page.screenshot({ path: outputPng, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } });
    await page.close();
  } finally {
    await browser.close();
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

module.exports = { normalizePng, parseViewport, parseRect };
