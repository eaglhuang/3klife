// Plan 4 rule guard engine.
// 這裡只檢查 HTML-to-UCUF 工具鏈是否遵守權威流程；layout/skin 的細節仍交給 validate-ui-specs。
'use strict';

const fs = require('fs');
const path = require('path');
const { PLAN4_RULES, getRule } = require('./rule-guard-rules');

const DEFAULT_CORE_FILES = [
  'tools_node/run-html-to-ucuf-workflow.js',
  'tools_node/render-html-tab-fragments.js',
  'tools_node/lib/dom-to-ui/sidecar-emitters.js',
  'tools_node/lib/dom-to-ui/readiness-gate.js',
  'tools_node/lib/dom-to-ui/draft-builder.js',
  'tools_node/validate-ui-specs.js',
];

const FORBIDDEN_SCREEN_PATTERNS = [
  { pattern: /\bcharacter-ds3\b/i, label: 'character-ds3' },
  { pattern: /\bCharacterDs3\b/, label: 'CharacterDs3' },
  { pattern: /\bgacha-ds3\b/i, label: 'gacha-ds3' },
  { pattern: /\bdiv_6\b/, label: 'div_6' },
  { pattern: /\bdiv_8\b/, label: 'div_8' },
  { pattern: /\bbutton_[4-9]\b/, label: 'button_4~9' },
  { pattern: /Design System 3[\\/]+colors_and_type\.css/i, label: 'Design System 3/colors_and_type.css fallback' },
];

function runRuleGuard(options) {
  const opts = options || {};
  const repoRoot = path.resolve(opts.repoRoot || path.resolve(__dirname, '..', '..', '..'));
  const violations = [];
  const warnings = [];

  const workflowSummary = loadWorkflowSummary(opts);
  const sourceHtml = loadSourceHtml(opts, workflowSummary);
  const captureReport = loadCaptureReport(opts, workflowSummary);

  if (opts.scanCore !== false) {
    scanCoreSource(repoRoot, violations);
    scanSkillDoc(repoRoot, violations);
    scanDraftBuilderRegistry(repoRoot, violations);
  }
  if (workflowSummary) {
    validateWorkflowSummary(repoRoot, workflowSummary, sourceHtml, violations, warnings);
    validateRadarGeometryFromSummary(repoRoot, workflowSummary, violations);
  }
  if (captureReport) {
    validateCaptureReportArtifact(captureReport, {
      expectedScreenId: opts.expectedScreenId || workflowSummary && workflowSummary.screenId || '',
      violations,
    });
  }
  if (opts.layout) {
    validateRadarGeometryInFile(repoRoot, path.resolve(opts.layout), violations);
  }

  const blockerCount = violations.filter(item => item.severity === 'blocker').length;
  const warningCount = warnings.length + violations.filter(item => item.severity === 'warning').length;
  const status = blockerCount > 0 ? 'blocker' : (warningCount > 0 ? 'warning' : 'pass');
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    status,
    blockerCount,
    warningCount,
    violations: violations.concat(warnings),
    rules: PLAN4_RULES.map(rule => ({
      id: rule.id,
      slug: rule.slug,
      severity: rule.severity,
      status: rule.status,
    })),
  };
}

function loadWorkflowSummary(opts) {
  if (opts.workflowSummary && typeof opts.workflowSummary === 'object') return opts.workflowSummary;
  const filePath = opts.workflowSummaryPath || opts.summary;
  if (!filePath) return null;
  return readJsonIfExists(filePath);
}

function loadSourceHtml(opts, workflowSummary) {
  if (typeof opts.sourceHtml === 'string') return opts.sourceHtml;
  const sourcePath = opts.sourceHtmlPath
    || (workflowSummary && workflowSummary.input ? path.resolve(opts.repoRoot || process.cwd(), workflowSummary.input) : null);
  if (!sourcePath || !fs.existsSync(sourcePath)) return '';
  try { return fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, ''); } catch (_) { return ''; }
}

