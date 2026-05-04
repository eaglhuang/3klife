// doc_id: doc_other_0009 - Visual diff zone ownership taxonomy.
'use strict';

const TAXONOMY = ['art-authority', 'manual-art-asset', 'runtime-renderer', 'converter-geometry', 'source-html-fix', 'runtime-bug'];
const OWNER_BUCKETS = [
  'art-authority-owner',
  'assetization-owner',
  'runtime-renderer-owner',
  'converter-owner',
  'source-html-owner',
  'runtime-behavior-owner',
];
const TAXONOMY_PRIORITY = ['runtime-renderer', 'manual-art-asset', 'converter-geometry', 'source-html-fix', 'runtime-bug', 'art-authority'];

function buildZoneOwnershipReport(args) {
  args = args || {};
  const zones = [];
  const screenId = args.screenId || null;
  const pixelContext = inferPixelDiffContext(args.cssCapabilities);
  appendArtAuthorityZones(zones, args.artAuthorityValidation);
  appendSyncAssetZones(zones, args.syncReport);
  appendCssZones(zones, args.cssCapabilities);
  appendPixelDiffZones(zones, args.pixelDiff, pixelContext);
  hydrateTraceability(zones, args.traceCatalog);
  const summary = summarize(zones);
  return {
    schemaVersion: '1.1.0',
    screenId,
    taxonomy: TAXONOMY,
    ownerBuckets: OWNER_BUCKETS,
    summary,
    nextFixes: buildNextFixes(zones),
    compactResidualSummary: buildCompactResidualSummary(zones, summary),
    zones,
  };
}

function appendArtAuthorityZones(zones, validation) {
  if (!validation || !Array.isArray(validation.waivers)) return;
  for (const waiver of validation.waivers) {
    zones.push({
      id: `art-authority:${waiver.id}`,
      taxonomy: 'art-authority',
      ownerBucket: ownerBucketForTaxonomy('art-authority'),
      zoneId: waiver.zoneId,
      rect: waiver.rect || null,
      rectStatus: waiver.rect ? 'ready' : 'missing-final-capture-rect',
      evidence: [{ type: 'art-authority-waiver', id: waiver.id }],
      traceability: buildTraceability({ taxonomy: 'art-authority', confidence: 'direct-waiver', runtimeOwner: ownerBucketForTaxonomy('art-authority') }),
      waiverEligible: !!waiver.rect,
      recommendation: 'review-approved-runtime-art-delta',
    });
  }
}

function appendSyncAssetZones(zones, syncReport) {
  const changes = syncReport && Array.isArray(syncReport.fieldChanges) ? syncReport.fieldChanges : [];
  for (const change of changes) {
    if (!change || change.kind !== 'existing-runtime-asset-preserved') continue;
    const isButtonSkin = /button/i.test(String(change.detail || ''));
    const taxonomy = isButtonSkin ? 'art-authority' : 'manual-art-asset';
    zones.push({
      id: `sync-asset:${change.path}`,
      taxonomy,
      ownerBucket: ownerBucketForTaxonomy(taxonomy),
      zoneId: change.path,
      rect: null,
      rectStatus: 'missing-final-capture-rect',
      evidence: [{ type: 'sync-report', path: change.path, detail: change.detail || null }],
      traceability: buildTraceability({ taxonomy, confidence: 'sync-report', runtimeOwner: ownerBucketForTaxonomy(taxonomy) }),
      waiverEligible: isButtonSkin,
      recommendation: isButtonSkin ? 'capture-small-rect-before-waiver' : 'keep-formal-runtime-asset-auditable',
    });
  }
}

function appendCssZones(zones, cssCapabilities) {
  const offenders = cssCapabilities && Array.isArray(cssCapabilities.topOffenders) ? cssCapabilities.topOffenders : [];
  for (const offender of offenders) {
    const taxonomy = classifyCssOffender(offender);
    const ownerBucket = ownerBucketForTaxonomy(taxonomy);
    zones.push({
      id: `css:${offender.property}:${offender.capability}`,
      taxonomy,
      ownerBucket,
      zoneId: offender.property,
      rect: null,
      rectStatus: 'not-available-from-css-summary',
      evidence: [{ type: 'css-capability', property: offender.property, capability: offender.capability, count: offender.count || 0, samples: offender.samples || [] }],
      traceability: buildTraceability({
        taxonomy,
        confidence: 'css-summary-direct',
        runtimeOwner: ownerBucket,
        sourceProperties: [offender.property],
      }),
      waiverEligible: false,
      recommendation: recommendationForTaxonomy(taxonomy),
    });
  }
}

