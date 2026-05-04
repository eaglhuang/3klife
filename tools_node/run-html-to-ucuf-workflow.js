#!/usr/bin/env node
// doc_id: doc_other_0009 — recurring HTML -> UCUF workflow wrapper
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { resolveSourcePackage, writeSourcePackageManifest, writeHtmlWithSourceCss } = require('./lib/html-to-ucuf/source-package');
const { runRuleGuard } = require('./lib/html-to-ucuf/rule-guard');
const {
  assessReferencedFragmentGeometry,
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

function runNodeStep(label, scriptName, args, extraEnv) {
  console.log(`[run-html-to-ucuf-workflow] step=${label}`);
  const proc = cp.spawnSync(process.execPath, [path.resolve(ROOT, 'tools_node', scriptName), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { DOM_TO_UI_TELEMETRY: '0' }, extraEnv || {}),
    shell: false,
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  return proc;
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

function deriveTokenSuggestionPathFromLayout(layoutPath) {
  if (!layoutPath) return null;
  return path.resolve(layoutPath).replace(/\.json$/i, '.token-suggestions.json');
}

function normalizeColorValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const body = hexMatch[1];
    const normalized = body.length === 3
      ? body.split('').map((ch) => ch + ch).join('')
      : body;
    const hex = `#${normalized.toUpperCase()}`;
    return { key: hex.toLowerCase(), hex, raw };
  }
  const rgbMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const toHex = (n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16).padStart(2, '0').toUpperCase();
    const hex = `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
    return { key: hex.toLowerCase(), hex, raw };
  }
  return { key: raw.toLowerCase(), hex: null, raw };
}

function collectTokenSuggestionFiles(paths) {
  const files = [];
  const mainSuggestion = deriveTokenSuggestionPathFromLayout(paths.finalLayout);
  if (mainSuggestion && fs.existsSync(mainSuggestion)) files.push(mainSuggestion);

  if (paths.tabReplayDir && fs.existsSync(paths.tabReplayDir)) {
    for (const name of fs.readdirSync(paths.tabReplayDir)) {
      if (!/\.token-suggestions\.json$/i.test(name)) continue;
      const full = path.join(paths.tabReplayDir, name);
      if (fs.existsSync(full)) files.push(full);
    }
  }

  return [...new Set(files.map((file) => path.resolve(file)))];
}

function buildScreenLocalTokenPayload(screenId, suggestionFiles) {
  const colorMap = new Map();

  for (const file of suggestionFiles) {
    const json = readJsonIfExists(file);
    const list = json && Array.isArray(json.colorSuggestions) ? json.colorSuggestions : [];
    for (const item of list) {
      const normalized = normalizeColorValue(item && item.value);
      if (!normalized) continue;
      const current = colorMap.get(normalized.key) || {
        value: normalized.raw,
        normalized: normalized.key,
        hex: normalized.hex,
        occurrences: 0,
        nearestExisting: item && item.nearestExisting ? item.nearestExisting : null,
        sources: [],
      };
      current.occurrences += Number(item && item.occurrences) > 0 ? Number(item.occurrences) : 1;
      const relFile = rel(file);
      if (!current.sources.includes(relFile)) current.sources.push(relFile);
      if (!current.nearestExisting && item && item.nearestExisting) current.nearestExisting = item.nearestExisting;
      colorMap.set(normalized.key, current);
    }
  }

  const sorted = [...colorMap.values()].sort((a, b) => b.occurrences - a.occurrences || a.normalized.localeCompare(b.normalized));
  const safeScreenKey = String(screenId || 'screen').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'screen';
  const colors = {};
  const unresolvedColors = [];
  sorted.forEach((item, index) => {
    const token = `${safeScreenKey}_local_color_${String(index + 1).padStart(2, '0')}`;
    colors[token] = item.hex || item.value;
    unresolvedColors.push({
      token,
      value: item.value,
      normalized: item.normalized,
      hex: item.hex,
      occurrences: item.occurrences,
      nearestExisting: item.nearestExisting,
      sources: item.sources,
    });
  });

  return {
    schemaVersion: '1.0.0',
    screenId,
    generatedAt: new Date().toISOString(),
    // R-P5-AUTH-01: mark payload as source-derived so update-mode guards can detect and protect it
    _sourceAuthority: 'html-to-ucuf',
    policy: {
      mode: 'replace-all-per-run',
      source: 'token-suggestions sidecars',
      note: 'Always regenerate full screen-local tokens from current conversion to avoid stale residue.',
    },
    sourceSuggestionFiles: suggestionFiles.map((file) => rel(file)),
    stats: {
      unresolvedColorCount: unresolvedColors.length,
      tokenCount: Object.keys(colors).length,
    },
    colors,
    unresolvedColors,
  };
}

function buildLocalTokenDiff(previousPayload, nextPayload) {
  const previousSet = new Set(((previousPayload && previousPayload.unresolvedColors) || []).map((item) => String(item.normalized || '').toLowerCase()).filter(Boolean));
  const nextSet = new Set(((nextPayload && nextPayload.unresolvedColors) || []).map((item) => String(item.normalized || '').toLowerCase()).filter(Boolean));
  const added = [...nextSet].filter((key) => !previousSet.has(key)).sort();
  const removed = [...previousSet].filter((key) => !nextSet.has(key)).sort();
  const persisted = [...nextSet].filter((key) => previousSet.has(key)).sort();
  return {
    added,
    removed,
    persisted,
    addedCount: added.length,
    removedCount: removed.length,
    persistedCount: persisted.length,
    previousCount: previousSet.size,
    currentCount: nextSet.size,
  };
}

function buildLocalColorTokenLookup(payload) {
  const lookup = new Map();
  const list = Array.isArray(payload && payload.unresolvedColors) ? payload.unresolvedColors : [];
  for (const item of list) {
    if (!item || !item.token) continue;
    for (const value of [item.value, item.hex, item.normalized]) {
      const normalized = normalizeColorValue(value);
      if (normalized && normalized.key && !lookup.has(normalized.key)) {
        lookup.set(normalized.key, item.token);
      }
    }
  }
  return lookup;
}

function applyScreenLocalColorTokensToSkin(skinPath, localTokenPayload) {
  const skin = readJsonIfExists(skinPath);
  if (!skin || typeof skin !== 'object') return { applied: 0, path: null };

  const colorLookup = buildLocalColorTokenLookup(localTokenPayload);
  if (colorLookup.size === 0) return { applied: 0, path: rel(skinPath) };

  const colorKeys = new Set([
    'color',
    'borderColor',
    'outlineColor',
    'shadowColor',
    'strokeColor',
    'fillColor',
    'backgroundColor',
  ]);
  let applied = 0;

  const visit = (node, parentKey = '') => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, parentKey);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && colorKeys.has(key)) {
        const normalized = normalizeColorValue(value);
        const token = normalized ? colorLookup.get(normalized.key) : null;
        if (token) {
          node[key] = token;
          applied += 1;
        }
        continue;
      }
      visit(value, key);
    }
  };

  visit(skin);
  if (applied > 0) writeJson(skinPath, skin);
  return { applied, path: rel(skinPath) };
}

function regenerateScreenLocalTokens(paths, opts) {
  const runtimePaths = resolveCanonicalRuntimePaths(opts.screenId);
  const suggestionFiles = collectTokenSuggestionFiles(paths);
  const previous = readJsonIfExists(runtimePaths.screenLocalTokenPath);
  const payload = buildScreenLocalTokenPayload(opts.screenId, suggestionFiles);
  const diff = buildLocalTokenDiff(previous, payload);
  const skinTokenApply = applyScreenLocalColorTokensToSkin(paths.finalSkin, payload);

  // R-P5-AUTH-02: update-mode guard — don't wipe source-derived tokens with an empty payload.
  // If update-mode is active, the previous file had source authority, and the new payload has no
  // tokens (e.g. suggestion sidecars missing this run), preserve the existing file.
  const isUpdateModeWipe = opts && opts.updateMode
    && previous && previous._sourceAuthority === 'html-to-ucuf'
    && previous.stats && previous.stats.tokenCount > 0
    && payload.stats.tokenCount === 0;
  ensureDir(path.dirname(runtimePaths.screenLocalTokenPath));
  if (!isUpdateModeWipe) {
    writeJson(runtimePaths.screenLocalTokenPath, payload);
  }
  writeJson(paths.localTokenDiffReport, {
    schemaVersion: '1.0.0',
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    sourceSuggestionFiles: payload.sourceSuggestionFiles,
    policy: payload.policy,
    diff,
  });

  return {
    status: 'pass',
    mode: payload.policy.mode,
    sourceSuggestionFiles: payload.sourceSuggestionFiles,
    localTokenPath: rel(runtimePaths.screenLocalTokenPath),
    diffReportPath: rel(paths.localTokenDiffReport),
    unresolvedColorCount: payload.stats.unresolvedColorCount,
    tokenCount: payload.stats.tokenCount,
    preservedByUpdateModeGuard: isUpdateModeWipe || false,
    skinTokenApply,
    diff,
  };
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

function deriveFragmentPrefix(screenId) {
  return String(screenId || '').trim().replace(/-main$/i, '') || 'screen';
}

function toKebab(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toPascal(value) {
  return String(value || '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
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
  return readJsonIfExists(sidecarPath(paths.finalLayout, '.tab-routing.json'));
}

function buildRuntimeTabRoutingMap(tabRoutingSidecar, existingMap) {
  const next = {};
  const existing = existingMap && typeof existingMap === 'object' ? existingMap : {};
  const tabs = Array.isArray(tabRoutingSidecar && tabRoutingSidecar.tabs) ? tabRoutingSidecar.tabs : [];
  for (const tab of tabs) {
    if (!tab || !tab.id || !tab.mount) continue;
    next[tab.id] = Object.assign({}, existing[tab.id] || {}, {
      slotId: tab.mount,
      fragment: tab.fragment || (existing[tab.id] && existing[tab.id].fragment) || null,
    });
    if (!next[tab.id].fragment) delete next[tab.id].fragment;
  }
  return next;
}

function syncFinalArtifactsToRuntime(paths, opts, uiVersion) {
  if (!opts.runtimeSync) return { skipped: true, reason: 'disabled' };
  const runtime = resolveCanonicalRuntimePaths(opts.screenId);
  const layoutSource = firstExistingPath([paths.finalLayout, paths.optimizedLayout, paths.rawLayout]);
  const skinSource = firstExistingPath([paths.finalSkin, paths.rawSkin]);
  const screenDraftSource = firstExistingPath([
    sidecarPath(paths.finalLayout, '.screen.json'),
  ]);
  const tabRoutingSidecar = readFinalTabRouting(paths);
  const existingScreen = readJsonIfExists(runtime.screenPath) || {};
  const screenDraft = screenDraftSource ? readJsonIfExists(screenDraftSource) : null;
  const runtimeRoute = readRuntimeStateRoute(opts.screenId);
  const tabRouting = buildRuntimeTabRoutingMap(tabRoutingSidecar, existingScreen.tabRouting);

  const copied = {};
  copied.layout = copyJsonFile(layoutSource, runtime.layoutPath);
  copied.layoutAlias = copyJsonFile(layoutSource, runtime.layoutAliasPath);
  copied.skin = copyJsonFile(skinSource, runtime.skinPath);

  // Plan 4：新轉換以 source-authoritative screen 為準；只有 update-mode 才保留既有 runtime 欄位。
  const screen = opts.updateMode ? Object.assign({}, existingScreen) : {};
  screen.id = screen.id || screenDraft && (screenDraft.id || screenDraft.screenId) || opts.screenId;
  // Keep runtime screen version numeric when present; runtime-state-registry validates this strictly.
  const existingVersion = typeof existingScreen.version === 'number' ? existingScreen.version : null;
  const draftVersion = screenDraft && typeof screenDraft.version === 'number' ? screenDraft.version : null;
  const routeVersion = runtimeRoute && typeof runtimeRoute.screenVersion === 'number' ? runtimeRoute.screenVersion : null;
  screen.version = existingVersion || draftVersion || routeVersion || 2;
  screen.uiId = screen.uiId || opts.screenId;
  screen.layout = opts.screenId;
  screen.skin = `${opts.screenId}.skin`;
  screen.bundle = opts.bundle || screen.bundle || null;
  screen.meta = Object.assign({}, screen.meta || {}, {
    htmlToUcufPlan4: true,
    runtimeAuthority: 'synced-final-runtime-json',
  });
  const preservedScreenContracts = mergeRuntimeScreenContentContract(screen, screenDraft, existingScreen, runtimeRoute);
  if (uiVersion) {
    screen.runtimeVersion = uiVersion;
    screen.runtimeVersionUpdatedAt = new Date().toISOString();
  }
  if (screenDraft && screenDraft.preview && !screen.preview) screen.preview = screenDraft.preview;
  if (Object.keys(tabRouting).length > 0) {
    screen.tabRouting = tabRouting;
  } else {
    delete screen.tabRouting;
  }
  writeJson(runtime.screenPath, screen);
  copied.screen = rel(runtime.screenPath);

  const sidecars = [
    ['.screen.json', `${opts.screenId}.screen.json`],
    ['.preload.json', `${opts.screenId}.preload.json`],
    ['.performance.json', `${opts.screenId}.performance.json`],
    ['.composite.json', `${opts.screenId}.composite.json`],
    ['.bundle-suggestion.json', `${opts.screenId}.bundle-suggestion.json`],
    ['.interaction.json', `${opts.screenId}.interaction.json`],
    ['.motion.json', `${opts.screenId}.motion.json`],
    ['.fragment-routes.json', `${opts.screenId}.fragment-routes.json`],
    ['.tab-routing.json', `${opts.screenId}.tab-routing.json`],
    ['.logic-inventory.json', `${opts.screenId}.logic-inventory.json`],
    ['.logic-guard.json', `${opts.screenId}.logic-guard.json`],
    ['.r-guard.json', `${opts.screenId}.r-guard.json`],
    ['.visual-review.json', `${opts.screenId}.visual-review.json`],
  ];
  // Zone ownership is a standalone artifact (not a finalLayout sidecar); sync if present.
  if (paths.zoneOwnership && fs.existsSync(paths.zoneOwnership)) {
    const destZone = path.join(runtime.screensDir, `${opts.screenId}.zone-ownership.json`);
    const zoneCopied = copyJsonFile(paths.zoneOwnership, destZone);
    if (zoneCopied) copied.zoneOwnership = zoneCopied;
  }
  // Bake manifest is a layout sidecar consumed by readiness visual-policy checks.
  const bakeManifestSource = firstExistingPath([sidecarPath(paths.finalLayout, '.bake-manifest.json')]);
  if (bakeManifestSource) {
    const bakeDest = path.join(runtime.layoutsDir, `${opts.screenId}.layout.bake-manifest.json`);
    const bakeCopied = copyJsonFile(bakeManifestSource, bakeDest);
    if (bakeCopied) copied.bakeManifest = bakeCopied;
  }
  copied.sidecars = [];
  for (const [suffix, fileName] of sidecars) {
    // Plan 4.1: formal runtime sync 只能吃 final sidecar，不能用 raw sidecar 補洞代測。
    const sourcePath = firstExistingPath([sidecarPath(paths.finalLayout, suffix)]);
    const copiedPath = copyJsonFile(sourcePath, path.join(runtime.screensDir, fileName));
    if (copiedPath) copied.sidecars.push(copiedPath);
  }

  return {
    skipped: false,
    layoutSource: layoutSource ? rel(layoutSource) : null,
    skinSource: skinSource ? rel(skinSource) : null,
    tabCount: Object.keys(tabRouting).length,
    preservedScreenContracts,
    copied,
  };
}

function normalizeFragmentLayout(layout, tabId, slotWidth = null) {
  const root = layout && layout.root ? layout.root : layout;
  if (!root || typeof root !== 'object') return null;
  root.name = `Tab${toPascal(tabId)}Content`;
  root.widget = { top: 0, left: 0, right: 0, bottom: 0 };
  delete root.x;
  delete root.y;
  delete root.width;
  delete root.height;
  pinPrimaryFragmentContentWrapper(root);
  stretchOversizedFullWidthNodes(root, slotWidth);
  return root;
}

function pinPrimaryFragmentContentWrapper(root) {
  if (!root || !Array.isArray(root.children) || root.children.length !== 1) return;
  const child = root.children[0];
  if (!child || typeof child !== 'object') return;
  if (child.widget && typeof child.widget === 'object') return;

  // Per-tab fragment often has a single logical wrapper as the only child.
  // Without explicit widget edges, Cocos may place this wrapper with default local transform,
  // causing visible vertical drift (content appears too low).
  child.widget = { top: 0, left: 0, right: 0, bottom: 0 };
  delete child.x;
  delete child.y;
  delete child.width;
  delete child.height;
}

function findLayoutNodeByName(node, name) {
  if (!node || typeof node !== 'object') return null;
  if (node.name === name) return node;
  if (!Array.isArray(node.children)) return null;
  for (const child of node.children) {
    const hit = findLayoutNodeByName(child, name);
    if (hit) return hit;
  }
  return null;
}

function resolveSlotWidth(layoutPath, slotId) {
  if (!layoutPath || !slotId) return null;
  const layout = readJsonIfExists(layoutPath);
  const root = layout && layout.root ? layout.root : layout;
  if (!root) return null;
  const slotNode = findLayoutNodeByName(root, slotId);
  if (!slotNode || typeof slotNode.width !== 'number' || !Number.isFinite(slotNode.width)) {
    return null;
  }
  return slotNode.width;
}

function isDynamicTextCandidateForContract(node) {
  const text = String(node && node.text || '').trim();
  if (!text) return false;
  if (/^[A-Z]{2,12}$/.test(text)) return false;
  if (/^[★←›‹×✕]+$/.test(text)) return false;
  if (/^(返回|確認|取消|將|屬|命|技|寶|兵|適|傳)$/.test(text)) return false;
  return /\d|%|張飛|翼德|武|統|智|政|魅|運|血脈|傳記|[，。；]/.test(text) || text.length >= 8;
}

function hasTextBindingContract(node) {
  if (!node || typeof node !== 'object') return false;
  return !!(node.bind || node.bindPath || node.dataContract || node.contract || node.i18nKey || node.contentPath || node.textKey);
}

function sanitizeKeySegment(input) {
  return String(input || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function injectDynamicTextContracts(layoutPath, screenId) {
  const layout = readJsonIfExists(layoutPath);
  if (!layout) return { updated: 0 };
  const root = layout && layout.root ? layout.root : layout;
  let updated = 0;

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ((node.type === 'label' || node.text != null) && isDynamicTextCandidateForContract(node) && !hasTextBindingContract(node)) {
      const nodeKey = sanitizeKeySegment(node.name || node.id || `text-${updated + 1}`);
      const screenKey = sanitizeKeySegment(screenId);
      node.textKey = `auto.${screenKey}.${nodeKey}`;
      updated += 1;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };

  walk(root);
  if (updated > 0) writeJson(layoutPath, layout);
  return { updated };
}

function normalizeInteractionTriggersFromLayout(paths) {
  const layout = readJsonIfExists(paths.finalLayout);
  const interactionPath = sidecarPath(paths.finalLayout, '.interaction.json');
  const interaction = readJsonIfExists(interactionPath);
  if (!layout || !interaction || !Array.isArray(interaction.actions)) return { updated: 0 };
  const root = layout && layout.root ? layout.root : layout;
  const triggerByActionId = new Map();
  const triggerByActionType = new Map();

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node._interactionId && typeof node._interactionId === 'string' && node.name) {
      triggerByActionId.set(node._interactionId, node.name);
      // Also index by the action-type suffix (e.g. "open-panel", "close-modal") for fallback matching
      const typeSuffix = node._interactionId.split('.').pop();
      if (typeSuffix && !triggerByActionType.has(typeSuffix)) {
        triggerByActionType.set(typeSuffix, node.name);
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };
  walk(root);

  let updated = 0;
  for (const action of interaction.actions) {
    // Exact match first
    let mappedTrigger = triggerByActionId.get(action && action.id);
    // Fallback: match by action-type suffix (e.g. action.type "openPanel" → "open-panel")
    if (!mappedTrigger && action && action.type) {
      const typeSuffix = action.type.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase()).replace(/^-/, '');
      mappedTrigger = triggerByActionType.get(typeSuffix);
    }
    if (!mappedTrigger) continue;
    if (action.trigger !== mappedTrigger) {
      action.trigger = mappedTrigger;
      updated += 1;
    }
  }
  if (updated > 0) writeJson(interactionPath, interaction);
  return { updated };
}

function collectWidths(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (typeof node.width === 'number' && Number.isFinite(node.width) && node.width > 0) {
    out.push(node.width);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectWidths(child, out);
  }
  return out;
}

function stretchOversizedFullWidthNodes(root, slotWidth) {
  if (!root || !slotWidth || !Number.isFinite(slotWidth)) return;
  const widths = collectWidths(root, []);
  if (widths.length === 0) return;

  // 片段常把 full-width row 寫死為同一寬度；挑出主要寬度作為可拉伸候選。
  const freq = new Map();
  for (const w of widths) {
    const key = Math.round(w);
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  let dominantWidth = null;
  let dominantCount = 0;
  for (const [w, count] of freq.entries()) {
    if (w <= slotWidth + 8) continue;
    if (count > dominantCount || (count === dominantCount && (dominantWidth == null || w > dominantWidth))) {
      dominantWidth = w;
      dominantCount = count;
    }
  }
  if (dominantWidth == null || dominantCount < 2) return;

  const stretch = (node, parentLayoutType = null) => {
    if (!node || typeof node !== 'object') return;

    const currentLayoutType = node.layout && typeof node.layout === 'object' ? node.layout.type : null;
    const canUseStretch = parentLayoutType === 'vertical' || parentLayoutType === 'horizontal' || parentLayoutType === '__ROOT__';
    const isDominantFullWidth = typeof node.width === 'number' && Math.abs(node.width - dominantWidth) <= 2;

    if (canUseStretch && isDominantFullWidth) {
      node.widget = Object.assign({}, node.widget || {}, { left: 0, right: 0 });
      delete node.width;
      delete node.x;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) stretch(child, currentLayoutType);
    }
  };

  stretch(root, '__ROOT__');
}

function mergeSkinSlots(targetSkinPath, fragmentSkinPath) {
  const target = readJsonIfExists(targetSkinPath);
  const fragment = readJsonIfExists(fragmentSkinPath);
  if (!target || !fragment || !fragment.slots || typeof fragment.slots !== 'object') {
    return { merged: 0 };
  }
  target.slots = target.slots && typeof target.slots === 'object' ? target.slots : {};
  let merged = 0;
  for (const [slotId, slot] of Object.entries(fragment.slots)) {
    target.slots[slotId] = slot;
    merged += 1;
  }
  target.meta = Object.assign({}, target.meta || {}, {
    perTabReplayMergedAt: new Date().toISOString(),
  });
  writeJson(targetSkinPath, target);
  return { merged };
}

function pickPerTabReplayTabs(routing) {
  const routedTabs = routing && Array.isArray(routing.tabs) ? routing.tabs : [];
  return routedTabs
    .filter(tab => tab && tab.id && tab.fragment && (tab.mount || tab.slotId))
    .filter(tab => !/^(?:pool-)?(?:prev|next|previous)$/i.test(toKebab(tab.key || tab.id)))
    .map(tab => ({ id: tab.id, key: toKebab(tab.key || tab.id), mount: tab.mount || tab.slotId || null }));
}

function deriveChildPanelClass(screenId, tabKey) {
  const screen = toPascal(String(screenId || '').replace(/-main$/i, ''));
  const tab = toPascal(tabKey);
  return screen && tab ? `${screen}${tab}ChildPanel` : null;
}

function writePerTabReplayRouting(paths, opts, previousRouting, fragments) {
  const prefix = deriveFragmentPrefix(opts.screenId);
  const previousTabs = previousRouting && Array.isArray(previousRouting.tabs) ? previousRouting.tabs : [];
  const previousById = new Map(previousTabs.map(tab => [toKebab(tab && (tab.id || tab.key)), tab]));
  const nextTabs = [];
  for (const fragment of fragments || []) {
    if (!fragment || !fragment.ok || !fragment.id || !fragment.key) continue;
    const key = toKebab(fragment.key || fragment.id);
    const previous = previousById.get(toKebab(fragment.id)) || previousById.get(key) || {};
    const mount = fragment.hostName || previous.mount || previous.slotId || null;
    nextTabs.push(Object.assign({}, previous, {
      id: fragment.id,
      key,
      mount,
      mountSource: fragment.hostName ? `source-dom:${fragment.hostSource || 'tab-content-host'}` : (previous.mountSource || 'missing-tab-content-host'),
      lifecycle: 'lazy',
      fragment: `fragments/layouts/${prefix}-${key}-content`,
      childPanelClass: previous.childPanelClass || deriveChildPanelClass(opts.screenId, key),
      replaySourceHtml: fragment.sourceHtml || null,
    }));
  }
  const sidecar = {
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    source: 'per-tab-replay',
    tabs: nextTabs,
    summary: {
      tabCount: nextTabs.length,
      mountSlotIds: [...new Set(nextTabs.map(tab => tab.mount).filter(Boolean))],
      missingMountCount: nextTabs.filter(tab => !tab.mount).length,
      missingTriggerCount: nextTabs.filter(tab => !tab.buttonNode).length,
    },
  };
  writeJson(sidecarPath(paths.finalLayout, '.tab-routing.json'), sidecar);
  return sidecar;
}

function updateLazySlotDefaultFragments(layoutPath, tabRouting) {
  const layout = readJsonIfExists(layoutPath);
  if (!layout || !layout.root) return { changed: 0 };
  const firstFragmentByMount = new Map();
  for (const tab of tabRouting && tabRouting.tabs || []) {
    if (tab && tab.mount && tab.fragment && !firstFragmentByMount.has(tab.mount)) {
      firstFragmentByMount.set(tab.mount, tab.fragment);
    }
  }
  let changed = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.lazySlot && node.name && firstFragmentByMount.has(node.name)) {
      node.defaultFragment = firstFragmentByMount.get(node.name);
      node.warmupHint = node.warmupHint || 'first-frame';
      changed += 1;
    }
    for (const child of node.children || []) walk(child);
  };
  walk(layout.root);
  if (changed > 0) writeJson(layoutPath, layout);
  return { changed };
}

function runPerTabReplay(paths, opts, sourcePackage, inputPath) {
  if (!opts.perTabReplay) return { skipped: true, reason: 'disabled' };
  const routing = readFinalTabRouting(paths);
  const tabs = pickPerTabReplayTabs(routing);

  ensureDir(paths.tabReplayDir);
  const renderArgs = [
    '--input', inputPath,
    '--output-dir', paths.tabReplayDir,
    '--screen-id', opts.screenId,
    '--viewport', opts.viewport,
    '--settle-ms', String(opts.settleMs),
  ];
  // Plan 4.1：沒有可靠 final tab-routing 時，直接由 source DOM 的 role/data-tab/aria-controls 發現 tabs。
  if (tabs.length > 0) renderArgs.push('--tabs', tabs.map(tab => tab.key).join(','));
  if (opts.browser) renderArgs.push('--browser', opts.browser);
  const renderProc = runNodeStep('render-html-tab-fragments', 'render-html-tab-fragments.js', renderArgs);

  const manifestPath = path.join(paths.tabReplayDir, `${opts.screenId}.tab-fragments.json`);
  const manifest = readJsonIfExists(manifestPath);
  const result = {
    skipped: false,
    renderExitCode: renderProc.status ?? 1,
    manifest: rel(manifestPath),
    fragments: [],
    mergedSkinSlots: 0,
  };
  if (renderProc.status !== 0 || !manifest) {
    result.ok = false;
    result.error = 'render-tab-fragments-failed';
    return result;
  }

  const runtime = resolveCanonicalRuntimePaths(opts.screenId);
  const prefix = deriveFragmentPrefix(opts.screenId);
  const slotWidthByTabId = new Map();
  for (const tab of tabs) {
    const width = resolveSlotWidth(paths.finalLayout, tab.mount);
    if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
      slotWidthByTabId.set(tab.id, width);
    }
  }
  for (const tab of manifest.tabs || []) {
    if (!tab.ok || !tab.html) {
      result.fragments.push({ id: tab.id, ok: false, error: tab.error || 'missing-html' });
      continue;
    }
    const key = toKebab(tab.key || tab.id);
    const fragmentScreenId = `${prefix}-tab-${key}`;
    const layoutOut = path.join(paths.tabReplayDir, `${fragmentScreenId}.layout.json`);
    const skinOut = path.join(paths.tabReplayDir, `${fragmentScreenId}.skin.json`);
    const args = [
      '--input', tab.html,
      '--output', layoutOut,
      '--skin-output', skinOut,
      '--screen-id', fragmentScreenId,
      '--skin-id', `${opts.screenId}.skin`,
      '--viewport', opts.viewport,
      '--bundle', opts.bundle,
      '--emit-performance-report',
      '--emit-warnings',
      '--warn-only',
      '--no-backup',
    ];
    const tokensSourcePath = sourcePackage && sourcePackage.tokensPath ? sourcePackage.tokensPath : null;
    const sourceCssPath = sourcePackage && sourcePackage.cssPath ? sourcePackage.cssPath : null;
    if (tokensSourcePath && fs.existsSync(tokensSourcePath)) {
      args.push('--tokens-source', tokensSourcePath);
    }
    if (sourceCssPath && fs.existsSync(sourceCssPath)) {
      args.push('--source-css', sourceCssPath);
    }
    args.push('--use-computed-style');

    const proc = runNodeStep(`dom-to-ui-json:tab-fragment:${key}`, 'dom-to-ui-json.js', args);
    const converted = readJsonIfExists(layoutOut);
    const normalized = normalizeFragmentLayout(converted, tab.id, slotWidthByTabId.get(tab.id) || null);
    const fragmentTarget = path.join(runtime.fragmentsDir, `${prefix}-${key}-content.json`);
    if (proc.status === 0 && normalized) {
      writeJson(fragmentTarget, normalized);
      const merge = mergeSkinSlots(paths.finalSkin, skinOut);
      result.mergedSkinSlots += merge.merged;
      result.fragments.push({
        id: tab.id,
        key,
        ok: true,
        layout: rel(fragmentTarget),
        sourceHtml: rel(tab.html),
        fragment: `fragments/layouts/${prefix}-${key}-content`,
        hostName: tab.hostName || null,
        hostSource: tab.hostSource || null,
        mergedSkinSlots: merge.merged,
        childCount: tab.childCount,
        textLength: tab.textLength,
      });
    } else {
      result.fragments.push({
        id: tab.id,
        key,
        ok: false,
        exitCode: proc.status ?? 1,
        error: normalized ? 'fragment-conversion-failed' : 'fragment-layout-empty',
      });
    }
  }
  result.ok = result.fragments.length > 0 && result.fragments.every(fragment => fragment.ok);
  if (result.ok) {
    const nextRouting = writePerTabReplayRouting(paths, opts, routing, result.fragments);
    const lazySlotUpdate = updateLazySlotDefaultFragments(paths.finalLayout, nextRouting);
    result.tabRoutingPath = rel(sidecarPath(paths.finalLayout, '.tab-routing.json'));
    result.tabRoutingCount = nextRouting.tabs.length;
    result.lazySlotDefaultUpdated = lazySlotUpdate.changed;
  }
  return result;
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
  const debugInfo = computeDebugOnly(args.opts, args.sourcePackage);
  const visualFidelityRisk = args.visualFidelityRisk || assessVisualFidelityRisk(args.paths, args.metrics, args.opts);
  const interactionRuntime = args.interactionRuntime || assessInteractionRuntime(args.paths, args.steps, args.sourceHtml);
  return {
    input: rel(args.opts.input),
    sourcePackage: args.sourcePackage && args.sourcePackage.manifest ? args.sourcePackage.manifest : null,
    screenId: args.opts.screenId,
    bundle: args.opts.bundle,
    debugOnly: debugInfo.debugOnly,
    debugOnlyReasons: debugInfo.reasons,
    runtimeAuthority: args.runtimeAuthority || buildRuntimeAuthority(args.opts, null),
    ruleGuard: args.ruleGuard || { status: 'not-run', blockerCount: 0, warningCount: 0, violations: [] },
    visualFidelityRisk,
    interactionRuntime,
    tokenGovernance: args.tokenGovernance || null,
    nextFixes: args.nextFixes || [],
    detected: args.detected,
    paths: Object.fromEntries(Object.entries(args.paths).map(([k, v]) => [k, rel(v)])),
    finalCapture: {
      editorScreenshot: args.opts.editorScreenshot ? rel(args.opts.editorScreenshot) : null,
      captureProtocol: args.opts.captureProtocol ? rel(args.opts.captureProtocol) : null,
      captureReport: args.opts.captureReport ? rel(args.opts.captureReport) : null,
      authority: args.metrics && args.metrics.htmlCocos ? args.metrics.htmlCocos.captureAuthority || null : null,
    },
    steps: args.steps,
    metrics: args.metrics,
    verdict: args.verdict,
    // R-P5-AUTH-01: spec file integrity hashes for authority chain verification
    specHashes: {
      rawLayout: hashFileIfExists(args.paths && args.paths.rawLayout),
      rawSkin: hashFileIfExists(args.paths && args.paths.rawSkin),
      finalLayout: hashFileIfExists(args.paths && args.paths.finalLayout),
      finalSkin: hashFileIfExists(args.paths && args.paths.finalSkin),
      runtimeLayout: (function () {
        const rp = resolveCanonicalRuntimePaths(args.opts && args.opts.screenId);
        return rp ? hashFileIfExists(rp.layoutPath) : null;
      }()),
      runtimeSkin: (function () {
        const rp = resolveCanonicalRuntimePaths(args.opts && args.opts.screenId);
        return rp ? hashFileIfExists(rp.skinPath) : null;
      }()),
    },
    generatedAt: new Date().toISOString(),
  };
}

function computeDebugOnly(opts, sourcePackage) {
  const reasons = [];
  if (!sourcePackage) reasons.push('input-debug-entry');
  if (opts.skipEditorCompare) reasons.push('editor-compare-skipped');
  if (sourcePackage && !opts.editorScreenshot) reasons.push('editor-screenshot-missing');
  if (sourcePackage && !opts.captureProtocol) reasons.push('capture-protocol-missing');
  if (sourcePackage && !opts.captureReport) reasons.push('capture-report-missing');
  if (!opts.runtimeSync) reasons.push('runtime-sync-disabled');
  if (!opts.perTabReplay) reasons.push('per-tab-replay-disabled');
  return { debugOnly: reasons.length > 0, reasons };
}

function buildRuntimeAuthority(opts, runtimeSync) {
  const runtime = resolveCanonicalRuntimePaths(opts.screenId);
  const copied = runtimeSync && runtimeSync.copied || {};
  const synced = !!(runtimeSync && !runtimeSync.skipped && copied.layout && copied.skin && copied.screen);
  return {
    authority: synced ? 'synced-final-runtime-json' : 'debug-local-final-json',
    screen: rel(runtime.screenPath),
    layout: rel(runtime.layoutPath),
    skin: rel(runtime.skinPath),
    synced,
  };
}

function topRuleGuardFixes(ruleGuard, limit = 3) {
  return ((ruleGuard && ruleGuard.violations) || [])
    .filter(item => item && item.severity === 'blocker')
    .slice(0, limit)
    .map(item => ({
      ruleId: item.ruleId,
      summary: item.summary,
      fixAction: item.fixAction,
      evidence: item.evidence,
    }));
}

function assessVisualFidelityRisk(paths, metrics, opts) {
  const violations = [];
  const skinPath = firstExistingPath([
    paths && paths.finalSkin,
    paths && paths.rawSkin,
  ]);
  const skin = readJsonIfExists(skinPath);
  if (skin && skin.slots) {
    for (const [slotId, slot] of Object.entries(skin.slots)) {
      collectVisualRiskFromSlot(slot, `skin.slots.${slotId}`, violations);
    }
  }

  const visualReview = readJsonIfExists(paths && paths.rawLayout ? paths.rawLayout.replace(/\.json$/i, '.visual-review.json') : null);
  if (visualReview && /fail|blocker/i.test(String(visualReview.verdict || visualReview.status || ''))) {
    violations.push({
      ruleId: 'H2U-P4-019',
      severity: 'blocker',
      summary: 'visual-review reported blocker/fail',
      evidence: JSON.stringify({ verdict: visualReview.verdict || null, status: visualReview.status || null }),
      fixAction: 'Fix visual-review blockers before formal pass.',
    });
  }

  const runtimeVsSource = metrics && metrics.htmlCocos && metrics.htmlCocos.runtimeVsSource
    ? metrics.htmlCocos.runtimeVsSource
    : null;
  const adjustedScore = runtimeVsSource && typeof runtimeVsSource.adjustedScore === 'number'
    ? runtimeVsSource.adjustedScore
    : null;
  const finalScoreThreshold = (opts && typeof opts.finalScoreThreshold === 'number') ? opts.finalScoreThreshold : 0.95;

  if (adjustedScore !== null && adjustedScore < finalScoreThreshold) {
    const delta = (finalScoreThreshold - adjustedScore).toFixed(3);
    const taxonomy = runtimeVsSource.blockerTaxonomy || null;
    const taxonomyStr = taxonomy
      ? (typeof taxonomy.primaryCause === 'string' ? taxonomy.primaryCause : (Array.isArray(taxonomy.categories) ? taxonomy.categories.join(', ') : JSON.stringify(taxonomy)))
      : 'unknown — run with capture protocol to classify';
    violations.push({
      ruleId: 'H2U-P5-003',
      severity: 'blocker',
      summary: `Cocos final gate adjustedScore ${adjustedScore.toFixed(3)} < ${finalScoreThreshold} (delta=${delta})`,
      evidence: JSON.stringify({
        adjustedScore,
        threshold: finalScoreThreshold,
        verdict: runtimeVsSource.verdict || null,
        taxonomy: taxonomyStr,
      }),
      fixAction: 'Investigate renderer parity gaps: radial/gradient, shadow, background-layers, rounded-rect. Re-run after fixing CSS extraction or runtime renderer fallbacks.',
    });
  }

  const blockerCount = violations.filter(item => item.severity === 'blocker').length;
  return {
    status: blockerCount > 0 ? 'blocker' : 'pass',
    blockerCount,
    violations,
    source: skinPath ? rel(skinPath) : null,
    htmlCocosVerdict: runtimeVsSource ? runtimeVsSource.verdict : null,
    htmlCocosAdjustedScore: adjustedScore,
  };
}

function collectVisualRiskFromSlot(slot, evidence, out) {
  if (!slot || typeof slot !== 'object') return;
  const risk = slot.unsupportedLayerRisk || slot.visualFidelityRisk;
  if (risk) {
    out.push({
      ruleId: 'H2U-P4-016',
      severity: /warn/i.test(String(risk.severity || risk.status || '')) ? 'warning' : 'blocker',
      summary: risk.summary || 'skin slot has unsupported visual fidelity risk',
      evidence,
      fixAction: risk.fixAction || 'Preserve backgroundLayers or assetize the unsupported layer.',
    });
  }
  if (slot.gradient && slot.gradient.type === 'radial' && (!Array.isArray(slot.gradient.stops) || slot.gradient.stops.length < 2)) {
    out.push({
      ruleId: 'H2U-P4-017',
      severity: 'blocker',
      summary: 'radial gradient is missing stop metadata',
      evidence,
      fixAction: 'Emit radial gradient stops and geometry before formal pass.',
    });
  }
}

function buildRuntimeInteractionSmokeStep(paths, opts, sourceHtml) {
  const runtime = resolveCanonicalRuntimePaths(opts.screenId);
  const interactionPath = path.join(runtime.screensDir, `${opts.screenId}.interaction.json`);
  const tabRoutingPath = path.join(runtime.screensDir, `${opts.screenId}.tab-routing.json`);
  const interaction = readJsonIfExists(interactionPath);
  const actions = interaction && Array.isArray(interaction.actions) ? interaction.actions : [];
  const required = actions.length > 0 || /data-ucuf-action|tabSwitch|switchTab|pool-prev|pool-next/i.test(String(sourceHtml || ''));
  const base = {
    step: 'runtime-interaction-smoke',
    required,
    interaction: rel(interactionPath),
    tabRouting: fs.existsSync(tabRoutingPath) ? rel(tabRoutingPath) : null,
    actionsDeclared: actions.length,
    actionsBound: 0,
    smokeResults: [],
  };
  if (!required) return Object.assign(base, { exitCode: 0, ok: true, skipped: true, reason: 'no-interaction-sidecar-or-source-action' });
  if (!opts.runtimeSync) return Object.assign(base, { exitCode: 1, ok: false, error: 'runtime-sync-disabled' });
  if (!interaction) return Object.assign(base, { exitCode: 1, ok: false, error: 'synced-interaction-sidecar-missing' });

  const screen = readJsonIfExists(runtime.screenPath);
  const layout = readJsonIfExists(runtime.layoutPath);
  const tabRouting = readJsonIfExists(tabRoutingPath);
  const nodeIndex = collectLayoutNodeIndex(layout && layout.root);
  const routeMap = buildInteractionRouteMap(screen, tabRouting);
  const lazySlots = new Set([...nodeIndex.values()].filter(node => node && node.lazySlot).map(node => node.name).filter(Boolean));
  const results = [];

  for (const action of actions) {
    const actionId = action && action.id || `${action && action.trigger || 'unknown'}.${action && action.type || 'action'}`;
    const trigger = action && action.trigger || '';
    const target = action && (action.target || action.smoke && action.smoke.expectActiveTab) || '';
    if (!action || !['tabSwitch', 'openPanel', 'closeModal'].includes(action.type)) {
      results.push({ actionId, trigger, target, status: 'unsupported-action-type' });
      continue;
    }
    const button = nodeIndex.get(trigger);
    if (!button) {
      results.push({ actionId, trigger, target, status: 'missing-trigger' });
      continue;
    }
    if (action.type === 'openPanel' || action.type === 'closeModal') {
      const targetNode = target && target !== 'self' ? nodeIndex.get(target) : button;
      if (!targetNode) {
        results.push({ actionId, trigger, target, status: 'missing-panel-target' });
        continue;
      }
      results.push({ actionId, trigger, target, status: 'bound' });
      continue;
    }
    const route = resolveInteractionRoute(routeMap, target);
    if (!route || !route.slotId || !route.fragment) {
      results.push({ actionId, trigger, target, status: 'missing-route' });
      continue;
    }
    if (lazySlots.size > 0 && !lazySlots.has(route.slotId)) {
      results.push({ actionId, trigger, target, status: 'missing-slot', slotId: route.slotId, fragment: route.fragment });
      continue;
    }
    const fragmentPath = path.join(ROOT, 'assets', 'resources', 'ui-spec', `${route.fragment}.json`);
    if (!fs.existsSync(fragmentPath)) {
      results.push({ actionId, trigger, target, status: 'missing-fragment', slotId: route.slotId, fragment: route.fragment });
      continue;
    }
    results.push({ actionId, trigger, target, status: 'bound', slotId: route.slotId, fragment: route.fragment });
  }

  const actionsBound = results.filter(result => result.status === 'bound').length;
  const ok = results.length > 0 && actionsBound === results.length;
  return Object.assign(base, {
    exitCode: ok ? 0 : 1,
    ok,
    actionsBound,
    smokeResults: results,
    error: ok ? null : 'runtime-interaction-smoke-failed',
  });
}

function collectLayoutNodeIndex(root) {
  const out = new Map();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const key of [node.id, node.name]) {
      if (typeof key === 'string' && key.trim()) out.set(key.trim(), node);
    }
    for (const child of node.children || []) walk(child);
  };
  walk(root);
  return out;
}

function buildInteractionRouteMap(screen, tabRouting) {
  const out = new Map();
  const add = (key, route) => {
    if (!key || !route || !route.slotId || !route.fragment) return;
    out.set(normalizeInteractionKey(key), { slotId: route.slotId, fragment: route.fragment });
  };
  if (screen && screen.tabRouting && typeof screen.tabRouting === 'object') {
    for (const [key, route] of Object.entries(screen.tabRouting)) add(key, route);
  }
  if (tabRouting && Array.isArray(tabRouting.tabs)) {
    for (const tab of tabRouting.tabs) {
      const slotId = tab && (tab.slotId || tab.mount);
      const fragment = tab && tab.fragment;
      add(tab && (tab.id || tab.key), slotId && fragment ? { slotId, fragment } : null);
    }
  }
  return out;
}

function resolveInteractionRoute(routeMap, target) {
  const key = normalizeInteractionKey(target);
  const direct = routeMap.get(key);
  if (direct) return direct;
  if (/^(?:pool-)?prev(?:ious)?$/.test(key)) return Array.from(routeMap.values()).slice(-1)[0] || null;
  if (/^(?:pool-)?next$/.test(key)) return Array.from(routeMap.values())[0] || null;
  return null;
}

function normalizeInteractionKey(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function assessInteractionRuntime(paths, steps, sourceHtml) {
  const interactionPath = firstExistingPath([
    paths && paths.finalLayout ? sidecarPath(paths.finalLayout, '.interaction.json') : null,
  ]);
  const interaction = readJsonIfExists(interactionPath);
  const actionCount = interaction && Array.isArray(interaction.actions) ? interaction.actions.length : 0;
  const required = actionCount > 0 || /data-ucuf-action|tabSwitch|switchTab|pool-prev|pool-next/i.test(String(sourceHtml || ''));
  const smokeStep = (steps || []).find(step => step && step.step === 'runtime-interaction-smoke');
  const smokeResults = smokeStep && Array.isArray(smokeStep.smokeResults) ? smokeStep.smokeResults : [];
  const actionsBound = Number(smokeStep && smokeStep.actionsBound || 0);
  return {
    required,
    status: required ? (smokeStep && smokeStep.ok ? 'pass' : 'not-run') : 'pass',
    actionsDeclared: actionCount,
    actionsBound,
    smokeResults,
    source: interactionPath ? rel(interactionPath) : null,
  };
}

function main() {
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

  let sourcePackage = null;
  let inputPath;
  if (opts.sourceDir) {
    sourcePackage = resolveSourcePackage({ sourceDir: opts.sourceDir, mainHtml: opts.mainHtml });
    if (!sourcePackage.ok) {
      for (const error of sourcePackage.errors) console.error(`[run-html-to-ucuf-workflow] source package error: ${error}`);
      for (const warning of sourcePackage.warnings) console.warn(`[run-html-to-ucuf-workflow] source package warning: ${warning}`);
      process.exit(2);
    }
    inputPath = sourcePackage.mainHtmlPath;
    opts.input = inputPath;
  } else {
    inputPath = path.resolve(opts.input);
  }
  if (!fs.existsSync(inputPath)) {
    console.error(`[run-html-to-ucuf-workflow] input not found: ${inputPath}`);
    process.exit(2);
  }

  const sourceHtml = readText(inputPath);
  const detected = detectInputShape(sourceHtml);
  const paths = buildPaths(opts);
  ensureDir(paths.outDir);
  if (sourcePackage) {
    writeSourcePackageManifest(sourcePackage, paths.sourcePackageManifest, { screenId: opts.screenId, bundle: opts.bundle });
  }

  const steps = [];
  let workingHtml = inputPath;
  const uiVersion = allocateUiVersion(opts.screenId);
  steps.push({ step: 'allocate-ui-version', exitCode: 0, ok: true, uiVersion });

  if (detected.needsPrerender) {
    const args = ['--input', inputPath, '--output', paths.renderedHtml, '--viewport', opts.viewport, '--settle-ms', String(opts.settleMs)];
    if (opts.browser) args.push('--browser', opts.browser);
    const proc = runNodeStep('render-html-snapshot', 'render-html-snapshot.js', args);
    steps.push({ step: 'render-html-snapshot', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
    workingHtml = paths.renderedHtml;
  }

  if (sourcePackage) {
    const prepared = writeHtmlWithSourceCss({
      htmlPath: workingHtml,
      cssPath: sourcePackage.cssPath,
      outputPath: paths.sourceReadyHtml,
      cssLabel: sourcePackage.manifest.css,
    });
    workingHtml = prepared.outputPath;
    steps.push({ step: 'prepare-source-package-html', exitCode: 0, ok: true, cssBytes: prepared.cssBytes });
  }

  if (opts.skipAnnotate) {
    fs.copyFileSync(workingHtml, paths.readyHtml);
    steps.push({ step: 'prepare-ucuf-ready-html', exitCode: 0, ok: true, skipped: true });
  } else {
    const args = ['--html', workingHtml, '--screen-id', opts.screenId, '--apply', '--out', paths.readyHtml, '--report', paths.annotateReport];
    if (opts.contentContract) args.push('--content-contract', opts.contentContract);
    const proc = runNodeStep('annotate-html-bindings', 'annotate-html-bindings.js', args);
    steps.push({ step: 'annotate-html-bindings', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
  }

  const sanitizeResult = sanitizeUcufReadyHtml(paths.readyHtml);
  steps.push({ step: 'sanitize-ucuf-ready-html', exitCode: 0, ok: true, rewrittenInlineHandlers: sanitizeResult.rewrittenInlineHandlers });

  const enableUpdateBootstrap = opts.updateMode;
  const bootstrapResult = enableUpdateBootstrap
    ? bootstrapFinalDraftFromRuntime(paths, opts.screenId)
    : { ok: true, copiedLayout: false, copiedSkin: false, reason: 'disabled: final uses current HTML conversion output' };
  steps.push({
    step: 'update-mode-bootstrap-from-runtime',
    exitCode: 0,
    ok: true,
    copiedLayout: bootstrapResult.copiedLayout,
    copiedSkin: bootstrapResult.copiedSkin,
    runtimeScreenPath: bootstrapResult.runtimeScreenPath ? rel(bootstrapResult.runtimeScreenPath) : null,
    runtimeLayoutPath: bootstrapResult.runtimeLayoutPath ? rel(bootstrapResult.runtimeLayoutPath) : null,
    runtimeSkinPath: bootstrapResult.runtimeSkinPath ? rel(bootstrapResult.runtimeSkinPath) : null,
    reason: bootstrapResult.reason || null,
  });

  const baseArgs = [
    '--input', paths.readyHtml,
    '--output', paths.rawLayout,
    '--skin-output', paths.rawSkin,
    '--screen-id', opts.screenId,
    '--skin-id', `${opts.screenId}.skin`,
    '--viewport', opts.viewport,
    '--bundle', opts.bundle,
    '--emit-screen-draft',
    '--emit-preload-manifest',
    '--emit-performance-report',
    '--emit-warnings',
    '--warn-only',
    '--no-backup',
  ];
  if (sourcePackage) baseArgs.push('--tokens-source', sourcePackage.tokensPath, '--source-css', sourcePackage.cssPath, '--use-computed-style');
  if (opts.evolutionLog) baseArgs.push('--evolution-log', opts.evolutionLog);
  const baseProc = runNodeStep('dom-to-ui-json:raw', 'dom-to-ui-json.js', baseArgs);
  steps.push({ step: 'dom-to-ui-json:raw', exitCode: baseProc.status ?? 1, ok: baseProc.status === 0, issues: extractIssues((baseProc.stdout || '') + '\n' + (baseProc.stderr || '')) });
  if (baseProc.status !== 0) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  if (opts.skipOptimize) {
    fs.copyFileSync(paths.rawLayout, paths.optimizedLayout);
    steps.push({ step: 'optimize-ucuf-layout', exitCode: 0, ok: true, skipped: true });
  } else {
    const proc = runNodeStep('optimize-ucuf-layout', 'optimize-ucuf-layout.js', ['--input', paths.rawLayout, '--output', paths.optimizedLayout, '--report', paths.optimizeReport]);
    steps.push({ step: 'optimize-ucuf-layout', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
  }

  const visualReview = paths.rawLayout.replace(/\.json$/i, '.visual-review.json');
  const skinArgs = ['--skin', paths.rawSkin, '--report', paths.skinFixReport];
  if (fs.existsSync(visualReview)) skinArgs.push('--visual-review', visualReview);
  const skinProc = runNodeStep('auto-fix-ucuf-skin', 'auto-fix-ucuf-skin.js', skinArgs);
  steps.push({ step: 'auto-fix-ucuf-skin', exitCode: skinProc.status ?? 1, ok: skinProc.status === 0 });
  if (skinProc.status !== 0) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  // Plan 4.1：strict replay 不准回填 raw sidecar；final sidecar 改由 source HTML 在 replay 內重建。
  const strictArgs = [
    '--input', paths.readyHtml,
    '--layout-input', paths.optimizedLayout,
    '--skin-input', paths.rawSkin,
    '--output', paths.finalLayout,
    '--skin-output', paths.finalSkin,
    '--screen-id', opts.screenId,
    '--skin-id', `${opts.screenId}.skin`,
    '--viewport', opts.viewport,
    '--bundle', opts.bundle,
    '--emit-screen-draft',
    '--emit-preload-manifest',
    '--emit-performance-report',
    '--emit-warnings',
    '--no-backup',
  ];
  if (opts.strictReplayGates) strictArgs.push('--strict');
  if (opts.updateMode) {
    strictArgs.push('--sync-existing', '--merge-mode', opts.updateMergeMode);
  }
  const coverageBaselinePath = resolveUpdateCoverageBaseline(paths, opts);
  if (coverageBaselinePath) {
    strictArgs.push('--coverage-baseline', coverageBaselinePath);
  }
  if (sourcePackage) strictArgs.push('--tokens-source', sourcePackage.tokensPath, '--source-css', sourcePackage.cssPath);
  if (!opts.noValidate) strictArgs.push('--validate');
  const strictProc = runNodeStep('dom-to-ui-json:strict-replay', 'dom-to-ui-json.js', strictArgs);
  steps.push({
    step: 'dom-to-ui-json:strict-replay',
    exitCode: strictProc.status ?? 1,
    ok: strictProc.status === 0,
    coverageBaseline: coverageBaselinePath ? rel(coverageBaselinePath) : null,
    updateMode: opts.updateMode,
    updateMergeMode: opts.updateMode ? opts.updateMergeMode : null,
    issues: extractIssues((strictProc.stdout || '') + '\n' + (strictProc.stderr || '')),
  });

  const perTabReplay = runPerTabReplay(paths, opts, sourcePackage, inputPath);
  steps.push({
    step: 'per-tab-replay',
    exitCode: perTabReplay.skipped || perTabReplay.ok ? 0 : 1,
    ok: perTabReplay.skipped || perTabReplay.ok,
    skipped: !!perTabReplay.skipped,
    reason: perTabReplay.reason || null,
    renderExitCode: perTabReplay.renderExitCode ?? null,
    fragmentCount: Array.isArray(perTabReplay.fragments) ? perTabReplay.fragments.length : 0,
    mergedSkinSlots: perTabReplay.mergedSkinSlots || 0,
    tabRoutingCount: perTabReplay.tabRoutingCount || 0,
    lazySlotDefaultUpdated: perTabReplay.lazySlotDefaultUpdated || 0,
    fragments: perTabReplay.fragments || [],
    error: perTabReplay.error || null,
  });
  if (!perTabReplay.skipped && !perTabReplay.ok) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  const textContractSync = injectDynamicTextContracts(paths.finalLayout, opts.screenId);
  steps.push({
    step: 'inject-dynamic-text-contracts',
    exitCode: 0,
    ok: true,
    updated: textContractSync.updated,
  });

  const interactionTriggerSync = normalizeInteractionTriggersFromLayout(paths);
  steps.push({
    step: 'normalize-interaction-triggers',
    exitCode: 0,
    ok: true,
    updated: interactionTriggerSync.updated,
  });

  const tokenGovernance = regenerateScreenLocalTokens(paths, opts);
  steps.push({
    step: 'screen-local-token-governance',
    exitCode: 0,
    ok: true,
    mode: tokenGovernance.mode,
    sourceSuggestionFiles: tokenGovernance.sourceSuggestionFiles,
    localTokenPath: tokenGovernance.localTokenPath,
    diffReportPath: tokenGovernance.diffReportPath,
    tokenCount: tokenGovernance.tokenCount,
    unresolvedColorCount: tokenGovernance.unresolvedColorCount,
    skinLocalTokenApplied: tokenGovernance.skinTokenApply && tokenGovernance.skinTokenApply.applied,
    addedCount: tokenGovernance.diff.addedCount,
    removedCount: tokenGovernance.diff.removedCount,
    persistedCount: tokenGovernance.diff.persistedCount,
  });

  const runtimeSync = syncFinalArtifactsToRuntime(paths, opts, uiVersion);
  steps.push({
    step: 'sync-final-to-runtime-specs',
    exitCode: runtimeSync.skipped ? 0 : ((runtimeSync.copied && runtimeSync.copied.layout && runtimeSync.copied.skin && runtimeSync.copied.screen) ? 0 : 1),
    ok: runtimeSync.skipped || !!(runtimeSync.copied && runtimeSync.copied.layout && runtimeSync.copied.skin && runtimeSync.copied.screen),
    skipped: !!runtimeSync.skipped,
    reason: runtimeSync.reason || null,
    tabCount: runtimeSync.tabCount || 0,
    preservedScreenContracts: runtimeSync.preservedScreenContracts || [],
    copied: runtimeSync.copied || null,
  });
  if (!runtimeSync.skipped && !(runtimeSync.copied && runtimeSync.copied.layout && runtimeSync.copied.skin && runtimeSync.copied.screen)) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  const interactionSmoke = buildRuntimeInteractionSmokeStep(paths, opts, sourceHtml);
  steps.push(interactionSmoke);

  const uiVersionArtifacts = writeUiVersionArtifacts(paths, opts, uiVersion);
  steps.push({
    step: 'emit-ui-version-artifacts',
    exitCode: 0,
    ok: true,
    uiVersion,
    outVersionPath: uiVersionArtifacts.outVersionPath,
    runtimeVersionPath: uiVersionArtifacts.runtimeVersionPath,
  });

  const fragmentGeometryNormalize = normalizeReferencedFragmentFiles({
    repoRoot: ROOT,
    screenId: opts.screenId,
    write: true,
  });
  steps.push({
    step: 'normalize-fragment-geometry-contract',
    exitCode: fragmentGeometryNormalize.ok ? 0 : 1,
    ok: fragmentGeometryNormalize.ok,
    normalizedCount: fragmentGeometryNormalize.normalizedCount,
    skippedCount: fragmentGeometryNormalize.skippedCount,
    failures: fragmentGeometryNormalize.failures,
  });

  let compareProc = { status: 0, stdout: '', stderr: '' };
  if (!opts.skipCompare) {
    const compareArgs = [
      '--html', paths.readyHtml,
      '--layout', fs.existsSync(paths.finalLayout) ? paths.finalLayout : paths.optimizedLayout,
      '--skin', fs.existsSync(paths.finalSkin) ? paths.finalSkin : paths.rawSkin,
      '--screen-id', opts.screenId,
      '--output', paths.comparePng,
      '--save-panels', path.join(paths.outDir, 'compare-panels'),
      '--strict-coverage', String(opts.strictCoverage),
      '--strict-pixel', String(opts.strictPixel),
    ];
    if (opts.browser) compareArgs.push('--browser', opts.browser);
    if (sourcePackage) compareArgs.push('--tokens', sourcePackage.tokensPath);
    if (opts.artAuthorityWaivers) compareArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
    compareProc = runNodeStep('dom-to-ui-compare', 'dom-to-ui-compare.js', compareArgs);
    steps.push({ step: 'dom-to-ui-compare', exitCode: compareProc.status ?? 1, ok: compareProc.status === 0, issues: extractIssues((compareProc.stdout || '') + '\n' + (compareProc.stderr || '')) });
  }

  let editorCompareProc = null;
  if (sourcePackage && !opts.skipEditorCompare && opts.editorScreenshot) {
    const editorArgs = [
      '--source-dir', sourcePackage.sourceDir,
      '--main-html', sourcePackage.manifest.mainHtml,
      '--screen-id', opts.screenId,
      '--editor-screenshot', opts.editorScreenshot,
      '--output', paths.outDir,
      '--threshold', '0.95',
    ];
    if (opts.browser) editorArgs.push('--browser', opts.browser);
    if (opts.captureProtocol) editorArgs.push('--capture-protocol', opts.captureProtocol);
    if (opts.captureReport) editorArgs.push('--capture-report', opts.captureReport);
    if (opts.artAuthorityWaivers) editorArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
    if (opts.evolutionLog) editorArgs.push('--evolution-log', opts.evolutionLog);
    editorCompareProc = runNodeStep('compare-html-to-cocos-editor', 'compare-html-to-cocos-editor.js', editorArgs);
    steps.push({ step: 'compare-html-to-cocos-editor', exitCode: editorCompareProc.status ?? 1, ok: editorCompareProc.status === 0, issues: extractIssues((editorCompareProc.stdout || '') + '\n' + (editorCompareProc.stderr || '')) });
  } else if (sourcePackage && !opts.skipEditorCompare) {
    steps.push({ step: 'compare-html-to-cocos-editor', exitCode: 2, ok: false, issues: ['editor-screenshot-required'] });
  }

  const runtimePaths = resolveCanonicalRuntimePaths(opts.screenId);
  const readinessArgs = [
    '--screen-id', opts.screenId,
    '--output', runtimePaths.readinessPath,
    '--final-verdict', paths.htmlCocosVerdict,
  ];
  if (opts.captureProtocol) readinessArgs.push('--capture-protocol', opts.captureProtocol);
  if (opts.artAuthorityWaivers) readinessArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
  const readinessProc = runNodeStep('html-to-ucuf-readiness', 'html-to-ucuf-readiness.js', readinessArgs);
  steps.push({
    step: 'html-to-ucuf-readiness',
    exitCode: readinessProc.status ?? 1,
    ok: readinessProc.status === 0,
    output: rel(runtimePaths.readinessPath),
    issues: extractIssues((readinessProc.stdout || '') + '\n' + (readinessProc.stderr || '')),
  });

  const metrics = {
    raw: extractPerfMetrics(paths.rawLayout),
    optimized: Object.assign({}, readJsonIfExists(paths.optimizeReport) || {}, { perf: extractPerfMetrics(paths.optimizedLayout) }),
    final: extractPerfMetrics(fs.existsSync(paths.finalLayout) ? paths.finalLayout : paths.optimizedLayout),
    compare: opts.skipCompare ? null : extractCompareMetrics(paths.comparePng),
    htmlCocos: readJsonIfExists(paths.htmlCocosVerdict),
  };
  metrics.runtimeReadiness = assessRuntimeReadiness(paths, sourceHtml, opts.screenId);
  const runtimeAuthority = buildRuntimeAuthority(opts, runtimeSync);
  const debugInfo = computeDebugOnly(opts, sourcePackage);
  const visualFidelityRisk = assessVisualFidelityRisk(paths, metrics, opts);
  const interactionRuntime = assessInteractionRuntime(paths, steps, sourceHtml);
  const visualFidelityRiskPass = visualFidelityRisk.status === 'pass' && visualFidelityRisk.blockerCount === 0;
  const interactionRuntimePass = interactionRuntime.status === 'pass';
  const editorGatePass = !sourcePackage
    ? true
    : !!(metrics.htmlCocos && metrics.htmlCocos.runtimeVsSource && ['pass', 'pass-with-approved-art-delta'].includes(metrics.htmlCocos.runtimeVsSource.verdict));
  const converterPass = baseProc.status === 0
    && strictProc.status === 0
    && fragmentGeometryNormalize.ok
    && metrics.runtimeReadiness.ok;
  const previewDiagnosticPass = opts.skipCompare ? true : compareProc.status === 0;
  const runtimeFinalPass = editorGatePass;
  const verdict = {
    rawPass: baseProc.status === 0,
    strictReplayPass: strictProc.status === 0,
    comparePass: previewDiagnosticPass,
    editorVisualPass: runtimeFinalPass,
    fragmentGeometryPass: fragmentGeometryNormalize.ok && metrics.runtimeReadiness.fragmentGeometry.status !== 'blocker',
    runtimeReadinessPass: metrics.runtimeReadiness.ok,
    ruleGuardPass: false,
    visualFidelityRiskPass,
    interactionRuntimePass,
    debugOnly: debugInfo.debugOnly,
    converterPass,
    previewDiagnosticPass,
    runtimeFinalPass,
    workflowPass: converterPass && previewDiagnosticPass && runtimeFinalPass && visualFidelityRiskPass && interactionRuntimePass && !debugInfo.debugOnly,
    gateScopes: {
      converterPass: 'HTML source package to UCUF JSON plus structural/runtime-readiness gates',
      previewDiagnosticPass: 'browser source-vs-UCUF preview only; image-waivers are diagnostic and not final runtime score authority',
      runtimeFinalPass: 'HTML source screenshot vs Cocos Editor screenshot runtimeVsSource gate',
    },
    remainingIssues: [
      ...extractIssues((strictProc.stdout || '') + '\n' + (strictProc.stderr || '')),
      ...extractIssues((compareProc.stdout || '') + '\n' + (compareProc.stderr || '')),
      ...(editorCompareProc ? extractIssues((editorCompareProc.stdout || '') + '\n' + (editorCompareProc.stderr || '')) : []),
      ...(sourcePackage && opts.skipEditorCompare ? ['editor-compare-skipped'] : []),
      ...(sourcePackage && !opts.skipEditorCompare && !opts.editorScreenshot ? ['editor-screenshot-required'] : []),
      ...fragmentGeometryNormalize.failures.map(item => `fragment-geometry-normalize: ${item.ref} ${item.code}`),
      ...metrics.runtimeReadiness.blockers,
      ...visualFidelityRisk.violations.filter(item => item.severity === 'blocker').map(item => `[${item.ruleId}] ${item.summary}`),
      ...(interactionRuntime.required && interactionRuntime.status !== 'pass' ? [`interactionRuntime:${interactionRuntime.status}`] : []),
    ],
  };

  const preliminarySummary = buildSummary({ opts, sourcePackage, detected, paths, steps, metrics, verdict, runtimeAuthority, visualFidelityRisk, interactionRuntime, tokenGovernance, sourceHtml });
  const ruleGuard = runRuleGuard({
    repoRoot: ROOT,
    strict: true,
    workflowSummary: preliminarySummary,
    sourceHtml,
  });
  writeJson(paths.ruleGuardReport, ruleGuard);
  const nextFixes = topRuleGuardFixes(ruleGuard);
  steps.push({
    step: 'rule-guard',
    exitCode: ruleGuard.blockerCount > 0 ? 1 : 0,
    ok: ruleGuard.blockerCount === 0,
    status: ruleGuard.status,
    blockerCount: ruleGuard.blockerCount,
    warningCount: ruleGuard.warningCount,
    report: rel(paths.ruleGuardReport),
  });
  verdict.ruleGuardPass = ruleGuard.blockerCount === 0;
  if (!verdict.ruleGuardPass) {
    verdict.remainingIssues.push(...ruleGuard.violations
      .filter(item => item.severity === 'blocker')
      .map(item => `[${item.ruleId}] ${item.summary}`));
  }
  if (debugInfo.debugOnly) {
    verdict.remainingIssues.push(...debugInfo.reasons.map(reason => `debugOnly:${reason}`));
  }
  verdict.workflowPass = converterPass && previewDiagnosticPass && runtimeFinalPass && visualFidelityRiskPass && interactionRuntimePass && verdict.ruleGuardPass && !debugInfo.debugOnly;

  const summary = buildSummary({ opts, sourcePackage, detected, paths, steps, metrics, verdict, runtimeAuthority, ruleGuard, nextFixes, visualFidelityRisk, interactionRuntime, tokenGovernance, sourceHtml });
  fs.writeFileSync(paths.summary, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`[run-html-to-ucuf-workflow] summary=${rel(paths.summary)}`);
  console.log(`[run-html-to-ucuf-workflow] rule-guard=${ruleGuard.status} blockers=${ruleGuard.blockerCount}`);
  console.log(`[run-html-to-ucuf-workflow] raw.nodeCount=${metrics.raw.nodeCount} optimized.nodeCount=${metrics.optimized.after || metrics.optimized.perf.nodeCount} final.nodeCount=${metrics.final.nodeCount}`);
  if (metrics.compare) {
    console.log(`[run-html-to-ucuf-workflow] compare.adjustedCoverage=${metrics.compare.adjustedCoverage}`);
  }
  if (metrics.runtimeReadiness.warnings.length) {
    for (const warning of metrics.runtimeReadiness.warnings) console.warn(`[run-html-to-ucuf-workflow] ${warning}`);
  }
  if (metrics.runtimeReadiness.blockers.length) {
    for (const blocker of metrics.runtimeReadiness.blockers) console.error(`[run-html-to-ucuf-workflow] ${blocker}`);
  }
  if (nextFixes.length) {
    for (const fix of nextFixes) console.error(`[run-html-to-ucuf-workflow] nextFix ${fix.ruleId}: ${fix.fixAction}`);
  }
  if (debugInfo.debugOnly) {
    console.error(`[run-html-to-ucuf-workflow] debugOnly=${debugInfo.reasons.join(',')}`);
  }
  if (!verdict.workflowPass) {
    console.error('[run-html-to-ucuf-workflow] verdict=needs-review');
    process.exit(1);
  }
  console.log('[run-html-to-ucuf-workflow] verdict=pass');
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

main();