function loadCaptureReport(opts, workflowSummary) {
  const fromSummary = workflowSummary
    && workflowSummary.finalCapture
    && workflowSummary.finalCapture.captureReport;
  const filePath = opts.captureReportPath || opts.captureReport || fromSummary;
  if (!filePath) return null;
  const full = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(opts.repoRoot || process.cwd(), filePath);
  const report = readJsonIfExists(full);
  return report ? { filePath: full, report } : { filePath: full, report: null };
}

function scanCoreSource(repoRoot, violations) {
  for (const relPath of DEFAULT_CORE_FILES) {
    const filePath = path.join(repoRoot, relPath);
    const text = readTextIfExists(filePath);
    if (!text) continue;
    for (const match of findLineMatches(text, FORBIDDEN_SCREEN_PATTERNS)) {
      addViolation(violations, 'H2U-P4-005', {
        summary: `core file contains screen-specific branch or fallback: ${match.label}`,
        evidence: `${relPath}:${match.line}`,
      });
    }
  }

  const workflowPath = path.join(repoRoot, 'tools_node', 'run-html-to-ucuf-workflow.js');
  const workflow = readTextIfExists(workflowPath);
  if (/preserveRawSidecarsWhenStrictReplayDropsInteractions|strict-replay-sidecar-repair/.test(workflow)) {
    addViolation(violations, 'H2U-P4-006', {
      summary: 'workflow still contains raw sidecar repair after strict replay',
      evidence: 'tools_node/run-html-to-ucuf-workflow.js',
    });
  }

  const readinessPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'readiness-gate.js');
  const readiness = readTextIfExists(readinessPath);
  if (/\$\{screenId\}-default|-default\.json/.test(readiness)) {
    addViolation(violations, 'H2U-P4-007', {
      summary: 'readiness gate still accepts <screenId>-default skin fallback',
      evidence: 'tools_node/lib/dom-to-ui/readiness-gate.js',
    });
  }

  const sidecarPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'sidecar-emitters.js');
  const sidecar = readTextIfExists(sidecarPath);
  if (/TAB_TARGET_TO_CHILD_PANEL|CharacterDs3[A-Za-z]*Child/.test(sidecar)) {
    addViolation(violations, 'H2U-P4-010', {
      summary: 'tab routing sidecar still uses hardcoded child panel mapping',
      evidence: 'tools_node/lib/dom-to-ui/sidecar-emitters.js',
    });
  }

  const draftBuilderPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder.js');
  const draftBuilder = readTextIfExists(draftBuilderPath);
  // Plan 4.1: 語義分類必須看 token/attribute，避免 history 被 story 子字串誤擊中。
  if (/\/[^/\n]*story\|[^/\n]*\/\.test|\/[^/\n]*\|story\|[^/\n]*\/\.test|\/[^/\n]*\|story[^/\n]*\/\.test/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-014', {
      summary: 'draft-builder still contains a bare story substring semantic classifier',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js',
    });
  }
  if (/slot\.story-strip/.test(draftBuilder) && !/story-strip-explicit-or-multi-signal|hasExplicitStoryStripSignal|hasStoryStripMultiSignal/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-015', {
      summary: 'story-strip emission is not guarded by explicit-or-multi-signal evidence',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js',
    });
  }
  if (/gradient\.type\s*!==\s*['"]linear['"]|using last linear-gradient layer; radial\/image overlays/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-016', {
      summary: 'background extraction still risks downgrading non-linear or multi-layer gradients',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js',
    });
  }
  if (/gradient\.type\s*!==\s*['"]linear['"]/.test(draftBuilder) && !/radial/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-017', {
      summary: 'radial gradients are not preserved or explicitly blocked',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js',
    });
  }

  if (/sidecarPath\(paths\.rawLayout/.test(workflow)) {
    addViolation(violations, 'H2U-P4-020', {
      summary: 'runtime sync still allows raw sidecar fallback',
      evidence: 'tools_node/run-html-to-ucuf-workflow.js',
    });
  }

  const previewHostPath = path.join(repoRoot, 'assets', 'scripts', 'ui', 'components', 'UIScreenPreviewHost.ts');
  const previewHost = readTextIfExists(previewHostPath);
  if (previewHost && !(/loadScreenSidecar<[^>]*Interaction|loadScreenSidecar<PreviewInteractionSidecar/.test(previewHost)
    && /loadScreenSidecar<[^>]*TabRouting|loadScreenSidecar<PreviewTabRoutingSidecar/.test(previewHost)
    && /_bindSidecarInteractionAction|interactionRuntimeReport/.test(previewHost))) {
    addViolation(violations, 'H2U-P4-018', {
      summary: 'Preview runtime does not load and execute synced interaction/tab-routing sidecars',
      evidence: 'assets/scripts/ui/components/UIScreenPreviewHost.ts',
    });
  }
}

