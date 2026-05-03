// doc_id: doc_other_0009 - HTML-to-UCUF 95% readiness gate.
'use strict';

const fs = require('fs');
const path = require('path');

const { analyzeLayout } = require('./performance');
const { normalizeFinalCaptureProtocol } = require('./final-capture-protocol');
const { validateArtAuthorityWaivers } = require('./art-authority-waivers');
const { assessReferencedFragmentGeometry } = require('./fragment-geometry-contract');

function buildReadinessReport(args) {
  args = args || {};
  const repoRoot = args.repoRoot || path.resolve(__dirname, '..', '..', '..');
  const screenId = args.screenId;
  let paths = resolveReadinessPaths(repoRoot, screenId, args.paths || {});
  const screen = readJson(paths.screen);
  paths = resolveReadinessPaths(repoRoot, screenId, args.paths || {}, screen);
  const layout = readJson(paths.layout);
  const skin = readJson(paths.skin);
  const captureProtocolRaw = readJson(paths.captureProtocol);
  const zoneOwnership = readJson(paths.zoneOwnership);
  const tabRouting = readJson(paths.tabRouting) || (screen && screen.tabRouting) || null;
  const preload = readJson(paths.preload);
  const performance = readJson(paths.performance);
  const bakeManifest = readJson(paths.bakeManifest);
  const artAuthorityWaivers = readJson(paths.artAuthorityWaivers);
  const finalVerdict = readJson(paths.finalVerdict);

  const layoutRoot = unwrapLayoutRoot(layout);
  const nodeIndex = buildNodeIndex(layoutRoot);
  const capture = assessCaptureProtocol(captureProtocolRaw, screenId);
  const finalGate = assessFinalGate(finalVerdict);
  const zones = assessZones(zoneOwnership, artAuthorityWaivers, { repoRoot, screenId, capture });
  const tabMounts = assessTabMounts(tabRouting, nodeIndex);
  const fragmentGeometry = assessReferencedFragmentGeometry({
    repoRoot,
    screenId,
    layout,
    screen,
    tabRouting: screen && screen.tabRouting,
  });
  const textBinding = assessTextBinding(nodeIndex.textNodes);
  const visualPolicy = assessVisualPolicy(bakeManifest);
  const loading = assessLoading(layoutRoot, preload, performance, skin);

  const issues = [];
  pushIssue(issues, finalGate.status, 'final-gate', finalGate.summary, finalGate.workUnits);
  pushIssue(issues, capture.status, 'capture-protocol', capture.summary, capture.workUnits);
  pushIssue(issues, zones.status, 'zone-ownership-waivers', zones.summary, zones.workUnits);
  pushIssue(issues, tabMounts.status, 'tab-routing-mounts', tabMounts.summary, tabMounts.workUnits);
  pushIssue(issues, fragmentGeometry.status, 'tab-fragment-geometry-contract', fragmentGeometry.summary, fragmentGeometry.workUnits);
  pushIssue(issues, textBinding.status, 'text-binding', textBinding.summary, textBinding.workUnits);
  pushIssue(issues, visualPolicy.status, 'visual-policy', visualPolicy.summary, visualPolicy.workUnits);
  pushIssue(issues, loading.status, 'loading-performance', loading.summary, loading.workUnits);

  const blockerUnits = issues.filter(issue => issue.severity === 'blocker').reduce((n, issue) => n + issue.workUnits, 0);
  const actionUnits = issues.filter(issue => issue.severity !== 'pass').reduce((n, issue) => n + issue.workUnits, 0);
  return {
    schemaVersion: '1.0.0',
    screenId,
    generatedAt: new Date().toISOString(),
    verdict: finalGate.pass ? 'measured-pass' : (blockerUnits > 0 ? 'not-ready' : 'ready-for-final-capture'),
    readinessScore: scoreFromUnits(actionUnits),
    summary: {
      blockerUnits,
      actionUnits,
      bounded: true,
      nextCriticalAction: nextCriticalAction(issues),
    },
    paths: relativePaths(repoRoot, paths),
    gates: {
      finalGate,
      capture,
      zones,
      tabMounts,
      fragmentGeometry,
      textBinding,
      visualPolicy,
      loading,
    },
    issues,
  };
}