function appendPixelDiffZones(zones, pixelDiff, pixelContext) {
  const buckets = pixelDiff && Array.isArray(pixelDiff.unwaivedDiffTopList) ? pixelDiff.unwaivedDiffTopList : [];
  const fallbackTaxonomy = pixelContext && pixelContext.taxonomy ? pixelContext.taxonomy : 'converter-geometry';
  const ownerBucket = pixelContext && pixelContext.ownerBucket ? pixelContext.ownerBucket : ownerBucketForTaxonomy(fallbackTaxonomy);
  for (const bucket of buckets.slice(0, 20)) {
    zones.push({
      id: `pixel-diff:${bucket.rank}`,
      taxonomy: fallbackTaxonomy,
      ownerBucket,
      zoneId: `pixel-diff-bucket-${bucket.rank}`,
      rect: bucket.rect || null,
      rectStatus: bucket.rect ? 'ready' : 'missing',
      evidence: [{
        type: 'pixel-diff',
        mismatchPixels: bucket.mismatchPixels || 0,
        mismatchRatio: bucket.mismatchRatio || 0,
        suggestedByCssProperties: pixelContext && pixelContext.sourceProperties ? pixelContext.sourceProperties : [],
      }],
      traceability: buildTraceability({
        taxonomy: fallbackTaxonomy,
        confidence: pixelContext ? 'heuristic-from-css-top-offenders' : 'pixel-only-default',
        runtimeOwner: ownerBucket,
        sourceProperties: pixelContext && pixelContext.sourceProperties ? pixelContext.sourceProperties : [],
      }),
      waiverEligible: false,
      recommendation: pixelContext && pixelContext.recommendation
        ? pixelContext.recommendation
        : 'inspect-against-css-and-layout-before-art-waiver',
    });
  }
}

function classifyCssOffender(offender) {
  const prop = String((offender && offender.property) || '').toLowerCase();
  if (/^(background|background-image|box-shadow|drop-shadow|text-shadow|filter|backdrop-filter)$/.test(prop)) return 'runtime-renderer';
  if (/^(border-image|mix-blend-mode)$/.test(prop)) return 'manual-art-asset';
  if (/^(clip-path|mask|mask-image|transform|perspective|shape-outside)$/.test(prop)) return 'converter-geometry';
  if (/^(content|font-family|font-size|line-height|letter-spacing|text-transform)$/.test(prop)) return 'source-html-fix';
  if (/^(cursor|pointer-events|transition|animation)$/.test(prop)) return 'runtime-bug';
  return 'converter-geometry';
}

function recommendationForTaxonomy(taxonomy) {
  switch (taxonomy) {
    case 'art-authority': return 'keep-runtime-art-and-require-rect-scoped-waiver';
    case 'manual-art-asset': return 'replace-css-gap-with-formal-runtime-asset-or-family-layer';
    case 'runtime-renderer': return 'fix-runtime-renderer-parity-or-mark-assetization-required';
    case 'converter-geometry': return 'fix-parser-mapper-or-cocos-geometry-rule';
    case 'source-html-fix': return 'fix-source-html-token-text-or-binding-contract';
    case 'runtime-bug': return 'fix-runtime-behavior-not-visual-waiver';
    default: return 'review';
  }
}

function ownerBucketForTaxonomy(taxonomy) {
  switch (taxonomy) {
    case 'art-authority': return 'art-authority-owner';
    case 'manual-art-asset': return 'assetization-owner';
    case 'runtime-renderer': return 'runtime-renderer-owner';
    case 'converter-geometry': return 'converter-owner';
    case 'source-html-fix': return 'source-html-owner';
    case 'runtime-bug': return 'runtime-behavior-owner';
    default: return 'converter-owner';
  }
}

function buildTraceability(args) {
  return {
    sourceDomSelectors: [],
    ucufNodeSlots: [],
    runtimeOwner: args.runtimeOwner || null,
    sourceProperties: Array.isArray(args.sourceProperties) ? args.sourceProperties : [],
    confidence: args.confidence || 'unknown',
    selectorTracePending: true,
  };
}

function hydrateTraceability(zones, traceCatalog) {
  const catalog = Array.isArray(traceCatalog) ? traceCatalog : [];
  if (catalog.length === 0) return;
  for (const zone of zones) {
    zone.traceability = resolveZoneTraceability(zone, catalog);
  }
}