function scanSkillDoc(repoRoot, violations) {
  const skillPath = path.join(repoRoot, '.github', 'skills', 'html-to-ucuf', 'SKILL.md');
  const text = readTextIfExists(skillPath);
  if (!text) {
    addViolation(violations, 'H2U-P4-013', {
      summary: 'html-to-ucuf skill file is missing',
      evidence: '.github/skills/html-to-ucuf/SKILL.md',
    });
    return;
  }
  const hasPlan4 = /docs\/html_skill_plan4\.md/i.test(text) && /current execution spec|目前執行規格|Plan 4/i.test(text);
  const plan2Formal = /html_skill_plan2\.md(?![\s\S]{0,120}(historical|歷史))/i.test(text);
  if (!hasPlan4 || plan2Formal) {
    addViolation(violations, 'H2U-P4-013', {
      summary: 'skill doc does not clearly point to Plan 4 as current execution spec',
      evidence: '.github/skills/html-to-ucuf/SKILL.md',
    });
  }
}

function scanDraftBuilderRegistry(repoRoot, violations) {
  const text = readTextIfExists(path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder.js'));
  if (!/DRAFT_BUILDER_STAGE_RULES|draftStageRules|ruleRegistry/.test(text)) {
    addViolation(violations, 'H2U-P4-012', {
      summary: 'draft-builder has no Plan 4 stage rule registry marker',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js',
    });
  }
}

function validateWorkflowSummary(repoRoot, summary, sourceHtml, violations, warnings) {
  const debugOnly = summary.debugOnly === true;
  const reasons = Array.isArray(summary.debugOnlyReasons) ? summary.debugOnlyReasons : [];
  const sourcePackage = summary.sourcePackage || null;
  const hasSourcePackage = !!(sourcePackage && sourcePackage.mainHtml && sourcePackage.tokens && sourcePackage.css);
  const hasTabbedSource = detectTabbedSource(sourceHtml, summary);

  if (!hasSourcePackage && !debugOnly) {
    addViolation(violations, 'H2U-P4-001', {
      summary: 'single-file or incomplete source package produced a formal summary',
      evidence: 'workflowSummary.debugOnly=false',
    });
  }
  if ((reasons.includes('input-debug-entry') || !hasSourcePackage) && !debugOnly) {
    addViolation(violations, 'H2U-P4-001', {
      summary: '--input/debug entry was not marked debugOnly',
      evidence: 'workflowSummary.debugOnly=false',
    });
  }
  if ((reasons.includes('editor-compare-skipped') || reasons.includes('editor-screenshot-missing') || reasons.includes('capture-protocol-missing')) && !debugOnly) {
    addViolation(violations, 'H2U-P4-002', {
      summary: 'missing/skipped editor final gate was not marked debugOnly',
      evidence: `debugOnlyReasons=${reasons.join(',')}`,
    });
  }
  if (reasons.includes('runtime-sync-disabled') && !debugOnly) {
    addViolation(violations, 'H2U-P4-003', {
      summary: '--no-runtime-sync was not marked debugOnly',
      evidence: `debugOnlyReasons=${reasons.join(',')}`,
    });
  }

  const steps = Array.isArray(summary.steps) ? summary.steps : [];
  const perTabStep = steps.find(step => step && step.step === 'per-tab-replay');
  if (hasTabbedSource) {
    if (!perTabStep || perTabStep.skipped || perTabStep.ok !== true || (perTabStep.fragmentCount || 0) <= 0) {
      addViolation(violations, 'H2U-P4-004', {
        summary: 'tabbed source did not finish per-tab replay with fragments',
        evidence: perTabStep ? JSON.stringify({
          skipped: perTabStep.skipped,
          ok: perTabStep.ok,
          fragmentCount: perTabStep.fragmentCount,
          reason: perTabStep.reason,
        }) : 'missing per-tab-replay step',
      });
    }
  }

  if (steps.some(step => step && step.step === 'strict-replay-sidecar-repair')) {
    addViolation(violations, 'H2U-P4-006', {
      summary: 'workflow summary recorded forbidden strict replay sidecar repair',
      evidence: 'steps[].step=strict-replay-sidecar-repair',
    });
  }

  const runtimeAuthority = summary.runtimeAuthority || {};
  if (summary.debugOnly !== true && runtimeAuthority.authority !== 'synced-final-runtime-json') {
    addViolation(violations, 'H2U-P4-008', {
      summary: 'formal summary is not using synced final runtime JSON as authority',
      evidence: `runtimeAuthority.authority=${runtimeAuthority.authority || 'missing'}`,
    });
  }

  if (summary.debugOnly !== true && sourcePackage && (!sourcePackage.tokens || !sourcePackage.css)) {
    addViolation(violations, 'H2U-P4-009', {
      summary: 'formal source package is missing CSS or token authority',
      evidence: JSON.stringify({ tokens: sourcePackage.tokens || null, css: sourcePackage.css || null }),
    });
  }

  const finalCapture = summary.finalCapture || {};
  const captureAuthority = finalCapture.authority || (summary.metrics && summary.metrics.htmlCocos && summary.metrics.htmlCocos.captureAuthority) || null;
  if (summary.debugOnly !== true && !finalCapture.captureReport) {
    addViolation(violations, 'H2U-P4-022', {
      summary: 'formal summary is missing final capture report authority',
      evidence: 'workflowSummary.finalCapture.captureReport=missing',
    });
  }
  if (captureAuthority) {
    if (Array.isArray(captureAuthority.violations) && captureAuthority.violations.length > 0) {
      for (const violation of captureAuthority.violations) {
        addViolation(violations, violation.ruleId || 'H2U-P4-021', {
          summary: violation.summary || 'capture authority violation',
          evidence: violation.evidence || JSON.stringify(captureAuthority),
          fixAction: violation.fixAction,
        });
      }
    }
    if (captureAuthority.ok === false) {
      addViolation(violations, 'H2U-P4-021', {
        summary: 'final capture authority is not ok',
        evidence: JSON.stringify({
          expectedScreenId: captureAuthority.expectedScreenId || null,
          actualScreenId: captureAuthority.actualScreenId || null,
          captureMode: captureAuthority.captureMode || null,
        }),
      });
    }
  }

  if (summary.debugOnly !== true) {
    const visualFidelityRisk = summary.visualFidelityRisk || null;
    if (!visualFidelityRisk) {
      addViolation(violations, 'H2U-P4-019', {
        summary: 'formal summary is missing visualFidelityRisk',
        evidence: 'workflowSummary.visualFidelityRisk=missing',
      });
    } else if (visualFidelityRisk.status !== 'pass' || Number(visualFidelityRisk.blockerCount || 0) > 0) {
      addViolation(violations, 'H2U-P4-019', {
        summary: 'visualFidelityRisk blocks formal pass',
        evidence: JSON.stringify({
          status: visualFidelityRisk.status || null,
          blockerCount: visualFidelityRisk.blockerCount || 0,
        }),
      });
    }

    const interactionRequired = detectInteractionRequired(sourceHtml, summary);
    const interactionRuntime = summary.interactionRuntime || null;
    if (interactionRequired && (!interactionRuntime || interactionRuntime.status !== 'pass')) {
      addViolation(violations, 'H2U-P4-018', {
        summary: 'formal interaction sidecar is not executed by runtime smoke',
        evidence: interactionRuntime ? JSON.stringify({
          status: interactionRuntime.status || null,
          actionsBound: interactionRuntime.actionsBound || 0,
        }) : 'workflowSummary.interactionRuntime=missing',
      });
    }
  }

  if (summary.environmentBlocked) {
    warnings.push(buildViolation('H2U-P4-002', {
      severity: 'warning',
      summary: 'environment-blocked: final/browser compare could not run in this environment',
      evidence: String(summary.environmentBlocked),
    }));
  }

  validateTokenGovernance(repoRoot, summary, violations);
}

function validateTokenGovernance(repoRoot, summary, violations) {
  const tg = summary.tokenGovernance || null;

  // H2U-P4-025: replace-all-per-run mode required on formal runs
  if (summary.debugOnly !== true) {
    if (!tg || tg.mode !== 'replace-all-per-run') {
      addViolation(violations, 'H2U-P4-025', {
        summary: `tokenGovernance.mode is not replace-all-per-run (got: ${tg ? tg.mode : 'missing'})`,
        evidence: tg ? `tokenGovernance.mode=${tg.mode}` : 'workflowSummary.tokenGovernance=missing',
      });
    }

    // H2U-P4-026: diff report required
    if (!tg || !tg.diffReportPath) {
      addViolation(violations, 'H2U-P4-026', {
        summary: 'tokenGovernance.diffReportPath is missing',
        evidence: tg ? 'tokenGovernance.diffReportPath=missing' : 'workflowSummary.tokenGovernance=missing',
      });
    } else {
      const diffPath = path.isAbsolute(tg.diffReportPath)
        ? tg.diffReportPath
        : path.join(repoRoot, tg.diffReportPath);
      const diff = readJsonIfExists(diffPath);
      // Support both flat structure (diff.addedCount) and nested structure (diff.diff.addedCount)
      const diffData = diff && (diff.diff || diff);
      if (!diff || (!Number.isFinite(diffData.addedCount) && diffData.added === undefined)) {
        addViolation(violations, 'H2U-P4-026', {
          summary: 'token diff report is missing or malformed',
          evidence: path.relative(repoRoot, diffPath).replace(/\\/g, '/'),
        });
      }
    }
  }

  // H2U-P4-027 & H2U-P4-028: load local-tokens.json for deep checks
  if (!tg || !tg.localTokenPath) return;
  const localTokensAbsPath = path.isAbsolute(tg.localTokenPath)
    ? tg.localTokenPath
    : path.join(repoRoot, tg.localTokenPath);
  const localTokens = readJsonIfExists(localTokensAbsPath);
  if (!localTokens) return;

  // H2U-P4-027: promotion gate — block if any token is promotion-eligible but not yet promoted
  const tokenList = Array.isArray(localTokens.tokens) ? localTokens.tokens : [];
  const promotionEligible = tokenList.filter(t =>
    t && Number(t.crossScreenCount || 0) >= 2 && Number(t.consecutiveVersions || 0) >= 2
  );
  if (promotionEligible.length > 0) {
    addViolation(violations, 'H2U-P4-027', {
      summary: `${promotionEligible.length} screen-local token(s) qualify for promotion but have not been promoted`,
      evidence: promotionEligible.slice(0, 5).map(t => t.name || t.token || '?').join(', '),
    });
  }

  // H2U-P4-028: waiver expiry — block if any waiver has expired
  const waivers = Array.isArray(localTokens.waivers) ? localTokens.waivers : [];
  const currentVersion = String(summary.uiVersion || localTokens.policy && localTokens.policy.generatedAtVersion || '');
  const expiredWaivers = waivers.filter(w => {
    if (!w || !w.expiresAtVersion) return false;
    return compareVersions(String(w.expiresAtVersion), currentVersion) < 0;
  });
  if (expiredWaivers.length > 0) {
    addViolation(violations, 'H2U-P4-028', {
      summary: `${expiredWaivers.length} literal-color waiver(s) have expired (currentVersion=${currentVersion || 'unknown'})`,
      evidence: expiredWaivers.slice(0, 5).map(w => `${w.token || '?'} expired=${w.expiresAtVersion}`).join(', '),
    });
  }
}

// Compare two "vMAJOR.MINOR.PATCH" version strings. Returns negative if a < b, 0 if equal, positive if a > b.
function compareVersions(a, b) {
  const parse = s => String(s || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

function validateCaptureReportArtifact(payload, args) {
  const violations = args.violations;
  if (!payload.report) {
    addViolation(violations, 'H2U-P4-021', {
      summary: 'capture report path is missing or unreadable',
      evidence: relative(process.cwd(), payload.filePath),
    });
    return;
  }
  const captures = Array.isArray(payload.report.captures) ? payload.report.captures : [];
  if (captures.length === 0) {
    addViolation(violations, 'H2U-P4-021', {
      summary: 'capture report has no captures',
      evidence: relative(process.cwd(), payload.filePath),
    });
    return;
  }
  for (const capture of captures) {
    const expected = String(capture.expectedScreenId || '').trim();
    const actual = String(capture.actualScreenId || capture.screenId || '').trim();
    const required = String(args.expectedScreenId || expected || '').trim();
    if (required && (expected !== required || actual !== required)) {
      addViolation(violations, 'H2U-P4-021', {
        summary: `capture target mismatch: expected=${expected || '(missing)'} actual=${actual || '(missing)'} required=${required}`,
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`,
      });
    }
    if (capture.captureMode !== 'formal-html-to-ucuf') {
      addViolation(violations, 'H2U-P4-023', {
        summary: `capture uses legacy or missing captureMode: ${capture.captureMode || '(missing)'}`,
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`,
      });
    }
    const version = String(capture.runtimeVersion || capture.uiVersion || '').trim();
    const hash = capture.runtimeSpecHash || {};
    if (!version || !hash.screen || !hash.layout || !hash.skin) {
      addViolation(violations, 'H2U-P4-022', {
        summary: 'capture report is missing runtime version or runtime spec hashes',
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`,
      });
    }
  }
}

function validateRadarGeometryFromSummary(repoRoot, summary, violations) {
  const paths = summary.paths || {};
  const candidates = [
    paths.finalLayout,
    summary.runtimeAuthority && summary.runtimeAuthority.layout,
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
        evidence: `${relative(repoRoot, filePath)} ${nodePath}`,
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
  if (!meta.textBox && !((meta.labels || []).every(label => label && label.box && label.box.width && label.box.height))) missing.push('textBox');
  return missing;
}

function detectTabbedSource(sourceHtml, summary) {
  const html = String(sourceHtml || '');
  if (/role\s*=\s*["']tab|data-tab|aria-controls|data-ucuf-tab-content|tab-content|switchTab/i.test(html)) return true;
  const readiness = summary.metrics && summary.metrics.runtimeReadiness;
  return !!(readiness && readiness.stats && readiness.stats.hasTabbedSource);
}

function detectInteractionRequired(sourceHtml, summary) {
  const html = String(sourceHtml || '');
  if (/data-ucuf-action|tabSwitch|switchTab|pool-prev|pool-next|aria-controls|data-tab/i.test(html)) return true;
  const interactionRuntime = summary && summary.interactionRuntime;
  if (interactionRuntime && interactionRuntime.required === true) return true;
  const paths = summary && summary.paths || {};
  return !!(paths.interaction || paths.finalInteraction || paths.runtimeInteraction);
}

function findLineMatches(text, patterns) {
  const out = [];
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const item of patterns) {
      if (item.pattern.test(line)) out.push({ line: index + 1, label: item.label });
    }
  });
  return out;
}

function buildViolation(ruleId, detail) {
  const rule = getRule(ruleId) || {};
  return {
    ruleId,
    slug: rule.slug || null,
    severity: detail.severity || rule.severity || 'blocker',
    summary: detail.summary || rule.message || ruleId,
    evidence: detail.evidence || null,
    fixAction: detail.fixAction || rule.fixAction || null,
    owner: rule.owner || null,
  };
}

function addViolation(out, ruleId, detail) {
  out.push(buildViolation(ruleId, detail || {}));
}

function readTextIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch (_) {
    return '';
  }
}

function readJsonIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    return null;
  }
}

function walkJson(node, visit, currentPath = '$') {
  if (!node || typeof node !== 'object') return;
  visit(node, currentPath);
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child, index) => walkJson(child, visit, `${currentPath}.children[${index}]`));
}

function relative(repoRoot, filePath) {
  return path.relative(repoRoot, path.resolve(filePath)).replace(/\\/g, '/');
}

module.exports = {
  runRuleGuard,
  missingRadarGeometryFields,
  DEFAULT_CORE_FILES,
};
