'use strict';

function buildInitialVerdict(args) {
  const {
    baseProc,
    strictProc,
    sourcePackage,
    opts,
    compareProc,
    editorCompareProc,
    fragmentGeometryNormalize,
    metrics,
    visualFidelityRisk,
    interactionRuntime,
    gateSignals,
    debugInfo,
    extractIssues,
  } = args;
  return {
    rawPass: baseProc.status === 0,
    strictReplayPass: strictProc.status === 0,
    comparePass: gateSignals.previewDiagnosticPass,
    editorVisualPass: gateSignals.runtimeFinalPass,
    fragmentGeometryPass: fragmentGeometryNormalize.ok && metrics.runtimeReadiness.fragmentGeometry.status !== 'blocker',
    runtimeReadinessPass: metrics.runtimeReadiness.ok,
    ruleGuardPass: false,
    visualFidelityRiskPass: gateSignals.visualFidelityRiskPass,
    interactionRuntimePass: gateSignals.interactionRuntimePass,
    debugOnly: debugInfo.debugOnly,
    converterPass: gateSignals.converterPass,
    previewDiagnosticPass: gateSignals.previewDiagnosticPass,
    runtimeFinalPass: gateSignals.runtimeFinalPass,
    workflowPass: gateSignals.converterPass
      && gateSignals.previewDiagnosticPass
      && gateSignals.runtimeFinalPass
      && gateSignals.visualFidelityRiskPass
      && gateSignals.interactionRuntimePass
      && !debugInfo.debugOnly,
    gateScopes: {
      converterPass: 'HTML source package to UCUF JSON plus structural/runtime-readiness gates',
      previewDiagnosticPass: 'browser source-vs-UCUF preview only; image-waivers are diagnostic and not final runtime score authority',
      runtimeFinalPass: 'HTML source screenshot vs Cocos Editor screenshot runtimeVsSource gate',
    },
    remainingIssues: [
      ...extractIssues((strictProc.stdout || '') + '\n' + (strictProc.stderr || '')),
      ...extractIssues((compareProc.stdout || '') + '\n' + (compareProc.stderr || '')),
      ...(editorCompareProc ? extractIssues((editorCompareProc.stdout || '') + '\n' + (editorCompareProc.stderr || '')) : []),
      ...(sourcePackage && opts.skipEditorCompare ? ['editor-compare-skipped'] : []),
      ...(sourcePackage && !opts.skipEditorCompare && !opts.editorScreenshot ? ['editor-screenshot-required'] : []),
      ...fragmentGeometryNormalize.failures.map(item => `fragment-geometry-normalize: ${item.ref} ${item.code}`),
      ...metrics.runtimeReadiness.blockers,
      ...visualFidelityRisk.violations.filter(item => item.severity === 'blocker').map(item => `[${item.ruleId}] ${item.summary}`),
      ...(interactionRuntime.required && interactionRuntime.status !== 'pass' ? [`interactionRuntime:${interactionRuntime.status}`] : []),
    ],
  };
}

function finalizeWorkflowVerdict(args) {
  const {
    repoRoot,
    opts,
    sourcePackage,
    detected,
    paths,
    steps,
    metrics,
    runtimeAuthority,
    visualFidelityRisk,
    interactionRuntime,
    tokenGovernance,
    sourceHtml,
    debugInfo,
    baseProc,
    strictProc,
    compareProc,
    editorCompareProc,
    fragmentGeometryNormalize,
    gateSignals,
    extractIssues,
    runRuleGuard,
    writeJson,
    rel,
    buildSummary,
    buildPreRuleGuardFixes,
    mergeNextFixes,
    topRuleGuardFixes,
  } = args;

  const verdict = buildInitialVerdict({
    baseProc,
    strictProc,
    sourcePackage,
    opts,
    compareProc,
    editorCompareProc,
    fragmentGeometryNormalize,
    metrics,
    visualFidelityRisk,
    interactionRuntime,
    gateSignals,
    debugInfo,
    extractIssues,
  });

  const seededFixes = buildPreRuleGuardFixes(verdict, visualFidelityRisk, interactionRuntime);
  const preliminarySummary = buildSummary({
    opts,
    sourcePackage,
    detected,
    paths,
    steps,
    metrics,
    verdict,
    runtimeAuthority,
    visualFidelityRisk,
    interactionRuntime,
    tokenGovernance,
    sourceHtml,
    nextFixes: seededFixes,
  });

  const ruleGuard = runRuleGuard({
    repoRoot,
    strict: true,
    workflowSummary: preliminarySummary,
    sourceHtml,
  });
  writeJson(paths.ruleGuardReport, ruleGuard);

  const nextFixes = mergeNextFixes(seededFixes, topRuleGuardFixes(ruleGuard));
  verdict.ruleGuardPass = ruleGuard.blockerCount === 0;
  if (!verdict.ruleGuardPass) {
    verdict.remainingIssues.push(...ruleGuard.violations
      .filter(item => item.severity === 'blocker')
      .map(item => `[${item.ruleId}] ${item.summary}`));
  }
  if (debugInfo.debugOnly) {
    verdict.remainingIssues.push(...debugInfo.reasons.map(reason => `debugOnly:${reason}`));
  }
  verdict.workflowPass = gateSignals.converterPass
    && gateSignals.previewDiagnosticPass
    && gateSignals.runtimeFinalPass
    && gateSignals.visualFidelityRiskPass
    && gateSignals.interactionRuntimePass
    && verdict.ruleGuardPass
    && !debugInfo.debugOnly;

  const summary = buildSummary({
    opts,
    sourcePackage,
    detected,
    paths,
    steps,
    metrics,
    verdict,
    runtimeAuthority,
    ruleGuard,
    nextFixes,
    visualFidelityRisk,
    interactionRuntime,
    tokenGovernance,
    sourceHtml,
  });

  return {
    verdict,
    ruleGuard,
    nextFixes,
    summary,
    ruleGuardReportRelPath: rel(paths.ruleGuardReport),
  };
}

module.exports = {
  buildInitialVerdict,
  finalizeWorkflowVerdict,
};

