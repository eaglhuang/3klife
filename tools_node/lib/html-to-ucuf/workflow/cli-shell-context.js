'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { runScriptInProcess, shouldFallbackForEperm } = require('../../in-process-cli-runner');
const {
  readFinalTabRouting: readFinalTabRoutingAtom,
  buildRuntimeTabRoutingMap: buildRuntimeTabRoutingMapAtom,
  syncFinalArtifactsToRuntime: syncFinalArtifactsToRuntimeAtom,
} = require('./runtime-sync');
const {
  runPerTabReplay: runPerTabReplayAtom,
} = require('./per-tab-replay');
const {
  injectDynamicTextContracts: injectDynamicTextContractsAtom,
  normalizeInteractionTriggersFromLayout: normalizeInteractionTriggersFromLayoutAtom,
} = require('./text-contract-sync');
const {
  buildRuntimeInteractionSmokeStep: buildRuntimeInteractionSmokeStepAtom,
  assessInteractionRuntime: assessInteractionRuntimeAtom,
} = require('./interaction-smoke');
const { regenerateScreenLocalTokens: regenerateScreenLocalTokensAtom } = require('./token-governance');
const {
  buildSummary: buildSummaryAtom,
  buildFidelityDimensions: buildFidelityDimensionsAtom,
  computeDebugOnly: computeDebugOnlyAtom,
  buildRuntimeAuthority: buildRuntimeAuthorityAtom,
  topRuleGuardFixes: topRuleGuardFixesAtom,
  classifyBlockerCategory: classifyBlockerCategoryAtom,
  deriveBlockerTaxonomy: deriveBlockerTaxonomyAtom,
  buildPreRuleGuardFixes: buildPreRuleGuardFixesAtom,
  mergeNextFixes: mergeNextFixesAtom,
  assessVisualFidelityRisk: assessVisualFidelityRiskAtom,
} = require('./quality-verdict-utils');
const { assessReferencedFragmentGeometry } = require('../../dom-to-ui/fragment-geometry-contract');

function createWorkflowShellContext({ ROOT }) {
function rel(p) {
  return path.relative(ROOT, path.resolve(p)).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(path.resolve(dirPath), { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function readJsonIfExists(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, data) {
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function hashFileIfExists(filePath) {
  if (!filePath) return null;
  try {
    const full = path.resolve(filePath);
    if (!fs.existsSync(full)) return null;
    return crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex').slice(0, 12);
  } catch (_) {
    return null;
  }
}

function detectInputShape(html) {
  const hasSemanticMarkers = /data-anchor|data-ucuf-id|data-name|data-contract|data-slot|data-ucuf-action/i.test(html);
  const hasDynamicDomSignals = /createElement|innerHTML\s*=|document\.|appendChild|insertAdjacentHTML|<script\b/i.test(html);
  return {
    hasSemanticMarkers,
    hasDynamicDomSignals,
    needsPrerender: !hasSemanticMarkers && hasDynamicDomSignals,
  };
}

async function runNodeStep(label, scriptName, args, extraEnv) {
  console.log(`[run-html-to-ucuf-workflow] step=${label}`);
  const scriptPath = path.resolve(ROOT, 'tools_node', scriptName);
  const proc = cp.spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }, extraEnv || {}),
    shell: false,
  });
  if (!shouldFallbackForEperm(proc)) {
    if (proc.stdout) process.stdout.write(proc.stdout);
    if (proc.stderr) process.stderr.write(proc.stderr);
    return proc;
  }

  console.warn(`[run-html-to-ucuf-workflow] step=${label} spawn EPERM; fallback=in-process`);
  const inProcess = await runScriptInProcess({
    scriptPath,
    args,
    cwd: ROOT,
    envPatch: Object.assign({}, { DOM_TO_UI_TELEMETRY: '0' }, extraEnv || {}),
    label,
  });
  if (inProcess.stdout) process.stdout.write(inProcess.stdout);
  if (inProcess.stderr) process.stderr.write(inProcess.stderr);
  return inProcess;
}

function extractIssues(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && (/blocker|strict mode|interaction-target-missing|manual-adapter-required|validate failed/i.test(line)));
}

