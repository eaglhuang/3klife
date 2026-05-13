'use strict';

function buildFidelityDimensions(metrics, verdict, interactionRuntime) {
  const runtimeVsSource = metrics && metrics.htmlCocos && metrics.htmlCocos.runtimeVsSource
    ? metrics.htmlCocos.runtimeVsSource
    : null;
  const existing = runtimeVsSource && runtimeVsSource.fidelityDimensions
    ? runtimeVsSource.fidelityDimensions
    : (metrics && metrics.fidelityDimensions ? metrics.fidelityDimensions : null);
  if (existing && typeof existing === 'object') return existing;

  const structuralPass = !!(verdict && verdict.converterPass);
  const colorFillPass = !!(verdict && verdict.previewDiagnosticPass);
  const layoutGeometryPass = !!(verdict && verdict.runtimeFinalPass);
  const interactionSmokePass = interactionRuntime
    ? (interactionRuntime.required ? interactionRuntime.status === 'pass' : true)
    : !!(verdict && verdict.interactionRuntimePass);

  const mk = (pass, source) => ({
    pass: !!pass,
    status: pass ? 'pass' : 'fail',
    source,
  });

  return {
    structural: mk(structuralPass, 'workflow-verdict.converterPass'),
    colorFill: mk(colorFillPass, 'workflow-verdict.previewDiagnosticPass'),
    layoutGeometry: mk(layoutGeometryPass, 'workflow-verdict.runtimeFinalPass'),
    interactionSmoke: mk(interactionSmokePass, 'workflow-verdict.interactionRuntimePass'),
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

function buildRuntimeAuthority(opts, runtimeSync, helpers) {
  const runtime = helpers.resolveCanonicalRuntimePaths(opts.screenId);
  const copied = runtimeSync && runtimeSync.copied || {};
  const synced = !!(runtimeSync && !runtimeSync.skipped && copied.layout && copied.skin && copied.screen);
  return {
    authority: synced ? 'synced-final-runtime-json' : 'debug-local-final-json',
    screen: helpers.rel(runtime.screenPath),
    layout: helpers.rel(runtime.layoutPath),
    skin: helpers.rel(runtime.skinPath),
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

function classifyBlockerCategory(violation) {
  const text = [
    violation && violation.ruleId || '',
    violation && violation.summary || '',
    violation && violation.fixAction || '',
    violation && violation.evidence || '',
  ].join(' ').toLowerCase();
  if (text.includes('radial')) return 'radial-gradient';
  if (text.includes('shadow')) return 'shadow';
  if (text.includes('background')) return 'background-layers';
  if (text.includes('rounded')) return 'rounded-rect';
  if (text.includes('interaction')) return 'interaction-routing';
  if (text.includes('visual-review')) return 'visual-review';
  if (violation && violation.ruleId === 'H2U-P5-003') return 'renderer-parity-gap';
  return null;
}

function deriveBlockerTaxonomy(metrics, visualFidelityRisk) {
  const runtimeVsSource = metrics && metrics.htmlCocos && metrics.htmlCocos.runtimeVsSource
    ? metrics.htmlCocos.runtimeVsSource
    : null;
  if (runtimeVsSource && runtimeVsSource.blockerTaxonomy) return runtimeVsSource.blockerTaxonomy;

  const blockers = Array.isArray(visualFidelityRisk && visualFidelityRisk.violations)
    ? visualFidelityRisk.violations.filter(item => item && item.severity === 'blocker')
    : [];
  if (blockers.length === 0) return null;

  const categories = [];
  for (const item of blockers) {
    const category = classifyBlockerCategory(item);
    if (category && !categories.includes(category)) categories.push(category);
  }
  if (categories.length === 0) return null;

  return {
    primaryCause: categories[0],
    categories,
    source: 'derived-from-visual-fidelity-risk',
  };
}

function mergeNextFixes(primaryFixes, secondaryFixes, limit = 3) {
  const merged = [];
  const seen = new Set();
  const all = []
    .concat(Array.isArray(primaryFixes) ? primaryFixes : [])
    .concat(Array.isArray(secondaryFixes) ? secondaryFixes : []);
  for (const item of all) {
    if (!item) continue;
    const key = `${item.ruleId || ''}::${item.fixAction || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

function buildPreRuleGuardFixes(verdict, visualFidelityRisk, interactionRuntime, limit = 3) {
  const candidates = [];
  const blockers = Array.isArray(visualFidelityRisk && visualFidelityRisk.violations)
    ? visualFidelityRisk.violations.filter(item => item && item.severity === 'blocker')
    : [];
  for (const blocker of blockers) {
    candidates.push({
      ruleId: blocker.ruleId || 'H2U-P4-019',
      summary: blocker.summary || 'visual fidelity blocker detected',
      fixAction: blocker.fixAction || 'Resolve visual fidelity blocker and rerun workflow.',
      evidence: blocker.evidence || null,
    });
  }
  if (interactionRuntime && interactionRuntime.required && interactionRuntime.status !== 'pass') {
    candidates.push({
      ruleId: 'H2U-P4-018',
      summary: `interaction runtime status=${interactionRuntime.status}`,
      fixAction: 'Restore interaction sidecar routing and rerun runtime interaction smoke.',
      evidence: JSON.stringify({
        required: true,
        actionsDeclared: interactionRuntime.actionsDeclared || 0,
        actionsBound: interactionRuntime.actionsBound || 0,
      }),
    });
  }
  if (candidates.length === 0 && verdict && Array.isArray(verdict.remainingIssues) && verdict.remainingIssues.length > 0) {
    candidates.push({
      ruleId: 'H2U-P0-001',
      summary: verdict.remainingIssues[0],
      fixAction: 'Resolve remaining issue and rerun workflow.',
      evidence: JSON.stringify({ remainingIssues: verdict.remainingIssues.slice(0, 3) }),
    });
  }
  return mergeNextFixes(candidates, [], limit);
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

function assessVisualFidelityRisk(paths, metrics, opts, helpers) {
  const violations = [];
  const skinPath = helpers.firstExistingPath([
    paths && paths.finalSkin,
    paths && paths.rawSkin,
  ]);
  const skin = helpers.readJsonIfExists(skinPath);
  if (skin && skin.slots) {
    for (const [slotId, slot] of Object.entries(skin.slots)) {
      collectVisualRiskFromSlot(slot, `skin.slots.${slotId}`, violations);
    }
  }

  const visualReview = helpers.readJsonIfExists(paths && paths.rawLayout ? paths.rawLayout.replace(/\.json$/i, '.visual-review.json') : null);
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
      : 'unknown ??run with capture protocol to classify';
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
    source: skinPath ? helpers.rel(skinPath) : null,
    htmlCocosVerdict: runtimeVsSource ? runtimeVsSource.verdict : null,
    htmlCocosAdjustedScore: adjustedScore,
  };
}

function buildSummary(args, helpers) {
  const debugInfo = computeDebugOnly(args.opts, args.sourcePackage);
  const visualFidelityRisk = args.visualFidelityRisk || assessVisualFidelityRisk(args.paths, args.metrics, args.opts, helpers);
  const interactionRuntime = args.interactionRuntime || helpers.assessInteractionRuntime(args.paths, args.steps, args.sourceHtml);
  const blockerTaxonomy = args.blockerTaxonomy || deriveBlockerTaxonomy(args.metrics, visualFidelityRisk);
  const fidelityDimensions = buildFidelityDimensions(args.metrics, args.verdict, interactionRuntime);
  return {
    input: helpers.rel(args.opts.input),
    sourcePackage: args.sourcePackage && args.sourcePackage.manifest ? args.sourcePackage.manifest : null,
    screenId: args.opts.screenId,
    bundle: args.opts.bundle,
    debugOnly: debugInfo.debugOnly,
    debugOnlyReasons: debugInfo.reasons,
    runtimeAuthority: args.runtimeAuthority || buildRuntimeAuthority(args.opts, null, helpers),
    ruleGuard: args.ruleGuard || { status: 'not-run', blockerCount: 0, warningCount: 0, violations: [] },
    visualFidelityRisk,
    interactionRuntime,
    fidelityDimensions,
    blockerTaxonomy,
    tokenGovernance: args.tokenGovernance || null,
    nextFixes: args.nextFixes || [],
    detected: args.detected,
    paths: Object.fromEntries(Object.entries(args.paths).map(([k, v]) => [k, helpers.rel(v)])),
    finalCapture: {
      editorScreenshot: args.opts.editorScreenshot ? helpers.rel(args.opts.editorScreenshot) : null,
      captureProtocol: args.opts.captureProtocol ? helpers.rel(args.opts.captureProtocol) : null,
      captureReport: args.opts.captureReport ? helpers.rel(args.opts.captureReport) : null,
      authority: args.metrics && args.metrics.htmlCocos ? args.metrics.htmlCocos.captureAuthority || null : null,
    },
    steps: args.steps,
    metrics: args.metrics,
    verdict: args.verdict,
    specHashes: {
      rawLayout: helpers.hashFileIfExists(args.paths && args.paths.rawLayout),
      rawSkin: helpers.hashFileIfExists(args.paths && args.paths.rawSkin),
      finalLayout: helpers.hashFileIfExists(args.paths && args.paths.finalLayout),
      finalSkin: helpers.hashFileIfExists(args.paths && args.paths.finalSkin),
      runtimeLayout: (function () {
        const rp = helpers.resolveCanonicalRuntimePaths(args.opts && args.opts.screenId);
        return rp ? helpers.hashFileIfExists(rp.layoutPath) : null;
      }()),
      runtimeSkin: (function () {
        const rp = helpers.resolveCanonicalRuntimePaths(args.opts && args.opts.screenId);
        return rp ? helpers.hashFileIfExists(rp.skinPath) : null;
      }()),
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  assessVisualFidelityRisk,
  buildFidelityDimensions,
  buildPreRuleGuardFixes,
  buildRuntimeAuthority,
  buildSummary,
  classifyBlockerCategory,
  collectVisualRiskFromSlot,
  computeDebugOnly,
  deriveBlockerTaxonomy,
  mergeNextFixes,
  topRuleGuardFixes,
};
