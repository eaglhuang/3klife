// doc_id: doc_other_0009 - LazySlot fragment fill-root geometry contract.
'use strict';

const fs = require('fs');
const path = require('path');

const FILL_WIDGET = Object.freeze({ top: 0, left: 0, right: 0, bottom: 0 });
const TAB_ROUTE_META_KEYS = new Set(['screenId', 'generatedAt', 'schemaVersion', 'version', 'summary']);

function assessReferencedFragmentGeometry(args) {
  const opts = args || {};
  const uiSpecRoot = opts.uiSpecRoot || path.join(opts.repoRoot || process.cwd(), 'assets', 'resources', 'ui-spec');
  const screen = opts.screen || readJsonIfExists(opts.screenId ? path.join(uiSpecRoot, 'screens', `${opts.screenId}.json`) : null);
  const layout = opts.layout || readLayoutForScreen(uiSpecRoot, screen);
  const refs = collectReferencedFragmentRefs({
    layout,
    screen,
    tabRouting: opts.tabRouting,
  });

  const checks = [];
  for (const item of refs) {
    const filePath = resolveFragmentPath(uiSpecRoot, item.fragment);
    if (!filePath) {
      checks.push({
        status: 'blocker',
        ref: item.fragment,
        source: item.source,
        slotId: item.slotId || null,
        tabId: item.tabId || null,
        code: 'missing-fragment',
        summary: 'Referenced fragment JSON does not exist.',
        recommendation: 'Create the fragment JSON or update the tab/defaultFragment route to a valid fragment.',
      });
      continue;
    }
    let json = null;
    try {
      json = readJson(filePath);
    } catch (error) {
      checks.push({
        status: 'blocker',
        ref: item.fragment,
        source: item.source,
        filePath,
        code: 'invalid-fragment-json',
        summary: error.message,
        recommendation: 'Fix the fragment JSON before running visual QA.',
      });
      continue;
    }
    const analysis = analyzeFragmentGeometry(json, { ref: item.fragment, filePath });
    checks.push(Object.assign({}, item, analysis, {
      filePath,
      path: path.relative(uiSpecRoot, filePath).replace(/\\/g, '/'),
    }));
  }

  const failures = checks.filter(check => check.status === 'blocker');
  return {
    status: failures.length > 0 ? 'blocker' : 'pass',
    workUnits: failures.length,
    summary: failures.length === 0
      ? `${checks.length} referenced fragments follow fill-root geometry contract`
      : `${failures.length}/${checks.length} referenced fragments break fill-root geometry contract`,
    checks,
    failures,
  };
}

function normalizeReferencedFragmentFiles(args) {
  const opts = args || {};
  const repoRoot = opts.repoRoot || process.cwd();
  const uiSpecRoot = opts.uiSpecRoot || path.join(repoRoot, 'assets', 'resources', 'ui-spec');
  const screen = opts.screen || readJsonIfExists(path.join(uiSpecRoot, 'screens', `${opts.screenId}.json`));
  const layout = opts.layout || readLayoutForScreen(uiSpecRoot, screen);
  const refs = collectReferencedFragmentRefs({
    layout,
    screen,
    tabRouting: opts.tabRouting,
  });
  const normalized = [];
  const skipped = [];
  const failures = [];

  for (const item of refs) {
    const filePath = resolveFragmentPath(uiSpecRoot, item.fragment);
    if (!filePath) {
      failures.push({ ref: item.fragment, code: 'missing-fragment' });
      continue;
    }
    let json;
    try {
      json = readJson(filePath);
    } catch (error) {
      failures.push({ ref: item.fragment, code: 'invalid-fragment-json', message: error.message });
      continue;
    }
    const result = normalizeFragmentGeometry(json);
    if (!result.changed) {
      skipped.push({ ref: item.fragment, path: path.relative(repoRoot, filePath).replace(/\\/g, '/') });
      continue;
    }
    if (opts.write) {
      fs.writeFileSync(filePath, JSON.stringify(result.fragment, null, 2) + '\n', 'utf8');
    }
    normalized.push({
      ref: item.fragment,
      path: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
      changes: result.changes,
    });
  }

  return {
    ok: failures.length === 0,
    write: !!opts.write,
    referencedCount: refs.length,
    normalizedCount: normalized.length,
    skippedCount: skipped.length,
    normalized,
    skipped,
    failures,
  };
}

