'use strict';

// workflow-summary.js — Plan5 registry contract 驗證、token 治理、radar 幾何、zone ownership、
// 四維度 fidelity gate 等工作流摘要層驗證。

const path = require('path');
const {
  addViolation,
  getFidelityThresholds,
  getExemptCategories,
  getKnownGaps,
  readJsonIfExists,
  walkJson,
  relative,
  readNumber,
  firstNonEmpty,
  dimensionPassed,
  isZoneExcludedFromScore,
  compareVersions
} = require('./base');

// ─── Plan5 registry contracts ─────────────────────────────────────────────────

function validatePlan5RegistryContracts(violations) {
  validateFidelityThresholdRegistry(violations);
  validateKnownGapRegistry(violations);
}

function validateFidelityThresholdRegistry(violations) {
  const thresholds = getFidelityThresholds();
  const requiredDimensions = ['structural', 'colorFill', 'layoutGeometry', 'interactionSmoke'];

  if (!thresholds) {
    addViolation(violations, 'H2U-P5-F001', {
      summary: 'rule-registry is missing fidelityThresholds',
      evidence: 'RULE_REGISTRY.fidelityThresholds=missing'
    });
    return;
  }

  const dimensions = thresholds.dimensions && typeof thresholds.dimensions === 'object'
    ? thresholds.dimensions
    : {};
  const missingDimensions = requiredDimensions.filter((name) => !dimensions[name] || typeof dimensions[name] !== 'object');
  const malformedDimensions = requiredDimensions.filter((name) => {
    const dimension = dimensions[name];
    if (!dimension || typeof dimension !== 'object') return false;
    return typeof dimension.metric !== 'string'
      || typeof dimension.formula !== 'string'
      || typeof dimension.gate !== 'string';
  });
  const topLevelIssues = [];
  if (typeof thresholds._schema !== 'string' || !thresholds._schema.trim()) topLevelIssues.push('_schema');
  if (typeof thresholds.scorableAreaFormula !== 'string' || !thresholds.scorableAreaFormula.trim()) topLevelIssues.push('scorableAreaFormula');
  if (!thresholds.compositeScore || typeof thresholds.compositeScore.formula !== 'string' || typeof thresholds.compositeScore.reportedAs !== 'string') {
    topLevelIssues.push('compositeScore.formula/reportedAs');
  }

  if (missingDimensions.length > 0 || malformedDimensions.length > 0 || topLevelIssues.length > 0) {
    const parts = [];
    if (missingDimensions.length > 0) parts.push(`missing dimensions: ${missingDimensions.join(', ')}`);
    if (malformedDimensions.length > 0) parts.push(`malformed dimensions: ${malformedDimensions.join(', ')}`);
    if (topLevelIssues.length > 0) parts.push(`missing fields: ${topLevelIssues.join(', ')}`);
    addViolation(violations, 'H2U-P5-F001', {
      summary: 'fidelityThresholds registry contract is incomplete',
      evidence: parts.join('; ')
    });
  }
}

function validateKnownGapRegistry(violations) {
  const exemptCategories = getExemptCategories();
  const knownGaps = getKnownGaps();
  const exemptIds = new Set();
  const gapIds = new Set();
  const issues = [];

  if (exemptCategories.length === 0) issues.push('exemptCategories is empty');
  if (knownGaps.length === 0) issues.push('knownGaps is empty');

  exemptCategories.forEach((entry, index) => {
    const id = typeof entry && entry && typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id) {
      issues.push(`exemptCategories[${index}] missing id`);
      return;
    }
    if (exemptIds.has(id)) issues.push(`duplicate exemptCategories id ${id}`);
    exemptIds.add(id);
    if (!entry.name || !entry.treatment) {
      issues.push(`${id} missing name or treatment`);
    }
  });

  knownGaps.forEach((entry, index) => {
    const id = typeof entry && entry && typeof entry.id === 'string' ? entry.id.trim() : '';
    const slug = typeof entry && entry && typeof entry.slug === 'string' ? entry.slug.trim() : '';
    const status = typeof entry && entry && typeof entry.status === 'string' ? entry.status.trim() : '';
    const resolution = typeof entry && entry && typeof entry.resolution === 'string' ? entry.resolution.trim() : '';
    const exemptCategoryRef = typeof entry && entry && typeof entry.exemptCategoryRef === 'string'
      ? entry.exemptCategoryRef.trim()
      : '';

    if (!id) {
      issues.push(`knownGaps[${index}] missing id`);
      return;
    }
    if (gapIds.has(id)) issues.push(`duplicate knownGaps id ${id}`);
    gapIds.add(id);
    if (!slug || !status) issues.push(`${id} missing slug or status`);
    if (!resolution) issues.push(`${id} missing resolution`);
    if (!exemptCategoryRef && status !== 'acceptable-regression') {
      issues.push(`${id} must set exemptCategoryRef or use status=acceptable-regression`);
    }
    if (exemptCategoryRef && !exemptIds.has(exemptCategoryRef)) {
      issues.push(`${id} references unknown exemptCategoryRef ${exemptCategoryRef}`);
    }
  });

  if (issues.length > 0) {
    addViolation(violations, 'H2U-P5-F002', {
      summary: 'knownGaps/exemptCategories registry contract is incomplete',
      evidence: issues.slice(0, 6).join('; ')
    });
  }
}