function resolveReadinessPaths(repoRoot, screenId, explicit, screen) {
  const screensDir = path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'screens');
  const layoutsDir = path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'layouts');
  const skinsDir = path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'skins');
  const layoutFromScreen = screen && typeof screen.layout === 'string'
    ? resolveSpecJson(layoutsDir, screen.layout, ['.json', '.layout.json'])
    : null;
  const skinFromScreen = screen && typeof screen.skin === 'string'
    ? resolveSpecJson(skinsDir, screen.skin, ['.json', '.skin.json'])
    : null;
  return {
    layout: explicit.layout || layoutFromScreen || firstExisting([
      path.join(layoutsDir, `${screenId}.layout.json`),
      path.join(layoutsDir, `${screenId}.json`),
    ]),
    skin: explicit.skin || skinFromScreen || firstExisting([
      path.join(skinsDir, `${screenId}.skin.json`),
      path.join(skinsDir, `${screenId}.json`),
    ]),
    screen: explicit.screen || firstExisting([
      path.join(screensDir, `${screenId}.json`),
      path.join(screensDir, `${screenId}.screen.json`),
    ]),
    captureProtocol: explicit.captureProtocol || path.join(screensDir, `${screenId}.final-capture-protocol.json`),
    zoneOwnership: explicit.zoneOwnership || path.join(screensDir, `${screenId}.zone-ownership.json`),
    tabRouting: explicit.tabRouting || path.join(screensDir, `${screenId}.tab-routing.json`),
    preload: explicit.preload || path.join(screensDir, `${screenId}.preload.json`),
    performance: explicit.performance || path.join(screensDir, `${screenId}.performance.json`),
    bakeManifest: explicit.bakeManifest || firstExisting([
      path.join(layoutsDir, `${screenId}.layout.bake-manifest.json`),
      path.join(layoutsDir, `${screenId}.bake-manifest.json`),
    ]),
    artAuthorityWaivers: explicit.artAuthorityWaivers || path.join(screensDir, `${screenId}.art-authority-waivers.json`),
    finalVerdict: explicit.finalVerdict || null,
  };
}

function assessCaptureProtocol(raw, screenId) {
  if (!raw) return { status: 'blocker', ok: false, workUnits: 1, summary: 'missing final capture protocol' };
  const normalized = normalizeFinalCaptureProtocol(raw, { screenId });
  return {
    status: normalized.ok ? 'pass' : 'blocker',
    ok: normalized.ok,
    workUnits: normalized.ok ? 0 : 1,
    summary: normalized.ok ? 'capture protocol present' : normalized.errors.join('; '),
    viewport: normalized.viewport,
    settleMs: normalized.settleMs,
    warnings: normalized.warnings,
    errors: normalized.errors,
  };
}

function assessFinalGate(verdict) {
  if (!verdict || !verdict.runtimeVsSource) {
    return { status: 'blocker', pass: false, workUnits: 1, summary: 'no measured Cocos Editor final compare verdict' };
  }
  const v = verdict.runtimeVsSource;
  const pass = v.verdict === 'pass' || v.verdict === 'pass-with-approved-art-delta';
  return {
    status: pass ? 'pass' : 'blocker',
    pass,
    workUnits: pass ? 0 : 1,
    summary: `runtimeVsSource raw=${round(v.score)} adjusted=${round(v.adjustedScore || v.score)} verdict=${v.verdict}`,
    rawScore: v.score,
    adjustedScore: v.adjustedScore || v.score,
    verdict: v.verdict,
  };
}

function assessZones(zoneOwnership, artAuthorityWaivers, opts) {
  if (!zoneOwnership) return { status: 'blocker', workUnits: 1, summary: 'missing zone ownership report' };
  const zones = Array.isArray(zoneOwnership.zones) ? zoneOwnership.zones : [];
  const waiverEligible = zones.filter(zone => zone.waiverEligible);
  const eligibleMissingRect = waiverEligible.filter(zone => !zone.rect || /missing/.test(String(zone.rectStatus || '')));
  let waiverValidation = null;
  if (artAuthorityWaivers) {
    waiverValidation = validateArtAuthorityWaivers(artAuthorityWaivers, {
      repoRoot: opts.repoRoot,
      screenId: opts.screenId,
      targetWidth: opts.capture.viewport && opts.capture.viewport.width,
      targetHeight: opts.capture.viewport && opts.capture.viewport.height,
    });
  }
  const missingWaiver = waiverEligible.length > 0 && !artAuthorityWaivers;
  const invalidWaiver = waiverValidation && !waiverValidation.ok;
  const workUnits = eligibleMissingRect.length + (missingWaiver ? 1 : 0) + (invalidWaiver ? 1 : 0);
  return {
    status: workUnits > 0 ? 'blocker' : 'pass',
    workUnits,
    summary: `${waiverEligible.length} waiver-eligible art zones, ${eligibleMissingRect.length} missing rects`,
    taxonomy: zoneOwnership.taxonomy || [],
    byTaxonomy: zoneOwnership.summary && zoneOwnership.summary.byTaxonomy || {},
    waiverEligibleCount: waiverEligible.length,
    eligibleMissingRectCount: eligibleMissingRect.length,
    waiverPresent: !!artAuthorityWaivers,
    waiverValidation: waiverValidation ? {
      ok: waiverValidation.ok,
      errors: waiverValidation.errors,
      waiverCount: waiverValidation.waiverCount,
      totalCoverageRatio: waiverValidation.totalCoverageRatio,
    } : null,
    samples: eligibleMissingRect.slice(0, 8).map(zone => ({ id: zone.id, zoneId: zone.zoneId, recommendation: zone.recommendation })),
  };
}

