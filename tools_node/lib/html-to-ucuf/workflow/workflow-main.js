'use strict';

async function runWorkflowMain(ctx) {
  const {
    opts,
    ROOT,
    fs,
    path,
    resolveSourcePackage,
    readText,
    detectInputShape,
    buildPaths,
    ensureDir,
    writeSourcePackageManifest,
    runNodeStep,
    writeSummaryAndExit,
    writeHtmlWithSourceCss,
    sanitizeUcufReadyHtml,
    bootstrapFinalDraftFromRuntime,
    allocateUiVersion,
    rel,
    extractIssues,
    resolveUpdateCoverageBaseline,
    runPerTabReplay,
    injectDynamicTextContracts,
    normalizeInteractionTriggersFromLayout,
    regenerateScreenLocalTokens,
    syncFinalArtifactsToRuntime,
    buildRuntimeSyncStep,
    buildRuntimeInteractionSmokeStep,
    writeUiVersionArtifacts,
    normalizeReferencedFragmentFiles,
    resolveCanonicalRuntimePaths,
    extractPerfMetrics,
    readJsonIfExists,
    extractCompareMetrics,
    assessRuntimeReadiness,
    buildRuntimeAuthority,
    computeDebugOnly,
    assessVisualFidelityRisk,
    assessInteractionRuntime,
    deriveGateSignals,
    finalizeWorkflowVerdict,
    runRuleGuard,
    writeJson,
    buildSummary,
    buildPreRuleGuardFixes,
    mergeNextFixes,
    topRuleGuardFixes,
    buildRuleGuardStep,
  } = ctx;

  let sourcePackage = null;
  let inputPath;
  if (opts.sourceDir) {
    sourcePackage = resolveSourcePackage({ sourceDir: opts.sourceDir, mainHtml: opts.mainHtml });
    if (!sourcePackage.ok) {
      for (const error of sourcePackage.errors) console.error(`[run-html-to-ucuf-workflow] source package error: ${error}`);
      for (const warning of sourcePackage.warnings) console.warn(`[run-html-to-ucuf-workflow] source package warning: ${warning}`);
      process.exit(2);
    }
    inputPath = sourcePackage.mainHtmlPath;
    opts.input = inputPath;
  } else {
    inputPath = path.resolve(opts.input);
  }
  if (!fs.existsSync(inputPath)) {
    console.error(`[run-html-to-ucuf-workflow] input not found: ${inputPath}`);
    process.exit(2);
  }

  const sourceHtml = readText(inputPath);
  const detected = detectInputShape(sourceHtml);
  const paths = buildPaths(opts);
  ensureDir(paths.outDir);
  if (sourcePackage) {
    writeSourcePackageManifest(sourcePackage, paths.sourcePackageManifest, { screenId: opts.screenId, bundle: opts.bundle });
  }

  const steps = [];
  let workingHtml = inputPath;
  const uiVersion = allocateUiVersion(opts.screenId);
  steps.push({ step: 'allocate-ui-version', exitCode: 0, ok: true, uiVersion });

  if (detected.needsPrerender) {
    const args = ['--input', inputPath, '--output', paths.renderedHtml, '--viewport', opts.viewport, '--settle-ms', String(opts.settleMs)];
    if (opts.browser) args.push('--browser', opts.browser);
    const proc = await runNodeStep('render-html-snapshot', 'render-html-snapshot.js', args);
    steps.push({ step: 'render-html-snapshot', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
    workingHtml = paths.renderedHtml;
  }

  if (sourcePackage) {
    const prepared = writeHtmlWithSourceCss({
      htmlPath: workingHtml,
      cssPath: sourcePackage.cssPath,
      outputPath: paths.sourceReadyHtml,
      cssLabel: sourcePackage.manifest.css,
    });
    workingHtml = prepared.outputPath;
    steps.push({ step: 'prepare-source-package-html', exitCode: 0, ok: true, cssBytes: prepared.cssBytes });
  }

  if (opts.skipAnnotate) {
    fs.copyFileSync(workingHtml, paths.readyHtml);
    steps.push({ step: 'prepare-ucuf-ready-html', exitCode: 0, ok: true, skipped: true });
  } else {
    const args = ['--html', workingHtml, '--screen-id', opts.screenId, '--apply', '--out', paths.readyHtml, '--report', paths.annotateReport];
    if (opts.contentContract) args.push('--content-contract', opts.contentContract);
    const proc = await runNodeStep('annotate-html-bindings', 'annotate-html-bindings.js', args);
    steps.push({ step: 'annotate-html-bindings', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
  }

  const sanitizeResult = sanitizeUcufReadyHtml(paths.readyHtml);
  steps.push({ step: 'sanitize-ucuf-ready-html', exitCode: 0, ok: true, rewrittenInlineHandlers: sanitizeResult.rewrittenInlineHandlers });

  const enableUpdateBootstrap = opts.updateMode;
  const bootstrapResult = enableUpdateBootstrap
    ? bootstrapFinalDraftFromRuntime(paths, opts.screenId)
    : { ok: true, copiedLayout: false, copiedSkin: false, reason: 'disabled: final uses current HTML conversion output' };
  steps.push({
    step: 'update-mode-bootstrap-from-runtime',
    exitCode: 0,
    ok: true,
    copiedLayout: bootstrapResult.copiedLayout,
    copiedSkin: bootstrapResult.copiedSkin,
    runtimeScreenPath: bootstrapResult.runtimeScreenPath ? rel(bootstrapResult.runtimeScreenPath) : null,
    runtimeLayoutPath: bootstrapResult.runtimeLayoutPath ? rel(bootstrapResult.runtimeLayoutPath) : null,
    runtimeSkinPath: bootstrapResult.runtimeSkinPath ? rel(bootstrapResult.runtimeSkinPath) : null,
    reason: bootstrapResult.reason || null,
  });

  const baseArgs = [
    '--input', paths.readyHtml,
    '--output', paths.rawLayout,
    '--skin-output', paths.rawSkin,
    '--screen-id', opts.screenId,
    '--skin-id', `${opts.screenId}.skin`,
    '--viewport', opts.viewport,
    '--bundle', opts.bundle,
    '--emit-screen-draft',
    '--emit-preload-manifest',
    '--emit-performance-report',
    '--emit-warnings',
    '--warn-only',
    '--no-backup',
  ];
  if (sourcePackage) baseArgs.push('--tokens-source', sourcePackage.tokensPath, '--source-css', sourcePackage.cssPath, '--use-computed-style');
  if (opts.evolutionLog) baseArgs.push('--evolution-log', opts.evolutionLog);
  const baseProc = await runNodeStep('dom-to-ui-json:raw', 'dom-to-ui-json.js', baseArgs);
  steps.push({ step: 'dom-to-ui-json:raw', exitCode: baseProc.status ?? 1, ok: baseProc.status === 0, issues: extractIssues((baseProc.stdout || '') + '\n' + (baseProc.stderr || '')) });
  if (baseProc.status !== 0) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  if (opts.skipOptimize) {
    fs.copyFileSync(paths.rawLayout, paths.optimizedLayout);
    steps.push({ step: 'optimize-ucuf-layout', exitCode: 0, ok: true, skipped: true });
  } else {
    const proc = await runNodeStep('optimize-ucuf-layout', 'optimize-ucuf-layout.js', ['--input', paths.rawLayout, '--output', paths.optimizedLayout, '--report', paths.optimizeReport]);
    steps.push({ step: 'optimize-ucuf-layout', exitCode: proc.status ?? 1, ok: proc.status === 0 });
    if (proc.status !== 0) {
      writeSummaryAndExit(steps, detected, paths, opts, 1);
      return;
    }
  }

  const visualReview = paths.rawLayout.replace(/\.json$/i, '.visual-review.json');
  const skinArgs = ['--skin', paths.rawSkin, '--report', paths.skinFixReport];
  if (fs.existsSync(visualReview)) skinArgs.push('--visual-review', visualReview);
  const skinProc = await runNodeStep('auto-fix-ucuf-skin', 'auto-fix-ucuf-skin.js', skinArgs);
  steps.push({ step: 'auto-fix-ucuf-skin', exitCode: skinProc.status ?? 1, ok: skinProc.status === 0 });
  if (skinProc.status !== 0) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  // Plan 4.1：strict replay 不准回填 raw sidecar；final sidecar 改由 source HTML 在 replay 內重建。
  const strictArgs = [
    '--input', paths.readyHtml,
    '--layout-input', paths.optimizedLayout,
    '--skin-input', paths.rawSkin,
    '--output', paths.finalLayout,
    '--skin-output', paths.finalSkin,
    '--screen-id', opts.screenId,
    '--skin-id', `${opts.screenId}.skin`,
    '--viewport', opts.viewport,
    '--bundle', opts.bundle,
    '--emit-screen-draft',
    '--emit-preload-manifest',
    '--emit-performance-report',
    '--emit-warnings',
    '--no-backup',
  ];
  if (opts.strictReplayGates) strictArgs.push('--strict');
  if (opts.updateMode) {
    strictArgs.push('--sync-existing', '--merge-mode', opts.updateMergeMode);
  }
  const coverageBaselinePath = resolveUpdateCoverageBaseline(paths, opts);
  if (coverageBaselinePath) {
    strictArgs.push('--coverage-baseline', coverageBaselinePath);
  }
  if (sourcePackage) strictArgs.push('--tokens-source', sourcePackage.tokensPath, '--source-css', sourcePackage.cssPath);
  if (!opts.noValidate) strictArgs.push('--validate');
  const strictProc = await runNodeStep('dom-to-ui-json:strict-replay', 'dom-to-ui-json.js', strictArgs);
  steps.push({
    step: 'dom-to-ui-json:strict-replay',
    exitCode: strictProc.status ?? 1,
    ok: strictProc.status === 0,
    coverageBaseline: coverageBaselinePath ? rel(coverageBaselinePath) : null,
    updateMode: opts.updateMode,
    updateMergeMode: opts.updateMode ? opts.updateMergeMode : null,
    issues: extractIssues((strictProc.stdout || '') + '\n' + (strictProc.stderr || '')),
  });

  const perTabReplay = await runPerTabReplay(paths, opts, sourcePackage, inputPath);
  steps.push({
    step: 'per-tab-replay',
    exitCode: perTabReplay.skipped || perTabReplay.ok ? 0 : 1,
    ok: perTabReplay.skipped || perTabReplay.ok,
    skipped: !!perTabReplay.skipped,
    reason: perTabReplay.reason || null,
    renderExitCode: perTabReplay.renderExitCode ?? null,
    fragmentCount: Array.isArray(perTabReplay.fragments) ? perTabReplay.fragments.length : 0,
    mergedSkinSlots: perTabReplay.mergedSkinSlots || 0,
    tabRoutingCount: perTabReplay.tabRoutingCount || 0,
    lazySlotDefaultUpdated: perTabReplay.lazySlotDefaultUpdated || 0,
    fragments: perTabReplay.fragments || [],
    error: perTabReplay.error || null,
  });
  if (!perTabReplay.skipped && !perTabReplay.ok) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  const textContractSync = injectDynamicTextContracts(paths.finalLayout, opts.screenId);
  steps.push({
    step: 'inject-dynamic-text-contracts',
    exitCode: 0,
    ok: true,
    updated: textContractSync.updated,
  });

  const interactionTriggerSync = normalizeInteractionTriggersFromLayout(paths);
  steps.push({
    step: 'normalize-interaction-triggers',
    exitCode: 0,
    ok: true,
    updated: interactionTriggerSync.updated,
  });

  const tokenGovernance = regenerateScreenLocalTokens(paths, opts);
  steps.push({
    step: 'screen-local-token-governance',
    exitCode: 0,
    ok: true,
    mode: tokenGovernance.mode,
    sourceSuggestionFiles: tokenGovernance.sourceSuggestionFiles,
    localTokenPath: tokenGovernance.localTokenPath,
    diffReportPath: tokenGovernance.diffReportPath,
    tokenCount: tokenGovernance.tokenCount,
    unresolvedColorCount: tokenGovernance.unresolvedColorCount,
    skinLocalTokenApplied: tokenGovernance.skinTokenApply && tokenGovernance.skinTokenApply.applied,
    addedCount: tokenGovernance.diff.addedCount,
    removedCount: tokenGovernance.diff.removedCount,
    persistedCount: tokenGovernance.diff.persistedCount,
  });

  const runtimeSync = syncFinalArtifactsToRuntime(paths, opts, uiVersion);
  steps.push(buildRuntimeSyncStep(runtimeSync));
  if (!runtimeSync.skipped && !(runtimeSync.copied && runtimeSync.copied.layout && runtimeSync.copied.skin && runtimeSync.copied.screen)) {
    writeSummaryAndExit(steps, detected, paths, opts, 1);
    return;
  }

  const interactionSmoke = buildRuntimeInteractionSmokeStep(paths, opts, sourceHtml);
  steps.push(interactionSmoke);

  const uiVersionArtifacts = writeUiVersionArtifacts(paths, opts, uiVersion);
  steps.push({
    step: 'emit-ui-version-artifacts',
    exitCode: 0,
    ok: true,
    uiVersion,
    outVersionPath: uiVersionArtifacts.outVersionPath,
    runtimeVersionPath: uiVersionArtifacts.runtimeVersionPath,
  });

  const fragmentGeometryNormalize = normalizeReferencedFragmentFiles({
    repoRoot: ROOT,
    screenId: opts.screenId,
    write: true,
  });
  steps.push({
    step: 'normalize-fragment-geometry-contract',
    exitCode: fragmentGeometryNormalize.ok ? 0 : 1,
    ok: fragmentGeometryNormalize.ok,
    normalizedCount: fragmentGeometryNormalize.normalizedCount,
    skippedCount: fragmentGeometryNormalize.skippedCount,
    failures: fragmentGeometryNormalize.failures,
  });

  let compareProc = { status: 0, stdout: '', stderr: '' };
  if (!opts.skipCompare) {
    const compareArgs = [
      '--html', paths.readyHtml,
      '--layout', fs.existsSync(paths.finalLayout) ? paths.finalLayout : paths.optimizedLayout,
      '--skin', fs.existsSync(paths.finalSkin) ? paths.finalSkin : paths.rawSkin,
      '--screen-id', opts.screenId,
      '--output', paths.comparePng,
      '--save-panels', path.join(paths.outDir, 'compare-panels'),
      '--strict-coverage', String(opts.strictCoverage),
      '--strict-pixel', String(opts.strictPixel),
    ];
    if (opts.browser) compareArgs.push('--browser', opts.browser);
    if (sourcePackage) compareArgs.push('--tokens', sourcePackage.tokensPath);
    if (opts.artAuthorityWaivers) compareArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
    compareProc = await runNodeStep('dom-to-ui-compare', 'dom-to-ui-compare.js', compareArgs);
    steps.push({ step: 'dom-to-ui-compare', exitCode: compareProc.status ?? 1, ok: compareProc.status === 0, issues: extractIssues((compareProc.stdout || '') + '\n' + (compareProc.stderr || '')) });
  }

  let editorCompareProc = null;
  if (sourcePackage && !opts.skipEditorCompare && opts.editorScreenshot) {
    const editorArgs = [
      '--source-dir', sourcePackage.sourceDir,
      '--main-html', sourcePackage.manifest.mainHtml,
      '--screen-id', opts.screenId,
      '--editor-screenshot', opts.editorScreenshot,
      '--output', paths.outDir,
      '--threshold', '0.95',
    ];
    if (opts.browser) editorArgs.push('--browser', opts.browser);
    if (opts.captureProtocol) editorArgs.push('--capture-protocol', opts.captureProtocol);
    if (opts.captureReport) editorArgs.push('--capture-report', opts.captureReport);
    if (opts.artAuthorityWaivers) editorArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
    if (opts.evolutionLog) editorArgs.push('--evolution-log', opts.evolutionLog);
    editorCompareProc = await runNodeStep('compare-html-to-cocos-editor', 'compare-html-to-cocos-editor.js', editorArgs);
    steps.push({ step: 'compare-html-to-cocos-editor', exitCode: editorCompareProc.status ?? 1, ok: editorCompareProc.status === 0, issues: extractIssues((editorCompareProc.stdout || '') + '\n' + (editorCompareProc.stderr || '')) });
  } else if (sourcePackage && !opts.skipEditorCompare) {
    steps.push({ step: 'compare-html-to-cocos-editor', exitCode: 2, ok: false, issues: ['editor-screenshot-required'] });
  }

  const runtimePaths = resolveCanonicalRuntimePaths(opts.screenId);
  const readinessArgs = [
    '--screen-id', opts.screenId,
    '--output', runtimePaths.readinessPath,
    '--final-verdict', paths.htmlCocosVerdict,
  ];
  if (opts.captureProtocol) readinessArgs.push('--capture-protocol', opts.captureProtocol);
  if (opts.artAuthorityWaivers) readinessArgs.push('--art-authority-waivers', opts.artAuthorityWaivers);
  const readinessProc = await runNodeStep('html-to-ucuf-readiness', 'html-to-ucuf-readiness.js', readinessArgs);
  steps.push({
    step: 'html-to-ucuf-readiness',
    exitCode: readinessProc.status ?? 1,
    ok: readinessProc.status === 0,
    output: rel(runtimePaths.readinessPath),
    issues: extractIssues((readinessProc.stdout || '') + '\n' + (readinessProc.stderr || '')),
  });

  const metrics = {
    raw: extractPerfMetrics(paths.rawLayout),
    optimized: Object.assign({}, readJsonIfExists(paths.optimizeReport) || {}, { perf: extractPerfMetrics(paths.optimizedLayout) }),
    final: extractPerfMetrics(fs.existsSync(paths.finalLayout) ? paths.finalLayout : paths.optimizedLayout),
    compare: opts.skipCompare ? null : extractCompareMetrics(paths.comparePng),
    htmlCocos: readJsonIfExists(paths.htmlCocosVerdict),
  };
  metrics.runtimeReadiness = assessRuntimeReadiness(paths, sourceHtml, opts.screenId);
  const runtimeAuthority = buildRuntimeAuthority(opts, runtimeSync);
  const debugInfo = computeDebugOnly(opts, sourcePackage);
  const visualFidelityRisk = assessVisualFidelityRisk(paths, metrics, opts);
  const interactionRuntime = assessInteractionRuntime(paths, steps, sourceHtml);
  const gateSignals = deriveGateSignals({
    sourcePackage,
    opts,
    metrics,
    baseProcStatus: baseProc.status,
    strictProcStatus: strictProc.status,
    compareProcStatus: compareProc.status,
    fragmentGeometryOk: fragmentGeometryNormalize.ok,
    visualFidelityRisk,
    interactionRuntime,
  });

  const finalized = finalizeWorkflowVerdict({
    repoRoot: ROOT,
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
  });

  const verdict = finalized.verdict;
  const ruleGuard = finalized.ruleGuard;
  const nextFixes = finalized.nextFixes;
  steps.push(buildRuleGuardStep(ruleGuard, finalized.ruleGuardReportRelPath));

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

  fs.writeFileSync(paths.summary, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`[run-html-to-ucuf-workflow] summary=${rel(paths.summary)}`);
  console.log(`[run-html-to-ucuf-workflow] rule-guard=${ruleGuard.status} blockers=${ruleGuard.blockerCount}`);
  console.log(`[run-html-to-ucuf-workflow] raw.nodeCount=${metrics.raw.nodeCount} optimized.nodeCount=${metrics.optimized.after || metrics.optimized.perf.nodeCount} final.nodeCount=${metrics.final.nodeCount}`);
  if (metrics.compare) {
    console.log(`[run-html-to-ucuf-workflow] compare.adjustedCoverage=${metrics.compare.adjustedCoverage}`);
  }
  if (metrics.runtimeReadiness.warnings.length) {
    for (const warning of metrics.runtimeReadiness.warnings) console.warn(`[run-html-to-ucuf-workflow] ${warning}`);
  }
  if (metrics.runtimeReadiness.blockers.length) {
    for (const blocker of metrics.runtimeReadiness.blockers) console.error(`[run-html-to-ucuf-workflow] ${blocker}`);
  }
  if (nextFixes.length) {
    for (const fix of nextFixes) console.error(`[run-html-to-ucuf-workflow] nextFix ${fix.ruleId}: ${fix.fixAction}`);
  }
  if (debugInfo.debugOnly) {
    console.error(`[run-html-to-ucuf-workflow] debugOnly=${debugInfo.reasons.join(',')}`);
  }
  if (!verdict.workflowPass) {
    console.error('[run-html-to-ucuf-workflow] verdict=needs-review');
    process.exit(1);
  }
  console.log('[run-html-to-ucuf-workflow] verdict=pass');
}

module.exports = {
  runWorkflowMain,
};