// ─── Plan5 summary validators ─────────────────────────────────────────────────

function validatePlan5Summary(repoRoot, summary, violations) {
  validateFourDimensionFidelityGate(summary, violations);
  validateZoneOwnershipRegistryRefs(repoRoot, summary, violations);

  const browserCoverage = readNumber(summary && summary.metrics && summary.metrics.compare && summary.metrics.compare.adjustedCoverage);
  const runtimeVsSource = summary && summary.metrics && summary.metrics.htmlCocos && summary.metrics.htmlCocos.runtimeVsSource
    ? summary.metrics.htmlCocos.runtimeVsSource
    : null;
  const adjustedScore = readNumber(runtimeVsSource && runtimeVsSource.adjustedScore);
  if (!Number.isFinite(adjustedScore)) return;

  if (adjustedScore < 0.95) {
    const workflowPass = !!(summary && summary.verdict && summary.verdict.workflowPass);
    const nextFixes = Array.isArray(summary && summary.nextFixes) ? summary.nextFixes : [];
    if (workflowPass || nextFixes.length === 0) {
      addViolation(violations, 'H2U-P5-003', {
        summary: 'final gate below 0.95 did not fail cleanly with actionable nextFixes',
        evidence: JSON.stringify({
          adjustedScore,
          workflowPass,
          nextFixes: nextFixes.length
        })
      });
    }

    if (browserCoverage >= 0.95) {
      const taxonomy = summary && summary.blockerTaxonomy || runtimeVsSource && runtimeVsSource.blockerTaxonomy || null;
      const hasTaxonomy = !!(
        (taxonomy && Array.isArray(taxonomy.categories) && taxonomy.categories.length > 0)
        || (Array.isArray(taxonomy) && taxonomy.length > 0)
        || (taxonomy && typeof taxonomy.primaryCause === 'string' && taxonomy.primaryCause.trim())
        || (taxonomy && typeof taxonomy.category === 'string' && taxonomy.category.trim())
      );
      if (!hasTaxonomy) {
        addViolation(violations, 'H2U-P5-004', {
          summary: 'high browser coverage plus low Cocos score is missing blocker taxonomy',
          evidence: JSON.stringify({
            browserCoverage,
            adjustedScore
          })
        });
      }
    }
  }
}

function validateFourDimensionFidelityGate(summary, violations) {
  if (!summary || summary.debugOnly === true) return;

  const thresholds = getFidelityThresholds();
  const requiredDimensions = Object.keys(thresholds && thresholds.dimensions || {});
  if (requiredDimensions.length === 0) return;

  const runtimeVsSource = summary && summary.metrics && summary.metrics.htmlCocos && summary.metrics.htmlCocos.runtimeVsSource
    ? summary.metrics.htmlCocos.runtimeVsSource
    : null;
  const adjustedScore = readNumber(runtimeVsSource && runtimeVsSource.adjustedScore);
  const verdict = summary && summary.verdict || {};
  const fidelityDimensions = summary && summary.fidelityDimensions
    || summary && summary.finalGate && summary.finalGate.fidelityDimensions
    || summary && summary.metrics && summary.metrics.fidelityDimensions
    || null;
  const shouldValidate = !!fidelityDimensions || Number.isFinite(adjustedScore) || verdict.workflowPass === true;

  if (!shouldValidate) return;

  if (!fidelityDimensions || typeof fidelityDimensions !== 'object') {
    addViolation(violations, 'H2U-P5-F001', {
      summary: 'formal summary is missing fidelityDimensions for the four-dimension gate',
      evidence: JSON.stringify({
        adjustedScore: Number.isFinite(adjustedScore) ? adjustedScore : null,
        workflowPass: !!verdict.workflowPass
      })
    });
    return;
  }

  const missingDimensions = requiredDimensions.filter((name) => fidelityDimensions[name] === undefined || fidelityDimensions[name] === null);
  if (missingDimensions.length > 0) {
    addViolation(violations, 'H2U-P5-F001', {
      summary: 'formal summary is missing one or more fidelity dimension verdicts',
      evidence: `missing=${missingDimensions.join(', ')}`
    });
    return;
  }

  const failedDimensions = requiredDimensions.filter((name) => !dimensionPassed(fidelityDimensions[name]));
  if (verdict.workflowPass === true && failedDimensions.length > 0) {
    addViolation(violations, 'H2U-P5-F001', {
      summary: 'workflowPass=true but not all fidelity dimensions passed',
      evidence: `failed=${failedDimensions.join(', ')}`
    });
  }
}