function assessTabMounts(tabRouting, nodeIndex) {
  if (!tabRouting) return { status: 'warn', workUnits: 1, summary: 'missing tab-routing sidecar' };
  const entries = Array.isArray(tabRouting.tabs) ? tabRouting.tabs : Object.entries(tabRouting).filter(([k]) => k !== 'screenId' && k !== 'generatedAt').map(([id, value]) => Object.assign({ id }, value));
  const checks = entries.map(entry => {
    const mount = entry.mount || entry.contentRoot || entry.mountTarget || entry.slotId || '';
    const match = mount ? nodeIndex.resolve(mount) : null;
    const exists = !!match;
    return { id: entry.id, mount, exists, matchType: match && match.kind || null, childPanelClass: entry.childPanelClass || null };
  });
  const missing = checks.filter(check => !check.exists);
  return {
    status: missing.length > 0 ? 'blocker' : 'pass',
    workUnits: missing.length,
    summary: `${checks.length - missing.length}/${checks.length} tab mounts resolve to real layout nodes`,
    checks,
    missing,
  };
}

function assessTextBinding(textNodes) {
  const candidates = textNodes.filter(item => isDynamicTextCandidate(item.node));
  const missing = candidates.filter(item => !hasBinding(item.node));
  return {
    status: missing.length > 0 ? 'warn' : 'pass',
    workUnits: Math.ceil(missing.length / 8),
    summary: `${missing.length}/${candidates.length} dynamic text candidates missing bind/i18n contract`,
    totalTextNodes: textNodes.length,
    dynamicCandidateCount: candidates.length,
    missingContractCount: missing.length,
    samples: missing.slice(0, 12).map(item => ({ name: item.node.name || null, path: item.path, text: String(item.node.text || '').slice(0, 60) })),
  };
}

function assessVisualPolicy(bakeManifest) {
  if (!bakeManifest) return { status: 'warn', workUnits: 1, summary: 'missing bake manifest; texture/clip review cannot be quantified' };
  const entries = Array.isArray(bakeManifest.entries) ? bakeManifest.entries : [];
  const clipGeometry = entries.filter(entry => entry.property === 'clip-path' || entry.bakeAction === 'converter-geometry');
  const smallTexture = entries.filter(entry => {
    const target = entry.target || {};
    return /background/.test(String(entry.property || '')) && target.width <= 64 && target.height <= 64;
  });
  const unsafeAutoBake = entries.filter(entry => entry.autoBake && entry.bakeAction !== 'auto-screenshot-fragment');
  const workUnits = unsafeAutoBake.length;
  return {
    status: workUnits > 0 ? 'blocker' : 'pass',
    workUnits,
    summary: `${clipGeometry.length} clip/mask geometry entries, ${smallTexture.length} small texture entries, ${unsafeAutoBake.length} unsafe auto-bake entries`,
    totalEntries: entries.length,
    byBakeAction: bakeManifest.summary && bakeManifest.summary.byBakeAction || {},
    clipGeometryCount: clipGeometry.length,
    smallTextureCount: smallTexture.length,
    unsafeAutoBakeCount: unsafeAutoBake.length,
  };
}

function assessLoading(layout, preload, performance, skin) {
  const issues = [];
  const stats = layout ? analyzeLayout(layout) : null;
  if (!preload) issues.push('missing preload manifest');
  if (!performance) issues.push('missing performance report');
  if (stats && performance && performance.rendering && performance.rendering.nodeCount !== stats.nodeCount) {
    issues.push(`performance report stale: nodeCount ${performance.rendering.nodeCount} != actual ${stats.nodeCount}`);
  }
  const perfBlockers = performance && performance.verdict && Array.isArray(performance.verdict.blockers) ? performance.verdict.blockers : [];
  for (const blocker of perfBlockers) issues.push(blocker);
  return {
    status: perfBlockers.length > 0 ? 'blocker' : (issues.length > 0 ? 'warn' : 'pass'),
    workUnits: issues.length,
    summary: issues.length ? issues.join('; ') : 'preload/performance sidecars present and current',
    actualLayoutStats: stats,
    reportedRendering: performance && performance.rendering || null,
    skinSlotCount: skin && skin.slots ? Object.keys(skin.slots).length : 0,
    issues,
  };
}

