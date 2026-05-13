'use strict';

const fs = require('fs');
const path = require('path');

function readFinalTabRouting(paths, helpers) {
  return helpers.readJsonIfExists(helpers.sidecarPath(paths.finalLayout, '.tab-routing.json'));
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

function syncFinalArtifactsToRuntime(args) {
  const { paths, opts, uiVersion, helpers } = args;
  if (!opts.runtimeSync) return { skipped: true, reason: 'disabled' };

  const runtime = helpers.resolveCanonicalRuntimePaths(opts.screenId);
  const layoutSource = helpers.firstExistingPath([paths.finalLayout, paths.optimizedLayout, paths.rawLayout]);
  const skinSource = helpers.firstExistingPath([paths.finalSkin, paths.rawSkin]);
  const screenDraftSource = helpers.firstExistingPath([
    helpers.sidecarPath(paths.finalLayout, '.screen.json'),
  ]);
  const tabRoutingSidecar = readFinalTabRouting(paths, helpers);
  const existingScreen = helpers.readJsonIfExists(runtime.screenPath) || {};
  const screenDraft = screenDraftSource ? helpers.readJsonIfExists(screenDraftSource) : null;
  const runtimeRoute = helpers.readRuntimeStateRoute(opts.screenId);
  const tabRouting = buildRuntimeTabRoutingMap(tabRoutingSidecar, existingScreen.tabRouting);

  const copied = {};
  copied.layout = helpers.copyJsonFile(layoutSource, runtime.layoutPath);
  copied.layoutAlias = helpers.copyJsonFile(layoutSource, runtime.layoutAliasPath);
  copied.skin = helpers.copyJsonFile(skinSource, runtime.skinPath);

  // Keep source-authoritative screen state, with update-mode preserving runtime contracts.
  const screen = opts.updateMode ? Object.assign({}, existingScreen) : {};
  screen.id = screen.id || screenDraft && (screenDraft.id || screenDraft.screenId) || opts.screenId;
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
  const preservedScreenContracts = helpers.mergeRuntimeScreenContentContract(screen, screenDraft, existingScreen, runtimeRoute);
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
  helpers.writeJson(runtime.screenPath, screen);
  copied.screen = helpers.rel(runtime.screenPath);

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
  if (paths.zoneOwnership && fs.existsSync(paths.zoneOwnership)) {
    const destZone = path.join(runtime.screensDir, `${opts.screenId}.zone-ownership.json`);
    const zoneCopied = helpers.copyJsonFile(paths.zoneOwnership, destZone);
    if (zoneCopied) copied.zoneOwnership = zoneCopied;
  }
  const bakeManifestSource = helpers.firstExistingPath([helpers.sidecarPath(paths.finalLayout, '.bake-manifest.json')]);
  if (bakeManifestSource) {
    const bakeDest = path.join(runtime.layoutsDir, `${opts.screenId}.layout.bake-manifest.json`);
    const bakeCopied = helpers.copyJsonFile(bakeManifestSource, bakeDest);
    if (bakeCopied) copied.bakeManifest = bakeCopied;
  }
  copied.sidecars = [];
  for (const [suffix, fileName] of sidecars) {
    const sourcePath = helpers.firstExistingPath([helpers.sidecarPath(paths.finalLayout, suffix)]);
    const copiedPath = helpers.copyJsonFile(sourcePath, path.join(runtime.screensDir, fileName));
    if (copiedPath) copied.sidecars.push(copiedPath);
  }

  return {
    skipped: false,
    layoutSource: layoutSource ? helpers.rel(layoutSource) : null,
    skinSource: skinSource ? helpers.rel(skinSource) : null,
    tabCount: Object.keys(tabRouting).length,
    preservedScreenContracts,
    copied,
  };
}

module.exports = {
  readFinalTabRouting,
  buildRuntimeTabRoutingMap,
  syncFinalArtifactsToRuntime,
};