function extractCompareMetrics(comparePngPath) {
  const pixel = readJsonIfExists(comparePngPath.replace(/\.png$/i, '.pixel-diff.json'));
  const coverage = readJsonIfExists(comparePngPath.replace(/\.png$/i, '.css-coverage.json'));
  return {
    coveragePercent: coverage && coverage.coveragePercent,
    pixelCoveragePercent: pixel && pixel.coveragePercent,
    adjustedCoverage: pixel && pixel.adjustedCoverage,
    waiverPixels: pixel && pixel.waiverPixels,
    heatmapPath: pixel && pixel.heatmapPng ? pixel.heatmapPng : comparePngPath.replace(/\.png$/i, '.pixel-diff.heatmap.png'),
  };
}

function extractPerfMetrics(layoutJsonPath) {
  const perf = readJsonIfExists(layoutJsonPath.replace(/\.json$/i, '.performance.json'));
  return {
    nodeCount: perf && perf.rendering ? perf.rendering.nodeCount : null,
    maxDepth: perf && perf.rendering ? perf.rendering.maxDepth : null,
    blockers: perf && perf.verdict ? perf.verdict.blockers || [] : [],
  };
}

function assessRuntimeReadiness(paths, sourceHtml, screenId) {
  const layoutPath = fs.existsSync(paths.finalLayout) ? paths.finalLayout : paths.optimizedLayout;
  const skinPath = fs.existsSync(paths.finalSkin) ? paths.finalSkin : paths.rawSkin;
  const layout = readJsonIfExists(layoutPath);
  const skin = readJsonIfExists(skinPath);
  const runtime = screenId ? resolveRuntimeSpecPaths(screenId) : null;
  const screen = runtime && runtime.screenPath ? readJsonIfExists(runtime.screenPath) : null;
  const blockers = [];
  const warnings = [];
  const markerMatches = String(sourceHtml || '').match(/data-(slot|contract|panel|name|ucuf-id|ucuf-action)\b/gi) || [];
  const hasTabbedSource = /role\s*=\s*["']tab|class\s*=\s*["'][^"']*\btab\b|data-tab|tab-content|tabs\.jsx|switchTab/i.test(String(sourceHtml || ''));
  const hasPortalTabbedSource = /createPortal\s*\(\s*tabContent\s*\[\s*tab\s*\]|const\s+tabContent\s*=\s*\{|\bsetTab\s*\(/i.test(String(sourceHtml || ''));

  const stats = {
    sourceSemanticMarkerCount: markerMatches.length,
    hasTabbedSource,
    hasPortalTabbedSource,
    semanticMarkerPolicy: 'optional',
    lazySlotCount: 0,
    childPanelCount: 0,
    fragmentGeometryStatus: 'pass',
    placeholderSpriteCount: 0,
    unmappedColorCount: 0,
  };

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.lazySlot) stats.lazySlotCount += 1;
    if (node.type === 'child-panel') stats.childPanelCount += 1;
    for (const child of node.children || []) walk(child);
  }
  if (layout) walk(layout.root || layout);

  for (const slot of Object.values((skin && skin.slots) || {})) {
    if (!slot || typeof slot !== 'object') continue;
    if (slot.kind === 'sprite-frame' && /sprites\/ui_common\/placeholder\/missing_sprite/i.test(String(slot.path || ''))) {
      stats.placeholderSpriteCount += 1;
    }
    if (slot.color === 'unmappedColor') stats.unmappedColorCount += 1;
  }

  if (stats.placeholderSpriteCount > 0) {
    blockers.push(`runtime-readiness: placeholder sprite slots remain (${stats.placeholderSpriteCount})`);
  }
  if (hasTabbedSource && stats.lazySlotCount === 0 && stats.childPanelCount === 0) {
    blockers.push('runtime-readiness: tabbed layout has no lazySlot or child-panel mount points');
  } else if (hasTabbedSource && stats.sourceSemanticMarkerCount < 4) {
    warnings.push('runtime-readiness: tabbed source has low explicit semantic markers; using inferred tab/lazySlot mapping');
  }
  const tabEntries = screen && screen.tabRouting && typeof screen.tabRouting === 'object'
    ? Object.values(screen.tabRouting)
    : [];
  const hasGeneratedTabFragments = tabEntries.length > 0 && tabEntries.every(route => {
    const ref = route && route.fragment ? String(route.fragment) : '';
    if (!ref) return false;
    return fs.existsSync(path.join(ROOT, 'assets', 'resources', 'ui-spec', `${ref}.json`));
  });
  if (hasPortalTabbedSource && !hasGeneratedTabFragments) {
    warnings.push('runtime-readiness: portal/tab-state source only exposes active tab DOM; full tab fragment fidelity still requires per-tab replay or dedicated fragment extraction');
  }
  const fragmentGeometry = assessReferencedFragmentGeometry({
    repoRoot: ROOT,
    screenId,
    layout: layout || null,
    screen,
    tabRouting: screen && screen.tabRouting,
  });
  stats.fragmentGeometryStatus = fragmentGeometry.status;
  stats.fragmentGeometryFailures = fragmentGeometry.workUnits;
  if (fragmentGeometry.status === 'blocker') {
    blockers.push(`runtime-readiness: tab-fragment-geometry-contract ${fragmentGeometry.summary}`);
  }
  if (stats.unmappedColorCount > 0) {
    warnings.push(`runtime-readiness: unmappedColor fallback slots remain (${stats.unmappedColorCount})`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    stats,
    fragmentGeometry,
  };
}

function sanitizeUcufReadyHtml(filePath) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) return { rewrittenInlineHandlers: 0 };
  const before = fs.readFileSync(full, 'utf8');
  let rewrittenInlineHandlers = 0;
  const after = before.replace(/<[^>]+>/g, (tag) => {
    if (!/(data-ucuf-action|data-action)\s*=\s*/i.test(tag)) return tag;
    if (!/\sonclick\s*=\s*/i.test(tag)) return tag;
    const next = tag.replace(/\s+onclick\s*=\s*(?:"[^"]*"|'[^']*')/i, '');
    if (next !== tag) rewrittenInlineHandlers += 1;
    return next;
  });
  if (after !== before) fs.writeFileSync(full, after, 'utf8');
  return { rewrittenInlineHandlers };
}

function buildPaths(opts) {
  const outDir = path.resolve(opts.outDir || path.join(ROOT, 'artifacts', 'skill-test-html-to-ucuf', opts.screenId));
  const base = path.join(outDir, opts.screenId);
  return {
    outDir,
    renderedHtml: `${base}.rendered.html`,
    readyHtml: `${base}.ucuf-ready.html`,
    rawLayout: `${base}.raw.layout.json`,
    rawSkin: `${base}.raw.skin.json`,
    optimizedLayout: `${base}.optimized.layout.json`,
    finalLayout: `${base}.final.layout.json`,
    finalSkin: `${base}.final.skin.json`,
    sourcePackageManifest: `${base}.source-package.json`,
    sourceReadyHtml: `${base}.source-package.html`,
    tabReplayDir: path.join(outDir, 'tab-replay'),
    comparePng: `${base}.compare.png`,
    htmlCocosVerdict: path.join(outDir, `${opts.screenId}.html-cocos-verdict.json`),
    annotateReport: `${base}.annotate-report.json`,
    optimizeReport: `${base}.optimize-report.json`,
    skinFixReport: `${base}.skin-autofix.json`,
    localTokenDiffReport: `${base}.local-token-diff.json`,
    ruleGuardReport: `${base}.rule-guard.json`,
    summary: `${base}.workflow-summary.json`,
    zoneOwnership: `${base}.zone-ownership.json`,
  };
}

function resolveRuntimeSpecPaths(screenId) {
  const screenPath = path.join(ROOT, 'assets', 'resources', 'ui-spec', 'screens', `${screenId}.json`);
  const screen = readJsonIfExists(screenPath);
  if (!screen || typeof screen !== 'object') return null;

  const layoutId = typeof screen.layout === 'string' ? screen.layout.trim() : '';
  const skinId = typeof screen.skin === 'string' ? screen.skin.trim() : '';
  return {
    screenPath,
    layoutPath: layoutId ? path.join(ROOT, 'assets', 'resources', 'ui-spec', 'layouts', `${layoutId}.json`) : null,
    skinPath: skinId ? path.join(ROOT, 'assets', 'resources', 'ui-spec', 'skins', `${skinId}.json`) : null,
  };
}

function resolveCanonicalRuntimePaths(screenId) {
  const base = path.join(ROOT, 'assets', 'resources', 'ui-spec');
  return {
    screensDir: path.join(base, 'screens'),
    layoutsDir: path.join(base, 'layouts'),
    skinsDir: path.join(base, 'skins'),
    fragmentsDir: path.join(base, 'fragments', 'layouts'),
    screenPath: path.join(base, 'screens', `${screenId}.json`),
    screenLocalTokenPath: path.join(base, 'screens', `${screenId}.local-tokens.json`),
    layoutPath: path.join(base, 'layouts', `${screenId}.json`),
    layoutAliasPath: path.join(base, 'layouts', `${screenId}.layout.json`),
    skinPath: path.join(base, 'skins', `${screenId}.skin.json`),
    readinessPath: path.join(base, 'screens', `${screenId}.readiness.json`),
  };
}

function regenerateScreenLocalTokens(paths, opts) {
  return regenerateScreenLocalTokensAtom({
    paths,
    opts,
    helpers: {
      resolveCanonicalRuntimePaths,
      readJsonIfExists,
      writeJson,
      ensureDir,
      rel,
    },
  });
}


function copyIfPresent(target, source, key) {
  if (source && Object.prototype.hasOwnProperty.call(source, key)) {
    target[key] = source[key];
    return true;
  }
  return false;
}

function readRuntimeStateRoute(screenId) {
  const registryPath = path.join(ROOT, 'assets', 'resources', 'ui-spec', 'runtime-state-registry.json');
  const registry = readJsonIfExists(registryPath);
  const routes = Array.isArray(registry && registry.routes) ? registry.routes : [];
  return routes.find(route => route && route.screenId === screenId) || null;
}

function mergeRuntimeScreenContentContract(screen, screenDraft, existingScreen, runtimeRoute) {
  const sources = [screenDraft, existingScreen];
  const copied = [];
  for (const key of ['content', 'contentRequirements', 'dataSource', 'preview']) {
    for (const source of sources) {
      if (copyIfPresent(screen, source, key)) {
        copied.push(key);
        break;
      }
    }
  }

  if ((!screen.content || !screen.content.source) && runtimeRoute && runtimeRoute.contentSource) {
    screen.content = {
      source: runtimeRoute.contentSource,
      state: runtimeRoute.defaultState || 'default',
    };
    copied.push('content:runtime-state-registry');
  }
  return copied;
}

function sidecarPath(layoutPath, suffix) {
  return path.resolve(layoutPath).replace(/\.json$/i, suffix);
}

function firstExistingPath(candidates) {
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

function copyJsonFile(sourcePath, targetPath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return rel(targetPath);
}

function toCompactDate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function deriveUiShortName(screenId) {
  const tokens = String(screenId || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(token => token !== 'screen' && token !== 'main' && token !== 'ui');
  if (tokens.length === 0) return 'ui';
  if (tokens.length === 1) return tokens[0].slice(0, 8);
  const folded = tokens.map((token) => {
    if (/^\d+$/.test(token)) return token;
    return token.length <= 3 ? token : token.slice(0, 3);
  }).join('');
  return folded.slice(0, 12) || 'ui';
}

function allocateUiVersion(screenId) {
  const shortName = deriveUiShortName(screenId);
  const day = toCompactDate(new Date());
  const statePath = path.join(ROOT, 'artifacts', 'skill-test-html-to-ucuf', '.ui-version-seq.json');
  const key = `${shortName}:${day}`;
  let state = {};
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, '')) || {};
    } catch {
      state = {};
    }
  }
  const next = (Number(state[key]) || 0) + 1;
  state[key] = next;
  ensureDir(path.dirname(statePath));
  writeJson(statePath, state);
  return `${shortName}-${day}-${String(next).padStart(3, '0')}`;
}