function buildNodeIndex(layout) {
  const byName = new Map();
  const byId = new Map();
  const byUcufId = new Map();
  const textNodes = [];
  function walk(node, pathParts) {
    if (!node || typeof node !== 'object') return;
    const name = node.name || node._ucufId || `node-${byName.size + 1}`;
    const nextPath = pathParts.concat(name);
    if (node.name) byName.set(node.name, { node, path: nextPath.join('/') });
    if (node.id) byId.set(node.id, { node, path: nextPath.join('/') });
    if (node._ucufId) byUcufId.set(node._ucufId, { node, path: nextPath.join('/') });
    if (node.type === 'label' || node.text != null) textNodes.push({ node, path: nextPath.join('/') });
    if (Array.isArray(node.children)) for (const child of node.children) walk(child, nextPath);
  }
  walk(layout, []);
  return {
    byName,
    byId,
    byUcufId,
    textNodes,
    resolve(value) {
      if (byName.has(value)) return Object.assign({ kind: 'name' }, byName.get(value));
      if (byId.has(value)) return Object.assign({ kind: 'id' }, byId.get(value));
      if (byUcufId.has(value)) return Object.assign({ kind: '_ucufId' }, byUcufId.get(value));
      return null;
    },
  };
}

function unwrapLayoutRoot(layout) {
  if (layout && layout.root && typeof layout.root === 'object') return layout.root;
  return layout;
}

function isDynamicTextCandidate(node) {
  const text = String(node && node.text || '').trim();
  if (!text) return false;
  if (/^[A-Z]{2,12}$/.test(text)) return false;
  if (/^[★←›‹×✕]+$/.test(text)) return false;
  if (/^(返回|確認|取消|將|屬|命|技|寶|兵|適|傳)$/.test(text)) return false;
  return /\d|%|張飛|翼德|武|統|智|政|魅|運|血脈|傳記|[，。；]/.test(text) || text.length >= 8;
}

function hasBinding(node) {
  if (!node || typeof node !== 'object') return false;
  return !!(node.bind || node.bindPath || node.dataContract || node.contract || node.i18nKey || node.contentPath || node.textKey);
}

function pushIssue(issues, status, code, summary, workUnits) {
  if (status === 'pass') return;
  issues.push({ severity: status === 'blocker' ? 'blocker' : 'warn', code, summary, workUnits: workUnits || 0 });
}

function nextCriticalAction(issues) {
  const issue = issues.find(item => item.severity === 'blocker') || issues[0];
  if (!issue) return 'run final compare and keep monitoring raw/adjusted score';
  if (issue.code === 'final-gate') return 'capture Cocos Editor target screen and run final compare';
  if (issue.code === 'zone-ownership-waivers') return 'fill traceable rects for waiver-eligible art zones, then create art-authority waivers';
  if (issue.code === 'tab-routing-mounts') return 'replace synthetic tab-routing mount names with real layout node names or add lazy slot nodes';
  if (issue.code === 'tab-fragment-geometry-contract') return 'normalize referenced lazySlot fragments to fill-root contract, keeping fixed card/list dimensions inside content nodes';
  return issue.summary;
}

function scoreFromUnits(units) {
  return Math.max(0, Math.round((1 - Math.min(1, units / 24)) * 1000) / 1000);
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(path.resolve(filePath))) return null;
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8').replace(/^\uFEFF/, ''));
}

function firstExisting(candidates) {
  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}

function resolveSpecJson(baseDir, specId, suffixes) {
  const normalized = String(specId).replace(/\\/g, '/').replace(/^\/+/, '');
  if (/\.json$/i.test(normalized)) {
    const asPath = path.isAbsolute(normalized) ? normalized : path.join(baseDir, normalized);
    return fs.existsSync(asPath) ? asPath : null;
  }
  return suffixes.map(suffix => path.join(baseDir, `${normalized}${suffix}`)).find(candidate => fs.existsSync(candidate)) || null;
}

function relativePaths(root, paths) {
  const out = {};
  for (const [key, value] of Object.entries(paths)) {
    out[key] = value ? path.relative(root, path.resolve(value)).replace(/\\/g, '/') : null;
  }
  return out;
}

function round(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10000) / 10000 : null;
}

module.exports = {
  buildReadinessReport,
  resolveReadinessPaths,
  buildNodeIndex,
  assessTabMounts,
  assessReferencedFragmentGeometry,
  assessTextBinding,
  assessVisualPolicy,
};
