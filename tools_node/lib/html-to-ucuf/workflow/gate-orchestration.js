'use strict';

function buildRuntimeSyncStep(runtimeSync) {
  const copied = runtimeSync && runtimeSync.copied;
  const copiedCore = !!(copied && copied.layout && copied.skin && copied.screen);
  return {
    step: 'sync-final-to-runtime-specs',
    exitCode: runtimeSync && runtimeSync.skipped ? 0 : (copiedCore ? 0 : 1),
    ok: !!(runtimeSync && (runtimeSync.skipped || copiedCore)),
    skipped: !!(runtimeSync && runtimeSync.skipped),
    reason: runtimeSync && runtimeSync.reason || null,
    tabCount: runtimeSync && runtimeSync.tabCount || 0,
    preservedScreenContracts: runtimeSync && runtimeSync.preservedScreenContracts || [],
    copied: copied || null,
  };
}

function buildRuleGuardStep(ruleGuard, reportPath) {
  return {
    step: 'rule-guard',
    exitCode: ruleGuard && ruleGuard.blockerCount > 0 ? 1 : 0,
    ok: !!(ruleGuard && ruleGuard.blockerCount === 0),
    status: ruleGuard && ruleGuard.status || 'unknown',
    blockerCount: ruleGuard && ruleGuard.blockerCount || 0,
    warningCount: ruleGuard && ruleGuard.warningCount || 0,
    report: reportPath || null,
  };
}

function deriveGateSignals(args) {
  const {
    sourcePackage,
    opts,
    metrics,
    baseProcStatus,
    strictProcStatus,
    compareProcStatus,
    fragmentGeometryOk,
    visualFidelityRisk,
    interactionRuntime,
  } = args;
  const editorGatePass = !sourcePackage
    ? true
    : !!(metrics.htmlCocos && metrics.htmlCocos.runtimeVsSource && ['pass', 'pass-with-approved-art-delta'].includes(metrics.htmlCocos.runtimeVsSource.verdict));
  const converterPass = baseProcStatus === 0
    && strictProcStatus === 0
    && fragmentGeometryOk
    && metrics.runtimeReadiness.ok;
  const previewDiagnosticPass = opts.skipCompare ? true : compareProcStatus === 0;
  const runtimeFinalPass = editorGatePass;
  const visualFidelityRiskPass = visualFidelityRisk.status === 'pass' && visualFidelityRisk.blockerCount === 0;
  const interactionRuntimePass = interactionRuntime.status === 'pass';
  return {
    editorGatePass,
    converterPass,
    previewDiagnosticPass,
    runtimeFinalPass,
    visualFidelityRiskPass,
    interactionRuntimePass,
  };
}

module.exports = {
  buildRuntimeSyncStep,
  buildRuleGuardStep,
  deriveGateSignals,
};

