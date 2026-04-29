// doc_id: doc_other_0017 — R-25 bake manifest builder
// Pure function: given snapshots[] from computed-style-capture, produce a
// deterministic bake-manifest describing every (selector, property, value,
// width, height) tuple that still has an HTML/Cocos fidelity gap.
// Generic for any UI run through the dom-to-ui-json pipeline.
//
// Why this exists (technical-director rationale):
//   The classifier's `assetize` bucket is the truth, but it lives in
//   `*.css-coverage.json` aggregated per-property without selector context
//   or target dimensions. Reviewers / artists / the future R-15 puppeteer
//   bake script all need the SAME enriched form: which DOM selector, which
//   element bounding box, which property + value sample. This module is
//   that single source of truth.
//
//   By keeping the contract stable here:
//     - R-15 puppeteer bake reads only entries explicitly approved for
//       `auto-screenshot-fragment`
//     - Artists can use this as a review list without mistaking every
//       assetize row for a PNG shopping list
//     - Reviewer can aggregate cross-screen "what's missing" without
//       re-walking every CSS file
//
// Design principles:
//   1. No I/O, no puppeteer launch — runs inside the existing
//      fidelity-sidecars puppeteer pass at zero extra cost.
//   2. Deterministic ordering (selector path, property name) so git diffs
//      stay clean across runs.
//   3. Every entry carries a stable `bakeId` derived from
//      `<screenId>__<sanitised-selector>__<property>`. Re-running the
//      pipeline produces the same id; PNGs can be parked next to the
//      manifest with that exact filename.
//   4. Per-entry `bakeAction` separates art-review / converter geometry /
//      auto screenshot. Only small elements explicitly marked with
//      `data-ucuf-bake="fragment"` receive an outputPath.
//   5. Bucket = always `assetize`. `partial-supported` is intentionally
//      excluded because half-rendered = R-15 only handles the missing
//      half (different bake recipe, future R-26 territory).

'use strict';

const { classifyCssProperty } = require('./css-capability-matrix');

// Subset of properties that drive a bake. Mirrors the assetize-capable set
// in css-capability-matrix.js. Kept separate (instead of reading the matrix)
// because the matrix exposes only `classifyCssProperty` per key and not the
// assetize-set; this list is the explicit declaration of "things we'd
// realistically bake into a placeholder PNG".
const BAKE_RELEVANT_PROPS = new Set([
  'background',
  'background-image',
  'box-shadow',
  'text-shadow',
  'filter',
  'backdrop-filter',
  'clip-path',
  'mask',
  'mask-image',
  'mix-blend-mode',
  'content',
]);

const AUTO_BAKE_MODES = new Set(['fragment', 'small-fragment', 'asset-fragment']);
const DEFAULT_AUTO_BAKE_LIMITS = {
  maxWidth: 256,
  maxHeight: 256,
  maxArea: 65536,
  maxViewportAreaRatio: 0.08,
};