function collectReferencedFragmentRefs(args) {
  const out = [];
  const seen = new Set();
  const add = (fragment, source, meta) => {
    const normalized = normalizeFragmentRef(fragment);
    if (!normalized) return;
    const key = normalized;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(Object.assign({
      fragment: normalized,
      source,
    }, meta || {}));
  };

  walkLayoutNodes(unwrapLayoutRoot(args.layout), (node) => {
    if (!node || node.lazySlot !== true) return;
    const slotId = typeof node.name === 'string' ? node.name : null;
    add(node.defaultFragment, 'layout.defaultFragment', { slotId });
    for (const fragment of Array.isArray(node.fragments) ? node.fragments : []) {
      add(fragment, 'layout.fragments', { slotId });
    }
  });

  const screen = args.screen || {};
  if (screen.preview && screen.preview.lazySlotFragments && typeof screen.preview.lazySlotFragments === 'object') {
    for (const [slotId, fragment] of Object.entries(screen.preview.lazySlotFragments)) {
      add(fragment, 'screen.preview.lazySlotFragments', { slotId });
    }
  }

  collectTabRoutingFragments(screen.tabRouting, 'screen.tabRouting', add);
  collectTabRoutingFragments(args.tabRouting, 'tabRouting', add);
  return out;
}

function collectTabRoutingFragments(tabRouting, source, add) {
  if (!tabRouting || typeof tabRouting !== 'object') return;
  const entries = Array.isArray(tabRouting.tabs)
    ? tabRouting.tabs.map((route, index) => [route && (route.id || route.tabId || String(index)), route])
    : Object.entries(tabRouting).filter(([key]) => !TAB_ROUTE_META_KEYS.has(key));
  for (const [tabId, route] of entries) {
    const routeObj = route && typeof route === 'object' ? route : {};
    add(routeObj.fragment || routeObj.defaultFragment, source, {
      tabId: tabId || null,
      slotId: routeObj.slotId || routeObj.mount || routeObj.contentRoot || routeObj.mountTarget || null,
    });
  }
}

function analyzeFragmentGeometry(fragment) {
  const root = unwrapLayoutRoot(fragment);
  if (!root || typeof root !== 'object') {
    return {
      status: 'blocker',
      code: 'missing-fragment-root',
      summary: 'Fragment does not expose a root node.',
      recommendation: 'Wrap fragment content in a root container with widget top/left/right/bottom = 0.',
      findings: [],
    };
  }

  const layers = [{ role: 'root', path: nodeLabel(root, 'root'), node: root }];
  const first = firstMountWrapperCandidate(root);
  if (first) {
    layers.push({ role: 'first-child-mount-wrapper', path: `${nodeLabel(root, 'root')}/${nodeLabel(first, 'children[0]')}`, node: first });
  }

  const findings = [];
  for (const layer of layers) {
    const fixed = hasFixedBox(layer.node);
    const fill = hasFillWidget(layer.node);
    if (fixed && !fill) {
      findings.push({
        code: 'fixed-size-mount-wrapper',
        role: layer.role,
        path: layer.path,
        width: layer.node.width,
        height: layer.node.height,
        recommendation: 'Move width/height to an inner semantic content node and make this mount layer fill its lazySlot.',
      });
    }
  }

  return {
    status: findings.length > 0 ? 'blocker' : 'pass',
    code: findings.length > 0 ? 'fixed-size-mount-wrapper' : 'fill-root-ok',
    summary: findings.length > 0
      ? `${findings.length} mount layer(s) use fixed width/height without fill widget`
      : 'fragment mount layers fill lazySlot',
    recommendation: findings.length > 0
      ? 'Use fill-root contract on the fragment root/outer wrapper; keep card/list item dimensions inside the content layer.'
      : null,
    findings,
  };
}

function normalizeFragmentGeometry(fragment) {
  const clone = deepClone(fragment);
  const root = unwrapLayoutRoot(clone);
  const changes = [];
  if (!root || typeof root !== 'object') {
    return { changed: false, fragment: clone, changes };
  }

  ensureFillLayer(root, 'root', changes);
  const first = firstMountWrapperCandidate(root);
  if (first && hasFixedBox(first) && !hasFillWidget(first)) {
    ensureFillLayer(first, `root/${nodeLabel(first, 'children[0]')}`, changes);
  }
  normalizeGridFallbackCellSizes(root, changes);
  normalizeGridSingleRowToHorizontal(root, changes);

  return {
    changed: changes.length > 0,
    fragment: clone,
    changes,
  };
}

function ensureFillLayer(node, layerPath, changes) {
  let changed = false;
  if (hasFixedBox(node)) {
    delete node.width;
    delete node.height;
    changed = true;
  }
  if (!hasFillWidget(node)) {
    node.widget = Object.assign({}, FILL_WIDGET);
    changed = true;
  }
  if (changed && node._geometryContract !== 'fill-root') {
    node._geometryContract = 'fill-root';
  }
  if (changed) {
    changes.push({ path: layerPath, action: 'apply-fill-root-contract' });
  }
}

function normalizeGridFallbackCellSizes(root, changes) {
  walkLayoutNodes(root, (node) => {
    if (!node || !node.layout || node.layout.type !== 'grid') return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) return;

    const maxChildWidth = maxFinite(children.map(child => child && child.width));
    const maxChildHeight = maxFinite(children.map(child => child && child.height));

    if (isFinitePositiveNumber(node.layout.cellWidth) && maxChildWidth > node.layout.cellWidth) {
      delete node.layout.cellWidth;
      changes.push({ path: `${nodeLabel(node, 'grid')}.layout.cellWidth`, action: 'drop-grid-cell-width-fallback' });
    }
    if (isFinitePositiveNumber(node.layout.cellHeight) && maxChildHeight > node.layout.cellHeight) {
      delete node.layout.cellHeight;
      changes.push({ path: `${nodeLabel(node, 'grid')}.layout.cellHeight`, action: 'drop-grid-cell-height-fallback' });
    }
  });
}