function resolveZoneTraceability(zone, traceCatalog) {
  const base = zone && zone.traceability ? zone.traceability : buildTraceability({
    runtimeOwner: zone && zone.ownerBucket ? zone.ownerBucket : ownerBucketForTaxonomy(zone && zone.taxonomy),
    sourceProperties: inferZonePropertyHints(zone),
  });
  const propertyHints = base.sourceProperties && base.sourceProperties.length > 0
    ? base.sourceProperties
    : inferZonePropertyHints(zone);
  const matches = findTraceMatches({
    rect: zone && zone.rect ? zone.rect : null,
    propertyHints,
    traceCatalog,
    limit: 3,
  });
  if (matches.length === 0) {
    return Object.assign({}, base, {
      sourceProperties: propertyHints,
      selectorTracePending: true,
    });
  }
  const sourceDomSelectors = uniqueStrings(matches.map(match => match.selector));
  const ucufNodeSlots = uniqueSlotRefs(matches.flatMap(match => Array.isArray(match.ucufNodeSlots) ? match.ucufNodeSlots : []));
  return Object.assign({}, base, {
    sourceDomSelectors,
    ucufNodeSlots,
    sourceProperties: propertyHints,
    confidence: matches[0].matchConfidence || 'bake-manifest-layout',
    selectorTracePending: sourceDomSelectors.length === 0 && ucufNodeSlots.length === 0,
  });
}

function inferZonePropertyHints(zone) {
  if (!zone) return [];
  if (zone.id && /^css:/.test(zone.id) && zone.zoneId) return [zone.zoneId];
  const evidence = Array.isArray(zone.evidence) ? zone.evidence : [];
  const sourceProperties = [];
  for (const item of evidence) {
    if (!item) continue;
    if (typeof item.property === 'string' && !sourceProperties.includes(item.property)) {
      sourceProperties.push(item.property);
    }
    if (Array.isArray(item.suggestedByCssProperties)) {
      for (const prop of item.suggestedByCssProperties) {
        if (typeof prop === 'string' && !sourceProperties.includes(prop)) sourceProperties.push(prop);
      }
    }
  }
  return sourceProperties;
}

function findTraceMatches(args) {
  const traceCatalog = Array.isArray(args.traceCatalog) ? args.traceCatalog : [];
  const propertyHints = Array.isArray(args.propertyHints) ? args.propertyHints.filter(Boolean) : [];
  const rect = args.rect || null;
  let candidates = traceCatalog.filter(entry => propertyHints.length === 0 || propertyHints.includes(entry.property));
  if (candidates.length === 0) candidates = traceCatalog;
  const scored = candidates
    .map((entry) => ({ entry, score: scoreTraceEntry(entry, rect, propertyHints) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || String(left.entry.selector || '').localeCompare(String(right.entry.selector || '')))
    .slice(0, args.limit || 3)
    .map((item) => Object.assign({}, item.entry, {
      matchScore: item.score,
      matchConfidence: item.entry.matchConfidence || (rect ? 'bake-manifest-layout-rect' : 'bake-manifest-layout-property'),
    }));
  return scored;
}

function scoreTraceEntry(entry, rect, propertyHints) {
  if (!entry) return -1;
  let score = 1;
  if (propertyHints.length > 0) {
    if (!propertyHints.includes(entry.property)) return -1;
    score += 100;
  }
  if (rect && entry.rect) {
    const overlap = rectOverlapRatio(rect, entry.rect);
    if (overlap > 0) {
      score += 100 + overlap * 100;
    } else {
      score += Math.max(0, 40 - centerDistance(rect, entry.rect) / 32);
    }
  } else if (!rect) {
    score += 10;
  }
  if (entry.ucufNodeSlots && entry.ucufNodeSlots.length > 0) score += 5;
  if (entry.selector) score += 5;
  return score;
}

function rectOverlapRatio(left, right) {
  if (!left || !right) return 0;
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.w, right.x + right.w);
  const y2 = Math.min(left.y + left.h, right.y + right.h);
  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);
  const overlapArea = width * height;
  if (overlapArea <= 0) return 0;
  const baseArea = Math.max(1, Math.min(left.w * left.h, right.w * right.h));
  return overlapArea / baseArea;
}

