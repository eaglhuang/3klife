'use strict';

const fs = require('fs');
const path = require('path');

function normalizeInteractionKey(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
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

function routeFragmentExists(route, repoRoot) {
  if (!route || !route.fragment) return false;
  const fragmentPath = path.join(repoRoot, 'assets', 'resources', 'ui-spec', `${route.fragment}.json`);
  return fs.existsSync(fragmentPath);
}

function resolveInteractionFallbackRoute(routeMap, target, repoRoot) {
  const key = normalizeInteractionKey(target);
  if (!/^(?:pool-)?(?:prev(?:ious)?|next)$/.test(key)) return null;
  const candidates = [];
  for (const [routeKey, route] of routeMap.entries()) {
    if (!route || !route.slotId || !route.fragment) continue;
    if (/^(?:pool-)?(?:prev(?:ious)?|next)$/.test(routeKey)) continue;
    if (!routeFragmentExists(route, repoRoot)) continue;
    candidates.push(route);
  }
  if (candidates.length === 0) return null;
  return /prev/.test(key) ? candidates[candidates.length - 1] : candidates[0];
}

function buildRuntimeInteractionSmokeStep(args) {
  const {
    paths,
    opts,
    sourceHtml,
    repoRoot,
    helpers,
  } = args;
  const runtime = helpers.resolveCanonicalRuntimePaths(opts.screenId);
  const mode = opts.runtimeSync ? 'runtime' : 'dry-run';
  const interactionPath = helpers.firstExistingPath([
    opts.runtimeSync ? path.join(runtime.screensDir, `${opts.screenId}.interaction.json`) : null,
    paths && paths.finalLayout ? helpers.sidecarPath(paths.finalLayout, '.interaction.json') : null,
    paths && paths.rawLayout ? helpers.sidecarPath(paths.rawLayout, '.interaction.json') : null,
  ]);
  const tabRoutingPath = helpers.firstExistingPath([
    opts.runtimeSync ? path.join(runtime.screensDir, `${opts.screenId}.tab-routing.json`) : null,
    paths && paths.finalLayout ? helpers.sidecarPath(paths.finalLayout, '.tab-routing.json') : null,
    paths && paths.rawLayout ? helpers.sidecarPath(paths.rawLayout, '.tab-routing.json') : null,
  ]);
  const screenPath = helpers.firstExistingPath([
    opts.runtimeSync ? runtime.screenPath : null,
    paths && paths.finalLayout ? helpers.sidecarPath(paths.finalLayout, '.screen.json') : null,
    paths && paths.rawLayout ? helpers.sidecarPath(paths.rawLayout, '.screen.json') : null,
    runtime.screenPath,
  ]);
  const layoutPath = helpers.firstExistingPath([
    opts.runtimeSync ? runtime.layoutPath : null,
    paths && paths.finalLayout ? paths.finalLayout : null,
    paths && paths.optimizedLayout ? paths.optimizedLayout : null,
    paths && paths.rawLayout ? paths.rawLayout : null,
    runtime.layoutPath,
  ]);
  const interaction = helpers.readJsonIfExists(interactionPath);
  const actions = interaction && Array.isArray(interaction.actions) ? interaction.actions : [];
  const required = actions.length > 0 || /data-ucuf-action|tabSwitch|switchTab|pool-prev|pool-next/i.test(String(sourceHtml || ''));
  const base = {
    step: 'runtime-interaction-smoke',
    mode,
    required,
    interaction: interactionPath ? helpers.rel(interactionPath) : null,
    tabRouting: tabRoutingPath && fs.existsSync(tabRoutingPath) ? helpers.rel(tabRoutingPath) : null,
    screenSource: screenPath ? helpers.rel(screenPath) : null,
    layoutSource: layoutPath ? helpers.rel(layoutPath) : null,
    actionsDeclared: actions.length,
    actionsBound: 0,
    smokeResults: [],
  };
  if (!required) return Object.assign(base, { exitCode: 0, ok: true, skipped: true, reason: 'no-interaction-sidecar-or-source-action' });
  if (!interaction) {
    return Object.assign(base, {
      exitCode: 1,
      ok: false,
      error: mode === 'runtime' ? 'synced-interaction-sidecar-missing' : 'dryrun-interaction-sidecar-missing',
    });
  }

  const screen = helpers.readJsonIfExists(screenPath);
  const layout = helpers.readJsonIfExists(layoutPath);
  const tabRouting = helpers.readJsonIfExists(tabRoutingPath);
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
    let route = resolveInteractionRoute(routeMap, target);
    if (!route || !route.slotId || !route.fragment) {
      results.push({ actionId, trigger, target, status: 'missing-route' });
      continue;
    }
    let fallbackFrom = null;
    if (!routeFragmentExists(route, repoRoot)) {
      const fallback = resolveInteractionFallbackRoute(routeMap, target, repoRoot);
      if (fallback) {
        fallbackFrom = route.fragment;
        route = fallback;
      }
    }
    if (lazySlots.size > 0 && !lazySlots.has(route.slotId)) {
      results.push({ actionId, trigger, target, status: 'missing-slot', slotId: route.slotId, fragment: route.fragment });
      continue;
    }
    const fragmentPath = path.join(repoRoot, 'assets', 'resources', 'ui-spec', `${route.fragment}.json`);
    if (!fs.existsSync(fragmentPath)) {
      results.push({ actionId, trigger, target, status: 'missing-fragment', slotId: route.slotId, fragment: route.fragment });
      continue;
    }
    results.push({
      actionId,
      trigger,
      target,
      status: 'bound',
      slotId: route.slotId,
      fragment: route.fragment,
      fallbackFrom,
    });
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

function assessInteractionRuntime(args) {
  const { paths, steps, sourceHtml, helpers } = args;
  const interactionPath = helpers.firstExistingPath([
    paths && paths.finalLayout ? helpers.sidecarPath(paths.finalLayout, '.interaction.json') : null,
  ]);
  const interaction = helpers.readJsonIfExists(interactionPath);
  const actionCount = interaction && Array.isArray(interaction.actions) ? interaction.actions.length : 0;
  const required = actionCount > 0 || /data-ucuf-action|tabSwitch|switchTab|pool-prev|pool-next/i.test(String(sourceHtml || ''));
  const smokeStep = (steps || []).find(step => step && step.step === 'runtime-interaction-smoke');
  const smokeResults = smokeStep && Array.isArray(smokeStep.smokeResults) ? smokeStep.smokeResults : [];
  const actionsBound = Number(smokeStep && smokeStep.actionsBound || 0);
  const status = !required
    ? 'pass'
    : !smokeStep
      ? 'not-run'
      : (smokeStep.ok ? 'pass' : 'fail');
  return {
    required,
    status,
    mode: smokeStep && smokeStep.mode || null,
    error: smokeStep && smokeStep.error || null,
    actionsDeclared: actionCount,
    actionsBound,
    smokeResults,
    source: interactionPath ? helpers.rel(interactionPath) : null,
  };
}

module.exports = {
  buildRuntimeInteractionSmokeStep,
  assessInteractionRuntime,
};