/**
 * 把「沒有 cellWidth 的單行 grid」升格為 horizontal layout。
 *
 * 來源：HTML 端的 display:grid 含有 fr 單位（如 "220px 1fr"、"1fr 1fr"），
 * draft-builder.js 過去無法識別 fr 而生成了 grid，但 Cocos Layout 需要固定
 * cellWidth，沒有它子節點會疊在一起。
 *
 * 修正規則：如果 grid.layout 沒有 cellWidth 且 children 數量 ≤ constraintNum
 * （即整個 grid 只有一行），則改為 horizontal layout，保留 spacingX、alignItems。
 */
function normalizeGridSingleRowToHorizontal(root, changes) {
  walkLayoutNodes(root, (node) => {
    if (!node || !node.layout) return;
    const layout = node.layout;
    if (layout.type !== 'grid') return;
    if (isFinitePositiveNumber(layout.cellWidth)) return; // 有 cellWidth 不動
    const constraintNum = layout.constraintNum;
    if (!constraintNum || constraintNum <= 0) return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) return;
    // 只有一行（children ≤ constraintNum）才轉 horizontal
    if (children.length > constraintNum) return;

    const newLayout = { type: 'horizontal' };
    if (isFinitePositiveNumber(layout.spacingX)) newLayout.spacingX = layout.spacingX;
    if (layout.alignItems) newLayout.alignItems = layout.alignItems;
    node.layout = newLayout;
    changes.push({
      path: nodeLabel(node, 'grid'),
      action: 'grid-no-cellwidth-single-row-to-horizontal',
    });
  });
}

function maxFinite(values) {
  let out = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value > out) out = value;
  }
  return out;
}

function firstMountWrapperCandidate(root) {
  const children = Array.isArray(root.children) ? root.children : [];
  if (children.length !== 1) return null;
  const first = children[0];
  if (!first || typeof first !== 'object') return null;
  if (first.lazySlot === true) return null;
  if (!Array.isArray(first.children) || first.children.length === 0) return null;
  if (!isContainerLike(first)) return null;
  if (!first.layout && !hasFixedBox(first) && !hasFillWidget(first)) return null;
  return first;
}

function isContainerLike(node) {
  const type = String(node.type || 'container').toLowerCase();
  return type === 'container' || type === 'panel' || type === 'group';
}

function hasFixedBox(node) {
  return isFinitePositiveNumber(node && node.width) && isFinitePositiveNumber(node && node.height);
}

function hasFillWidget(node) {
  const widget = node && node.widget;
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) return false;
  return ['top', 'left', 'right', 'bottom'].every(key => widget[key] === 0);
}

function isFinitePositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function unwrapLayoutRoot(layout) {
  return layout && layout.root && typeof layout.root === 'object' ? layout.root : layout;
}

function walkLayoutNodes(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const child of Array.isArray(node.children) ? node.children : []) {
    walkLayoutNodes(child, callback);
  }
}

function normalizeFragmentRef(ref) {
  if (typeof ref !== 'string') return null;
  const normalized = ref.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.json$/i, '');
  return normalized.length > 0 ? normalized : null;
}

function resolveFragmentPath(uiSpecRoot, ref) {
  const normalized = normalizeFragmentRef(ref);
  if (!normalized) return null;
  const candidates = [];
  if (path.isAbsolute(normalized)) candidates.push(normalized);
  candidates.push(path.join(uiSpecRoot, `${normalized}.json`));
  if (!normalized.startsWith('fragments/')) {
    candidates.push(path.join(uiSpecRoot, 'fragments', `${normalized}.json`));
    candidates.push(path.join(uiSpecRoot, 'fragments', 'layouts', `${normalized}.json`));
    candidates.push(path.join(uiSpecRoot, 'layouts', `${normalized}.json`));
  }
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function readLayoutForScreen(uiSpecRoot, screen) {
  if (!screen || typeof screen.layout !== 'string') return null;
  const layoutId = screen.layout.trim();
  if (!layoutId) return null;
  for (const suffix of ['.json', '.layout.json']) {
    const candidate = path.join(uiSpecRoot, 'layouts', `${layoutId}${suffix}`);
    if (fs.existsSync(candidate)) return readJson(candidate);
  }
  return null;
}

function nodeLabel(node, fallback) {
  return String(node && (node.name || node.id || node._ucufId) || fallback);
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  assessReferencedFragmentGeometry,
  normalizeReferencedFragmentFiles,
  collectReferencedFragmentRefs,
  analyzeFragmentGeometry,
  normalizeFragmentGeometry,
  resolveFragmentPath,
};