function writeUiVersionArtifacts(paths, opts, uiVersion) {
  const runtime = resolveCanonicalRuntimePaths(opts.screenId);
  const metadata = {
    screenId: opts.screenId,
    uiShortName: deriveUiShortName(opts.screenId),
    uiVersion,
    outDir: rel(paths.outDir),
    generatedAt: new Date().toISOString(),
  };
  const outVersionPath = path.join(paths.outDir, `${opts.screenId}.runtime-version.json`);
  const runtimeVersionPath = path.join(runtime.screensDir, `${opts.screenId}.runtime-version.json`);
  writeJson(outVersionPath, metadata);
  writeJson(runtimeVersionPath, metadata);
  return {
    outVersionPath: rel(outVersionPath),
    runtimeVersionPath: rel(runtimeVersionPath),
    metadata,
  };
}

function readFinalTabRouting(paths) {
  return readFinalTabRoutingAtom(paths, { readJsonIfExists, sidecarPath });
}

function buildRuntimeTabRoutingMap(tabRoutingSidecar, existingMap) {
  return buildRuntimeTabRoutingMapAtom(tabRoutingSidecar, existingMap);
}

function syncFinalArtifactsToRuntime(paths, opts, uiVersion) {
  return syncFinalArtifactsToRuntimeAtom({
    paths,
    opts,
    uiVersion,
    helpers: {
      resolveCanonicalRuntimePaths,
      firstExistingPath,
      readJsonIfExists,
      sidecarPath,
      readRuntimeStateRoute,
      mergeRuntimeScreenContentContract,
      copyJsonFile,
      writeJson,
      rel,
    },
  });
}

