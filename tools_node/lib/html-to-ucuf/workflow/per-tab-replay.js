'use strict';

const fs = require('fs');
const path = require('path');

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

function resolveSlotWidth(layoutPath, slotId, helpers) {
  if (!layoutPath || !slotId) return null;
  const layout = helpers.readJsonIfExists(layoutPath);
  const root = layout && layout.root ? layout.root : layout;
  if (!root) return null;
  const slotNode = findLayoutNodeByName(root, slotId);
  if (!slotNode || typeof slotNode.width !== 'number' || !Number.isFinite(slotNode.width)) {
    return null;
  }
  return slotNode.width;
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

function mergeSkinSlots(targetSkinPath, fragmentSkinPath, helpers) {
  const target = helpers.readJsonIfExists(targetSkinPath);
  const fragment = helpers.readJsonIfExists(fragmentSkinPath);
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
  helpers.writeJson(targetSkinPath, target);
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

function writePerTabReplayRouting(paths, opts, previousRouting, fragments, helpers) {
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
  helpers.writeJson(helpers.sidecarPath(paths.finalLayout, '.tab-routing.json'), sidecar);
  return sidecar;
}

function updateLazySlotDefaultFragments(layoutPath, tabRouting, helpers) {
  const layout = helpers.readJsonIfExists(layoutPath);
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
  if (changed > 0) helpers.writeJson(layoutPath, layout);
  return { changed };
}

async function runPerTabReplay(args) {
  const { paths, opts, sourcePackage, inputPath, helpers } = args;
  if (!opts.perTabReplay) return { skipped: true, reason: 'disabled' };
  const routing = helpers.readFinalTabRouting(paths);
  const tabs = pickPerTabReplayTabs(routing);

  helpers.ensureDir(paths.tabReplayDir);
  const renderArgs = [
    '--input', inputPath,
    '--output-dir', paths.tabReplayDir,
    '--screen-id', opts.screenId,
    '--viewport', opts.viewport,
    '--settle-ms', String(opts.settleMs),
  ];
  if (tabs.length > 0) renderArgs.push('--tabs', tabs.map(tab => tab.key).join(','));
  if (opts.browser) renderArgs.push('--browser', opts.browser);
  const renderProc = await helpers.runNodeStep('render-html-tab-fragments', 'render-html-tab-fragments.js', renderArgs);

  const manifestPath = path.join(paths.tabReplayDir, `${opts.screenId}.tab-fragments.json`);
  const manifest = helpers.readJsonIfExists(manifestPath);
  const renderOutput = `${renderProc.stdout || ''}\n${renderProc.stderr || ''}`;
  if (renderProc.status !== 0 && /no tabs discovered/i.test(renderOutput)) {
    return {
      skipped: true,
      reason: 'no-tabs-discovered',
      renderExitCode: renderProc.status ?? 1,
      manifest: helpers.rel(manifestPath),
      fragments: [],
      mergedSkinSlots: 0,
    };
  }
  const result = {
    skipped: false,
    renderExitCode: renderProc.status ?? 1,
    manifest: helpers.rel(manifestPath),
    fragments: [],
    mergedSkinSlots: 0,
  };
  if (renderProc.status !== 0 || !manifest) {
    result.ok = false;
    result.error = 'render-tab-fragments-failed';
    return result;
  }

  const runtime = helpers.resolveCanonicalRuntimePaths(opts.screenId);
  const prefix = deriveFragmentPrefix(opts.screenId);
  const slotWidthByTabId = new Map();
  for (const tab of tabs) {
    const width = resolveSlotWidth(paths.finalLayout, tab.mount, helpers);
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
    const conversionArgs = [
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
      conversionArgs.push('--tokens-source', tokensSourcePath);
    }
    if (sourceCssPath && fs.existsSync(sourceCssPath)) {
      conversionArgs.push('--source-css', sourceCssPath);
    }
    conversionArgs.push('--use-computed-style');

    const proc = await helpers.runNodeStep(`dom-to-ui-json:tab-fragment:${key}`, 'dom-to-ui-json.js', conversionArgs);
    const converted = helpers.readJsonIfExists(layoutOut);
    const normalized = normalizeFragmentLayout(converted, tab.id, slotWidthByTabId.get(tab.id) || null);
    const fragmentTarget = path.join(runtime.fragmentsDir, `${prefix}-${key}-content.json`);
    if (proc.status === 0 && normalized) {
      helpers.writeJson(fragmentTarget, normalized);
      const merge = mergeSkinSlots(paths.finalSkin, skinOut, helpers);
      result.mergedSkinSlots += merge.merged;
      result.fragments.push({
        id: tab.id,
        key,
        ok: true,
        layout: helpers.rel(fragmentTarget),
        sourceHtml: helpers.rel(tab.html),
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
    const nextRouting = writePerTabReplayRouting(paths, opts, routing, result.fragments, helpers);
    const lazySlotUpdate = updateLazySlotDefaultFragments(paths.finalLayout, nextRouting, helpers);
    result.tabRoutingPath = helpers.rel(helpers.sidecarPath(paths.finalLayout, '.tab-routing.json'));
    result.tabRoutingCount = nextRouting.tabs.length;
    result.lazySlotDefaultUpdated = lazySlotUpdate.changed;
  }
  return result;
}

module.exports = {
  runPerTabReplay,
};