function validateZoneOwnershipRegistryRefs(repoRoot, summary, violations) {
  if (!summary || summary.debugOnly === true) return;

  const zoneOwnership = resolveZoneOwnershipReport(repoRoot, summary);
  if (!zoneOwnership || !Array.isArray(zoneOwnership.zones) || zoneOwnership.zones.length === 0) return;

  const exemptIds = new Set(getExemptCategories().map((entry) => String(entry && entry.id || '').trim()).filter(Boolean));
  const knownGapMap = new Map(getKnownGaps().map((entry) => [String(entry && entry.id || '').trim(), entry]));
  const issues = [];

  zoneOwnership.zones.forEach((zone, index) => {
    const zoneId = firstNonEmpty(zone && zone.zoneId, zone && zone.id, `zone[${index}]`);
    const knownGapRef = firstNonEmpty(zone && zone.knownGapRef, zone && zone.knownGapId, zone && zone.gapRef);
    const directExemptRef = firstNonEmpty(zone && zone.exemptCategoryRef, zone && zone.exemptRef);
    const knownGap = knownGapRef ? knownGapMap.get(knownGapRef) || null : null;
    const effectiveExemptRef = directExemptRef || firstNonEmpty(knownGap && knownGap.exemptCategoryRef);
    const excludedFromScore = isZoneExcludedFromScore(zone);
    const assetizedPass = !!(zone && zone.assetizationRequired === true && zone.runtimeAssetPath);

    if (knownGapRef && !knownGap) {
      issues.push(`${zoneId} references unknown knownGapRef ${knownGapRef}`);
    }
    if (directExemptRef && !exemptIds.has(directExemptRef)) {
      issues.push(`${zoneId} references unknown exemptCategoryRef ${directExemptRef}`);
    }
    if (effectiveExemptRef && !exemptIds.has(effectiveExemptRef)) {
      issues.push(`${zoneId} resolves to unknown exemptCategoryRef ${effectiveExemptRef}`);
    }
    if (excludedFromScore && !assetizedPass && !knownGapRef && !effectiveExemptRef) {
      issues.push(`${zoneId} is excluded from score without knownGapRef or exemptCategoryRef`);
    }
  });

  if (issues.length > 0) {
    addViolation(violations, 'H2U-P5-F002', {
      summary: 'zone-ownership contains silent or unresolved scoring exemptions',
      evidence: issues.slice(0, 6).join('; ')
    });
  }
}

function resolveZoneOwnershipReport(repoRoot, summary) {
  if (summary && summary.zoneOwnership && Array.isArray(summary.zoneOwnership.zones)) return summary.zoneOwnership;

  const candidates = [
    summary && summary.zoneOwnership && summary.zoneOwnership.report,
    summary && summary.zoneOwnership && summary.zoneOwnership.path,
    summary && summary.paths && summary.paths.zoneOwnership,
    summary && summary.zoneOwnershipJson,
    summary && summary.finalCapture && summary.finalCapture.zoneOwnership
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const filePath = path.isAbsolute(candidate) ? candidate : path.join(repoRoot, candidate);
    const json = readJsonIfExists(filePath);
    if (json && Array.isArray(json.zones)) return json;
  }
  return null;
}

// ─── Token governance ─────────────────────────────────────────────────────────