function sanitiseForFilename(s) {
  return String(s || '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function rectOf(snap) {
  if (!snap || !snap.styles) return null;
  const r = snap.styles._rect;
  if (!r || typeof r.w !== 'number' || typeof r.h !== 'number') return null;
  return r;
}

function readDeclProperty(snap, prop) {
  if (!snap || !snap.styles) return '';
  const v = snap.styles[prop];
  return typeof v === 'string' ? v.trim() : '';
}

function skinSlotKindOf(prop) {
  return prop === 'box-shadow' || prop === 'text-shadow' || prop === 'filter' || prop === 'backdrop-filter' ? 'shadow-set'
    : prop === 'clip-path' || prop === 'mask' || prop === 'mask-image' ? 'mask-set'
    : 'background-set';
}

function normaliseBakeMode(snap) {
  return String((snap && snap.bakeMode) || '').trim().toLowerCase();
}

function classifyBakeAction({ snap, prop, rect, viewport, limits }) {
  const mode = normaliseBakeMode(snap);
  const explicitFragment = AUTO_BAKE_MODES.has(mode);
  const width = Math.max(1, Math.round(rect.w));
  const height = Math.max(1, Math.round(rect.h));
  const area = width * height;
  const viewportArea = viewport && viewport.width && viewport.height ? viewport.width * viewport.height : 0;
  const viewportRatio = viewportArea ? area / viewportArea : 0;
  const tooLarge = width > limits.maxWidth || height > limits.maxHeight || area > limits.maxArea ||
    (viewportRatio > 0 && viewportRatio > limits.maxViewportAreaRatio);

  if (prop === 'clip-path' || prop === 'mask' || prop === 'mask-image') {
    return {
      autoBake: false,
      bakeAction: 'converter-geometry',
      status: 'needs-converter-rule',
      artGuidance: 'Geometry/mask CSS is not a missing picture. Implement as Cocos mask/vector/shape logic; do not screenshot rendered content.',
    };
  }

  if (tooLarge) {
    return {
      autoBake: false,
      bakeAction: 'manual-art-asset',
      status: 'needs-art-asset',
      artGuidance: 'Element is too large for screenshot-fragment bake. Use a proper art asset/JPG/family layer, not a captured UI rectangle.',
    };
  }

  if (!explicitFragment) {
    return {
      autoBake: false,
      bakeAction: 'review-only',
      status: 'needs-art-direction',
      artGuidance: 'Not auto-baked by default. Add data-ucuf-bake="fragment" only to small standalone missing visual fragments.',
    };
  }

  return {
    autoBake: true,
    bakeAction: 'auto-screenshot-fragment',
    status: 'pending-bake',
    artGuidance: 'Small explicit fragment. Build-time screenshot is allowed; runtime still loads a normal SpriteFrame.',
  };
}

/**
 * Build a deterministic bake manifest from captured DOM snapshots.
 * @param {Object} args
 * @param {Array}  args.snapshots   - output of captureComputedStyles()
 * @param {string} args.screenId    - logical screen id (e.g. 'character-ds3-main')
 * @param {string} [args.sidecarBundle='resources']
 *   Cocos bundle that placeholders should land in. Default: `resources`.
 * @param {string} [args.sourceHtml]
 *   Source HTML path (workspace-relative or absolute) that R-15 bake should
 *   re-load to locate elements via `[data-ucuf-capture-id]`. Stored verbatim
 *   so bake scripts run self-contained without extra CLI args.
 * @param {Object} [args.viewport] - {width,height} the source was captured at.
 * @param {Object} [args.autoBakeLimits]
 *   Optional art-direction thresholds for screenshot fragments.
 * @returns {Object} manifest with `entries[]` and `summary`.
 */
function buildBakeManifest(args) {
  const snapshots = Array.isArray(args && args.snapshots) ? args.snapshots : [];
  const screenId = String((args && args.screenId) || 'unknown-screen');
  const sidecarBundle = String((args && args.sidecarBundle) || 'resources');
  const sourceHtml = (args && args.sourceHtml) ? String(args.sourceHtml) : null;
  const viewport = (args && args.viewport && typeof args.viewport === 'object')
    ? { width: args.viewport.width || null, height: args.viewport.height || null }
    : null;
  const autoBakeLimits = { ...DEFAULT_AUTO_BAKE_LIMITS, ...((args && args.autoBakeLimits) || {}) };

  const entries = [];
  // Track (selector, property, value) tuples so the same value declared in
  // multiple selectors still produces one entry per selector (renderer
  // distinct), but identical declarations on the same selector dedupe.
  const seen = new Set();

  for (const snap of snapshots) {
    if (!snap || snap.pseudo) {
      // Skip ::before/::after pseudo snapshots for now; pseudo bake is
      // handled by the same path with pseudo-aware bakeId once R-15 lands.
      // Leaving them out keeps the manifest minimal and avoids duplicate
      // background paint already covered by the parent element.
      if (!snap || snap.pseudo) continue;
    }
    const rect = rectOf(snap);
    if (!rect || rect.w <= 0 || rect.h <= 0) continue;

    for (const prop of BAKE_RELEVANT_PROPS) {
      const value = readDeclProperty(snap, prop);
      if (!value || value === 'none' || value === 'normal' || value === 'transparent') continue;
      const cap = classifyCssProperty(prop, value);
      if (cap !== 'assetize') continue;

      const dedupKey = `${snap.path}\u0000${prop}\u0000${value}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const selectorTag = sanitiseForFilename(`${snap.tag}_${snap.id}`);
      const propTag = sanitiseForFilename(prop);
      const bakeId = `${screenId}__${selectorTag}__${propTag}`;
      const decision = classifyBakeAction({ snap, prop, rect, viewport, limits: autoBakeLimits });
      const outputPath = decision.autoBake
        ? `assets/${sidecarBundle}/sidecars/${screenId}/${bakeId}.png`
        : null;

      entries.push({
        bakeId,
        screenId,
        selector: snap.path,
        ucufId: snap.ucufId || null,
        tag: snap.tag,
        nodeId: snap.id,
        property: prop,
        value,
        capability: cap,
        bakeMode: snap.bakeMode || null,
        bakeNote: snap.bakeNote || null,
        target: {
          x: Math.round((rect.x || 0) * 100) / 100,
          y: Math.round((rect.y || 0) * 100) / 100,
          width: Math.max(1, Math.round(rect.w)),
          height: Math.max(1, Math.round(rect.h)),
          dpr: 2,
        },
        outputPath,
        bundleHint: sidecarBundle,
        // Recommended skin slot kind for the converter once R-15 lands.
        // Reviewers / artists do NOT need to act on this; it's purely a
        // forward contract.
        skinSlotKind: skinSlotKindOf(prop),
        autoBake: decision.autoBake,
        bakeAction: decision.bakeAction,
        artGuidance: decision.artGuidance,
        status: decision.status,
      });
    }
  }

  // Stable ordering: by property, then selector, then bakeId.
  entries.sort((a, b) =>
    a.property.localeCompare(b.property) ||
    a.selector.localeCompare(b.selector) ||
    a.bakeId.localeCompare(b.bakeId));

  // Aggregate summary.
  const byProperty = {};
  const bySkinSlotKind = {};
  const byBakeAction = {};
  for (const e of entries) {
    byProperty[e.property] = (byProperty[e.property] || 0) + 1;
    bySkinSlotKind[e.skinSlotKind] = (bySkinSlotKind[e.skinSlotKind] || 0) + 1;
    byBakeAction[e.bakeAction] = (byBakeAction[e.bakeAction] || 0) + 1;
  }

  return {
    schemaVersion: '1.2.0',
    schemaSpec: 'doc_other_0017 (R-25 + R-26 sourceHtml/viewport + R-27 art-gated autoBake)',
    screenId,
    sidecarBundle,
    sidecarRoot: `assets/${sidecarBundle}/sidecars/${screenId}/`,
    sourceHtml,
    viewport,
    bakerHint: {
      tool: 'puppeteer-core (build-time)',
      runWhen: 'developer / CI; never at runtime',
      runtimeCost: 'zero — runtime only loads pre-baked PNGs as SpriteFrame',
      autoBakeContract:
        'Only entries with autoBake=true and bakeAction=auto-screenshot-fragment may be baked automatically. ' +
        'Authors must mark small standalone missing fragments with data-ucuf-bake="fragment"; large UI regions and geometry masks are review/converter work.',
      artistOverride:
        'For autoBake entries only: drop a same-named PNG at outputPath to replace the placeholder; ' +
        'converter loads via uuid, no code change required.',
    },
    summary: {
      totalEntries: entries.length,
      autoBakeEntries: entries.filter(e => e.autoBake).length,
      reviewOnlyEntries: entries.filter(e => !e.autoBake).length,
      byProperty,
      bySkinSlotKind,
      byBakeAction,
    },
    entries,
  };
}

module.exports = { buildBakeManifest, BAKE_RELEVANT_PROPS };
