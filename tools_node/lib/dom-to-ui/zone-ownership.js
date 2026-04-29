// doc_id: doc_other_0009 - Visual diff zone ownership taxonomy.
'use strict';

const TAXONOMY = ['art-authority', 'manual-art-asset', 'converter-geometry', 'source-html-fix', 'runtime-bug'];

function buildZoneOwnershipReport(args) {
  args = args || {};
  const zones = [];
  const screenId = args.screenId || null;
  appendArtAuthorityZones(zones, args.artAuthorityValidation);
  appendSyncAssetZones(zones, args.syncReport);
  appendCssZones(zones, args.cssCapabilities);
  appendPixelDiffZones(zones, args.pixelDiff);
  return {
    schemaVersion: '1.0.0',
    screenId,
    taxonomy: TAXONOMY,
    summary: summarize(zones),
    zones,
  };
}

function appendArtAuthorityZones(zones, validation) {
  if (!validation || !Array.isArray(validation.waivers)) return;
  for (const waiver of validation.waivers) {
    zones.push({
      id: `art-authority:${waiver.id}`,
      taxonomy: 'art-authority',
      zoneId: waiver.zoneId,
      rect: waiver.rect || null,
      rectStatus: waiver.rect ? 'ready' : 'missing-final-capture-rect',
      evidence: [{ type: 'art-authority-waiver', id: waiver.id }],
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
    zones.push({
      id: `sync-asset:${change.path}`,
      taxonomy: isButtonSkin ? 'art-authority' : 'manual-art-asset',
      zoneId: change.path,
      rect: null,
      rectStatus: 'missing-final-capture-rect',
      evidence: [{ type: 'sync-report', path: change.path, detail: change.detail || null }],
      waiverEligible: isButtonSkin,
      recommendation: isButtonSkin ? 'capture-small-rect-before-waiver' : 'keep-formal-runtime-asset-auditable',
    });
  }
}

function appendCssZones(zones, cssCapabilities) {
  const offenders = cssCapabilities && Array.isArray(cssCapabilities.topOffenders) ? cssCapabilities.topOffenders : [];
  for (const offender of offenders) {
    const taxonomy = classifyCssOffender(offender);
    zones.push({
      id: `css:${offender.property}:${offender.capability}`,
      taxonomy,
      zoneId: offender.property,
      rect: null,
      rectStatus: 'not-available-from-css-summary',
      evidence: [{ type: 'css-capability', property: offender.property, capability: offender.capability, count: offender.count || 0 }],
      waiverEligible: false,
      recommendation: recommendationForTaxonomy(taxonomy),
    });
  }
}

function appendPixelDiffZones(zones, pixelDiff) {
  const buckets = pixelDiff && Array.isArray(pixelDiff.unwaivedDiffTopList) ? pixelDiff.unwaivedDiffTopList : [];
  for (const bucket of buckets.slice(0, 20)) {
    zones.push({
      id: `pixel-diff:${bucket.rank}`,
      taxonomy: 'converter-geometry',
      zoneId: `pixel-diff-bucket-${bucket.rank}`,
      rect: bucket.rect || null,
      rectStatus: bucket.rect ? 'ready' : 'missing',
      evidence: [{ type: 'pixel-diff', mismatchPixels: bucket.mismatchPixels || 0, mismatchRatio: bucket.mismatchRatio || 0 }],
      waiverEligible: false,
      recommendation: 'inspect-against-css-and-layout-before-art-waiver',
    });
  }
}

function classifyCssOffender(offender) {
  const prop = String((offender && offender.property) || '').toLowerCase();
  if (/^(background|background-image|border-image|filter|backdrop-filter|mix-blend-mode)$/.test(prop)) return 'manual-art-asset';
  if (/^(clip-path|mask|mask-image|transform|perspective|shape-outside)$/.test(prop)) return 'converter-geometry';
  if (/^(content|font-family|font-size|line-height|letter-spacing|text-transform)$/.test(prop)) return 'source-html-fix';
  if (/^(cursor|pointer-events|transition|animation)$/.test(prop)) return 'runtime-bug';
  return 'converter-geometry';
}

function recommendationForTaxonomy(taxonomy) {
  switch (taxonomy) {
    case 'art-authority': return 'keep-runtime-art-and-require-rect-scoped-waiver';
    case 'manual-art-asset': return 'replace-css-gap-with-formal-runtime-asset-or-family-layer';
    case 'converter-geometry': return 'fix-parser-mapper-or-cocos-geometry-rule';
    case 'source-html-fix': return 'fix-source-html-token-text-or-binding-contract';
    case 'runtime-bug': return 'fix-runtime-behavior-not-visual-waiver';
    default: return 'review';
  }
}

function summarize(zones) {
  const byTaxonomy = {};
  for (const taxonomy of TAXONOMY) byTaxonomy[taxonomy] = 0;
  for (const zone of zones) byTaxonomy[zone.taxonomy] = (byTaxonomy[zone.taxonomy] || 0) + 1;
  return {
    totalZones: zones.length,
    byTaxonomy,
    waiverEligibleCount: zones.filter(zone => zone.waiverEligible).length,
    missingRectCount: zones.filter(zone => zone.rectStatus && /missing/.test(zone.rectStatus)).length,
  };
}

module.exports = { TAXONOMY, buildZoneOwnershipReport, classifyCssOffender };