function validateTokenGovernance(repoRoot, summary, violations) {
  const tg = summary.tokenGovernance || null;

  if (summary.debugOnly !== true) {
    if (!tg || tg.mode !== 'replace-all-per-run') {
      addViolation(violations, 'H2U-P4-025', {
        summary: `tokenGovernance.mode is not replace-all-per-run (got: ${tg ? tg.mode : 'missing'})`,
        evidence: tg ? `tokenGovernance.mode=${tg.mode}` : 'workflowSummary.tokenGovernance=missing'
      });
    }

    if (!tg || !tg.diffReportPath) {
      addViolation(violations, 'H2U-P4-026', {
        summary: 'tokenGovernance.diffReportPath is missing',
        evidence: tg ? 'tokenGovernance.diffReportPath=missing' : 'workflowSummary.tokenGovernance=missing'
      });
    } else {
      const diffPath = path.isAbsolute(tg.diffReportPath)
        ? tg.diffReportPath
        : path.join(repoRoot, tg.diffReportPath);
      const diff = readJsonIfExists(diffPath);
      const diffData = diff && (diff.diff || diff);
      if (!diff || (!Number.isFinite(diffData.addedCount) && diffData.added === undefined)) {
        addViolation(violations, 'H2U-P4-026', {
          summary: 'token diff report is missing or malformed',
          evidence: path.relative(repoRoot, diffPath).replace(/\\/g, '/')
        });
      }
    }
  }

  if (!tg || !tg.localTokenPath) return;
  const localTokensAbsPath = path.isAbsolute(tg.localTokenPath)
    ? tg.localTokenPath
    : path.join(repoRoot, tg.localTokenPath);
  const localTokens = readJsonIfExists(localTokensAbsPath);
  if (!localTokens) return;

  const tokenList = Array.isArray(localTokens.tokens) ? localTokens.tokens : [];
  const promotionEligible = tokenList.filter((token) => token && Number(token.crossScreenCount || 0) >= 2 && Number(token.consecutiveVersions || 0) >= 2);
  if (promotionEligible.length > 0) {
    addViolation(violations, 'H2U-P4-027', {
      summary: `${promotionEligible.length} screen-local token(s) qualify for promotion but have not been promoted`,
      evidence: promotionEligible.slice(0, 5).map((token) => token.name || token.token || '?').join(', ')
    });
  }

  const waivers = Array.isArray(localTokens.waivers) ? localTokens.waivers : [];
  const currentVersion = String(summary.uiVersion || localTokens.policy && localTokens.policy.generatedAtVersion || '');
  const expiredWaivers = waivers.filter((waiver) => {
    if (!waiver || !waiver.expiresAtVersion) return false;
    return compareVersions(String(waiver.expiresAtVersion), currentVersion) < 0;
  });
  if (expiredWaivers.length > 0) {
    addViolation(violations, 'H2U-P4-028', {
      summary: `${expiredWaivers.length} literal-color waiver(s) have expired (currentVersion=${currentVersion || 'unknown'})`,
      evidence: expiredWaivers.slice(0, 5).map((waiver) => `${waiver.token || '?'} expired=${waiver.expiresAtVersion}`).join(', ')
    });
  }
}

// ─── Radar geometry ───────────────────────────────────────────────────────────

function validateRadarGeometryFromSummary(repoRoot, summary, violations) {
  const paths = summary.paths || {};
  const candidates = [
    paths.finalLayout,
    summary.runtimeAuthority && summary.runtimeAuthority.layout
  ].filter(Boolean);
  for (const relOrAbs of candidates) {
    const filePath = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(repoRoot, relOrAbs);
    validateRadarGeometryInFile(repoRoot, filePath, violations);
  }
}

function validateRadarGeometryInFile(repoRoot, filePath, violations) {
  const json = readJsonIfExists(filePath);
  if (!json) return;
  walkJson(json.root || json, (node, nodePath) => {
    if (!node || node.rendererHint !== 'svg-radar-chart') return;
    const meta = node.svgMeta || node.sourceSvg || null;
    const missing = missingRadarGeometryFields(meta);
    if (missing.length > 0) {
      addViolation(violations, 'H2U-P4-011', {
        summary: `svg-radar-chart missing geometry fields: ${missing.join(', ')}`,
        evidence: `${relative(repoRoot, filePath)} ${nodePath}`
      });
    }
  });
}

function missingRadarGeometryFields(meta) {
  if (!meta || typeof meta !== 'object') return ['svgMeta'];
  const missing = [];
  if (!meta.viewBox || !Number.isFinite(meta.viewBox.width) || !Number.isFinite(meta.viewBox.height)) missing.push('viewBox');
  if (!meta.center || !Number.isFinite(meta.center.x) || !Number.isFinite(meta.center.y)) missing.push('center');
  if (!Array.isArray(meta.axisLines) || meta.axisLines.length === 0) missing.push('axisLines');
  if (!Array.isArray(meta.gridPolygons) || meta.gridPolygons.length === 0) missing.push('gridPolygons');
  if (!meta.valuePolygon && (!Array.isArray(meta.dataPolygons) || meta.dataPolygons.length === 0)) missing.push('valuePolygon');
  if (!Array.isArray(meta.labels) || meta.labels.length === 0) missing.push('labels');
  if (!meta.textBox && !((meta.labels || []).every((label) => label && label.box && label.box.width && label.box.height))) missing.push('textBox');
  return missing;
}

module.exports = {
  validatePlan5RegistryContracts,
  validatePlan5Summary,
  validateTokenGovernance,
  validateRadarGeometryFromSummary,
  validateRadarGeometryInFile,
  missingRadarGeometryFields
};