function centerDistance(left, right) {
  const leftCenterX = left.x + left.w / 2;
  const leftCenterY = left.y + left.h / 2;
  const rightCenterX = right.x + right.w / 2;
  const rightCenterY = right.y + right.h / 2;
  const deltaX = leftCenterX - rightCenterX;
  const deltaY = leftCenterY - rightCenterY;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string' || !value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function uniqueSlotRefs(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    const key = [value.ucufId || '', value.nodeName || '', value.slotId || '', value.kind || ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function inferPixelDiffContext(cssCapabilities) {
  const offenders = cssCapabilities && Array.isArray(cssCapabilities.topOffenders) ? cssCapabilities.topOffenders : [];
  if (!offenders.length) return null;
  const counts = {};
  const sourceProperties = [];
  for (const offender of offenders.slice(0, 10)) {
    const taxonomy = classifyCssOffender(offender);
    counts[taxonomy] = (counts[taxonomy] || 0) + (offender.count || 0);
    if (offender.property && !sourceProperties.includes(offender.property)) sourceProperties.push(offender.property);
  }
  const taxonomy = TAXONOMY_PRIORITY.find((key) => counts[key] > 0) || null;
  if (!taxonomy) return null;
  return {
    taxonomy,
    ownerBucket: ownerBucketForTaxonomy(taxonomy),
    sourceProperties,
    recommendation: recommendationForTaxonomy(taxonomy),
  };
}

function buildNextFixes(zones) {
  const grouped = new Map();
  for (const zone of zones) {
    const key = `${zone.ownerBucket || ownerBucketForTaxonomy(zone.taxonomy)}|${zone.taxonomy}`;
    const entry = grouped.get(key) || {
      ownerBucket: zone.ownerBucket || ownerBucketForTaxonomy(zone.taxonomy),
      taxonomy: zone.taxonomy,
      count: 0,
      recommendation: recommendationForTaxonomy(zone.taxonomy),
      sourceProperties: [],
    };
    entry.count += 1;
    const props = zone.traceability && Array.isArray(zone.traceability.sourceProperties)
      ? zone.traceability.sourceProperties
      : [];
    for (const prop of props) {
      if (!entry.sourceProperties.includes(prop)) entry.sourceProperties.push(prop);
    }
    grouped.set(key, entry);
  }
  return [...grouped.values()]
    .sort((left, right) => right.count - left.count || left.taxonomy.localeCompare(right.taxonomy))
    .slice(0, 5)
    .map((entry) => ({
      ownerBucket: entry.ownerBucket,
      taxonomy: entry.taxonomy,
      count: entry.count,
      recommendation: entry.recommendation,
      suggestedSlice: suggestedSliceFor(entry.taxonomy, entry.sourceProperties),
      sourceProperties: entry.sourceProperties,
    }));
}

function buildCompactResidualSummary(zones, summary) {
  return {
    totalZones: summary.totalZones,
    byTaxonomy: summary.byTaxonomy,
    byOwnerBucket: summary.byOwnerBucket,
    topZones: zones.slice(0, 8).map((zone) => ({
      id: zone.id,
      taxonomy: zone.taxonomy,
      ownerBucket: zone.ownerBucket || ownerBucketForTaxonomy(zone.taxonomy),
      rect: zone.rect || null,
      recommendation: zone.recommendation,
      sourceProperties: zone.traceability && Array.isArray(zone.traceability.sourceProperties)
        ? zone.traceability.sourceProperties
        : [],
      selectorTracePending: !!(zone.traceability && zone.traceability.selectorTracePending),
    })),
  };
}

function suggestedSliceFor(taxonomy, sourceProperties) {
  if (taxonomy === 'runtime-renderer') {
    return sourceProperties.length
      ? `runtime-renderer-parity:${sourceProperties.join(',')}`
      : 'runtime-renderer-parity';
  }
  if (taxonomy === 'manual-art-asset') return 'formal-runtime-assetization';
  if (taxonomy === 'converter-geometry') return 'converter-geometry-mapper';
  if (taxonomy === 'source-html-fix') return 'source-html-contract';
  if (taxonomy === 'runtime-bug') return 'runtime-behavior-fix';
  return 'review-approved-runtime-art-delta';
}

function summarize(zones) {
  const byTaxonomy = {};
  const byOwnerBucket = {};
  for (const taxonomy of TAXONOMY) byTaxonomy[taxonomy] = 0;
  for (const ownerBucket of OWNER_BUCKETS) byOwnerBucket[ownerBucket] = 0;
  for (const zone of zones) {
    byTaxonomy[zone.taxonomy] = (byTaxonomy[zone.taxonomy] || 0) + 1;
    const ownerBucket = zone.ownerBucket || ownerBucketForTaxonomy(zone.taxonomy);
    byOwnerBucket[ownerBucket] = (byOwnerBucket[ownerBucket] || 0) + 1;
  }
  return {
    totalZones: zones.length,
    byTaxonomy,
    byOwnerBucket,
    waiverEligibleCount: zones.filter(zone => zone.waiverEligible).length,
    missingRectCount: zones.filter(zone => zone.rectStatus && /missing/.test(zone.rectStatus)).length,
  };
}

module.exports = { TAXONOMY, OWNER_BUCKETS, buildZoneOwnershipReport, classifyCssOffender, findTraceMatches };