function injectDynamicTextContracts(layoutPath, screenId) {
  return injectDynamicTextContractsAtom({
    layoutPath,
    screenId,
    helpers: {
      readJsonIfExists,
      writeJson,
    },
  });
}

function normalizeInteractionTriggersFromLayout(paths) {
  return normalizeInteractionTriggersFromLayoutAtom({
    paths,
    helpers: {
      readJsonIfExists,
      sidecarPath,
      writeJson,
    },
  });
}

async function runPerTabReplay(paths, opts, sourcePackage, inputPath) {
  return runPerTabReplayAtom({
    paths,
    opts,
    sourcePackage,
    inputPath,
    helpers: {
      readFinalTabRouting,
      ensureDir,
      runNodeStep,
      readJsonIfExists,
      resolveCanonicalRuntimePaths,
      sidecarPath,
      writeJson,
      rel,
    },
  });
}

function deriveCssCoveragePathFromLayout(layoutPath) {
  if (!layoutPath) return null;
  return path.resolve(layoutPath).replace(/\.json$/i, '.css-coverage.json');
}

function resolveUpdateCoverageBaseline(paths, opts) {
  if (!opts.updateMode || !opts.noRegressionGuard) return null;

  const candidates = [
    deriveCssCoveragePathFromLayout(paths.finalLayout),
  ];

  const runtime = resolveRuntimeSpecPaths(opts.screenId);
  if (runtime && runtime.layoutPath) {
    candidates.push(deriveCssCoveragePathFromLayout(runtime.layoutPath));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function bootstrapFinalDraftFromRuntime(paths, screenId) {
  const runtime = resolveRuntimeSpecPaths(screenId);
  if (!runtime) return { ok: true, copiedLayout: false, copiedSkin: false, reason: 'runtime-screen-spec-missing' };

  let copiedLayout = false;
  let copiedSkin = false;

  if (runtime.layoutPath && fs.existsSync(runtime.layoutPath)) {
    fs.copyFileSync(runtime.layoutPath, paths.finalLayout);
    copiedLayout = true;
  }
  if (runtime.skinPath && fs.existsSync(runtime.skinPath)) {
    fs.copyFileSync(runtime.skinPath, paths.finalSkin);
    copiedSkin = true;
  }

  return {
    ok: true,
    copiedLayout,
    copiedSkin,
    runtimeScreenPath: runtime.screenPath,
    runtimeLayoutPath: runtime.layoutPath,
    runtimeSkinPath: runtime.skinPath,
  };
}

function buildSummary(args) {
  return buildSummaryAtom(args, {
    assessInteractionRuntime,
    hashFileIfExists,
    resolveCanonicalRuntimePaths,
    rel,
    firstExistingPath,
    readJsonIfExists,
  });
}

function buildFidelityDimensions(metrics, verdict, interactionRuntime) {
  return buildFidelityDimensionsAtom(metrics, verdict, interactionRuntime);
}

function computeDebugOnly(opts, sourcePackage) {
  return computeDebugOnlyAtom(opts, sourcePackage);
}

function buildRuntimeAuthority(opts, runtimeSync) {
  return buildRuntimeAuthorityAtom(opts, runtimeSync, {
    resolveCanonicalRuntimePaths,
    rel,
  });
}

function topRuleGuardFixes(ruleGuard, limit = 3) {
  return topRuleGuardFixesAtom(ruleGuard, limit);
}

function classifyBlockerCategory(violation) {
  return classifyBlockerCategoryAtom(violation);
}

function deriveBlockerTaxonomy(metrics, visualFidelityRisk) {
  return deriveBlockerTaxonomyAtom(metrics, visualFidelityRisk);
}

function buildPreRuleGuardFixes(verdict, visualFidelityRisk, interactionRuntime, limit = 3) {
  return buildPreRuleGuardFixesAtom(verdict, visualFidelityRisk, interactionRuntime, limit);
}

function mergeNextFixes(primaryFixes, secondaryFixes, limit = 3) {
  return mergeNextFixesAtom(primaryFixes, secondaryFixes, limit);
}

function assessVisualFidelityRisk(paths, metrics, opts) {
  return assessVisualFidelityRiskAtom(paths, metrics, opts, {
    firstExistingPath,
    readJsonIfExists,
    rel,
  });
}


function buildRuntimeInteractionSmokeStep(paths, opts, sourceHtml) {
  return buildRuntimeInteractionSmokeStepAtom({
    paths,
    opts,
    sourceHtml,
    repoRoot: ROOT,
    helpers: {
      resolveCanonicalRuntimePaths,
      firstExistingPath,
      sidecarPath,
      readJsonIfExists,
      rel,
    },
  });
}

function assessInteractionRuntime(paths, steps, sourceHtml) {
  return assessInteractionRuntimeAtom({
    paths,
    steps,
    sourceHtml,
    helpers: {
      firstExistingPath,
      sidecarPath,
      readJsonIfExists,
      rel,
    },
  });
}

function writeSummaryAndExit(steps, detected, paths, opts, code) {
  const summary = buildSummary({
    opts,
    detected,
    paths,
    steps,
    metrics: {
      raw: extractPerfMetrics(paths.rawLayout),
      optimized: readJsonIfExists(paths.optimizeReport),
      final: extractPerfMetrics(paths.finalLayout),
      compare: readJsonIfExists(paths.comparePng.replace(/\.png$/i, '.pixel-diff.json')),
      htmlCocos: readJsonIfExists(paths.htmlCocosVerdict),
    },
    verdict: {
      rawPass: steps.some(step => step.step === 'dom-to-ui-json:raw' && step.ok),
      strictReplayPass: steps.some(step => step.step === 'dom-to-ui-json:strict-replay' && step.ok),
      comparePass: steps.some(step => step.step === 'dom-to-ui-compare' && step.ok),
      workflowPass: false,
      remainingIssues: steps.flatMap(step => step.issues || []),
    },
  });
  fs.writeFileSync(paths.summary, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`[run-html-to-ucuf-workflow] summary=${rel(paths.summary)}`);
  process.exit(code);
}

  return {
    rel,
    ensureDir,
    readText,
    readJsonIfExists,
    writeJson,
    hashFileIfExists,
    detectInputShape,
    runNodeStep,
    extractIssues,
    extractCompareMetrics,
    extractPerfMetrics,
    assessRuntimeReadiness,
    sanitizeUcufReadyHtml,
    buildPaths,
    resolveRuntimeSpecPaths,
    resolveCanonicalRuntimePaths,
    regenerateScreenLocalTokens,
    readRuntimeStateRoute,
    mergeRuntimeScreenContentContract,
    sidecarPath,
    firstExistingPath,
    copyJsonFile,
    allocateUiVersion,
    writeUiVersionArtifacts,
    readFinalTabRouting,
    buildRuntimeTabRoutingMap,
    syncFinalArtifactsToRuntime,
    injectDynamicTextContracts,
    normalizeInteractionTriggersFromLayout,
    runPerTabReplay,
    resolveUpdateCoverageBaseline,
    bootstrapFinalDraftFromRuntime,
    buildSummary,
    buildFidelityDimensions,
    computeDebugOnly,
    buildRuntimeAuthority,
    topRuleGuardFixes,
    classifyBlockerCategory,
    deriveBlockerTaxonomy,
    buildPreRuleGuardFixes,
    mergeNextFixes,
    assessVisualFidelityRisk,
    buildRuntimeInteractionSmokeStep,
    assessInteractionRuntime,
    writeSummaryAndExit,
  };
}

module.exports = {
  createWorkflowShellContext,
};
