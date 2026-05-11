'use strict';

const fs = require('fs');
const path = require('path');
const RULE_REGISTRY = require('./rule-registry.json');

const DEFAULT_CORE_FILES = [
  'tools_node/run-html-to-ucuf-workflow.js',
  'tools_node/render-html-tab-fragments.js',
  'tools_node/lib/dom-to-ui/sidecar-emitters.js',
  'tools_node/lib/dom-to-ui/readiness-gate.js',
  'tools_node/lib/dom-to-ui/draft-builder.js',
  'tools_node/validate-ui-specs.js'
];

const FORBIDDEN_SCREEN_PATTERNS = [
  { pattern: /\bcharacter-ds3\b/i, label: 'character-ds3' },
  { pattern: /\bCharacterDs3\b/, label: 'CharacterDs3' },
  { pattern: /\bgacha-ds3\b/i, label: 'gacha-ds3' },
  { pattern: /\bdiv_6\b/, label: 'div_6' },
  { pattern: /\bdiv_8\b/, label: 'div_8' },
  { pattern: /\bbutton_[4-9]\b/, label: 'button_4~9' },
  { pattern: /Design System 3[\\/]+colors_and_type\.css/i, label: 'Design System 3/colors_and_type.css fallback' }
];

function listRules() {
  return Array.isArray(RULE_REGISTRY.rules) ? RULE_REGISTRY.rules : [];
}

function getRule(ruleId) {
  return listRules().find((rule) => rule.id === ruleId) || null;
}

function getDraftBuilderStageRules() {
  return Array.isArray(RULE_REGISTRY.draftBuilderStageRules) ? RULE_REGISTRY.draftBuilderStageRules : [];
}

function getFidelityThresholds() {
  return RULE_REGISTRY && RULE_REGISTRY.fidelityThresholds && typeof RULE_REGISTRY.fidelityThresholds === 'object'
    ? RULE_REGISTRY.fidelityThresholds
    : null;
}

function getExemptCategories() {
  return Array.isArray(RULE_REGISTRY.exemptCategories) ? RULE_REGISTRY.exemptCategories : [];
}

function getKnownGaps() {
  return Array.isArray(RULE_REGISTRY.knownGaps) ? RULE_REGISTRY.knownGaps : [];
}

function buildViolation(ruleId, detail) {
  const rule = getRule(ruleId) || {};
  return {
    ruleId,
    slug: rule.slug || null,
    severity: detail && detail.severity || rule.severity || 'blocker',
    summary: detail && detail.summary || rule.message || ruleId,
    evidence: detail && detail.evidence || null,
    fixAction: detail && detail.fixAction || rule.fixAction || null,
    owner: rule.owner || null
  };
}

function addViolation(out, ruleId, detail) {
  out.push(buildViolation(ruleId, detail || {}));
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
  try {
    return fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
  } catch (_) {
    return '';
  }
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
        evidence: `${relPath}:${match.line}`
      });
    }
  }

  const workflowPath = path.join(repoRoot, 'tools_node', 'run-html-to-ucuf-workflow.js');
  const workflow = readTextIfExists(workflowPath);
  if (/preserveRawSidecarsWhenStrictReplayDropsInteractions|strict-replay-sidecar-repair/.test(workflow)) {
    addViolation(violations, 'H2U-P4-006', {
      summary: 'workflow still contains raw sidecar repair after strict replay',
      evidence: 'tools_node/run-html-to-ucuf-workflow.js'
    });
  }

  const readinessPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'readiness-gate.js');
  const readiness = readTextIfExists(readinessPath);
  if (/\$\{screenId\}-default|-default\.json/.test(readiness)) {
    addViolation(violations, 'H2U-P4-007', {
      summary: 'readiness gate still accepts <screenId>-default skin fallback',
      evidence: 'tools_node/lib/dom-to-ui/readiness-gate.js'
    });
  }

  const sidecarPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'sidecar-emitters.js');
  const sidecar = readTextIfExists(sidecarPath);
  if (/TAB_TARGET_TO_CHILD_PANEL|CharacterDs3[A-Za-z]*Child/.test(sidecar)) {
    addViolation(violations, 'H2U-P4-010', {
      summary: 'tab routing sidecar still uses hardcoded child panel mapping',
      evidence: 'tools_node/lib/dom-to-ui/sidecar-emitters.js'
    });
  }

  const draftBuilderPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder.js');
  const draftBuilder = readTextIfExists(draftBuilderPath);
  if (/\/[^/\n]*story\|[^/\n]*\/\.test|\/[^/\n]*\|story\|[^/\n]*\/\.test|\/[^/\n]*\|story[^/\n]*\/\.test/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-014', {
      summary: 'draft-builder still contains a bare story substring semantic classifier',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js'
    });
  }
  if (/slot\.story-strip/.test(draftBuilder) && !/story-strip-explicit-or-multi-signal|hasExplicitStoryStripSignal|hasStoryStripMultiSignal/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-015', {
      summary: 'story-strip emission is not guarded by explicit-or-multi-signal evidence',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js'
    });
  }
  if (/gradient\.type\s*!==\s*['"]linear['"]|using last linear-gradient layer; radial\/image overlays/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-016', {
      summary: 'background extraction still risks downgrading non-linear or multi-layer gradients',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js'
    });
  }
  if (/gradient\.type\s*!==\s*['"]linear['"]/.test(draftBuilder) && !/radial/.test(draftBuilder)) {
    addViolation(violations, 'H2U-P4-017', {
      summary: 'radial gradients are not preserved or explicitly blocked',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js'
    });
  }

  const runtimeSyncBody = extractFunctionBody(workflow, 'syncFinalArtifactsToRuntime');
  if (/sidecarPath\(paths\.rawLayout/.test(runtimeSyncBody)) {
    addViolation(violations, 'H2U-P4-020', {
      summary: 'runtime sync still allows raw sidecar fallback',
      evidence: 'tools_node/run-html-to-ucuf-workflow.js'
    });
  }

  const previewHostPath = path.join(repoRoot, 'assets', 'scripts', 'ui', 'components', 'UIScreenPreviewHost.ts');
  const previewHost = readTextIfExists(previewHostPath);
  if (previewHost && !(/loadScreenSidecar<[^>]*Interaction|loadScreenSidecar<PreviewInteractionSidecar/.test(previewHost)
    && /loadScreenSidecar<[^>]*TabRouting|loadScreenSidecar<PreviewTabRoutingSidecar/.test(previewHost)
    && /_bindSidecarInteractionAction|interactionRuntimeReport/.test(previewHost))) {
    addViolation(violations, 'H2U-P4-018', {
      summary: 'Preview runtime does not load and execute synced interaction/tab-routing sidecars',
      evidence: 'assets/scripts/ui/components/UIScreenPreviewHost.ts'
    });
  }
}

function extractFunctionBody(sourceText, functionName) {
  const source = String(sourceText || '');
  if (!source || !functionName) return '';
  const pattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = pattern.exec(source);
  if (!match) return '';
  let cursor = match.index + match[0].length;
  let depth = 1;
  while (cursor < source.length && depth > 0) {
    const ch = source[cursor];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    cursor += 1;
  }
  if (depth !== 0) return '';
  return source.slice(match.index, cursor);
}

function scanSkillDoc(repoRoot, violations) {
  const skillPath = path.join(repoRoot, RULE_REGISTRY.skillDocPath || '.github/skills/html-to-ucuf/SKILL.md');
  const text = readTextIfExists(skillPath);
  if (!text) {
    addViolation(violations, 'H2U-P5-001', {
      summary: 'html-to-ucuf skill file is missing',
      evidence: RULE_REGISTRY.skillDocPath || '.github/skills/html-to-ucuf/SKILL.md'
    });
    return;
  }
  const hasPlan5Current = /current execution spec/i.test(text) && /docs\/html_skill_plan5\.md/i.test(text);
  const mentionsRegistry = /tools_node\/lib\/html-to-ucuf\/rule-registry\.json|rule-registry\.json/i.test(text);
  const plan4AsCurrent = /(Plan 4|Plan4)[^\n]{0,80}current execution spec/i.test(text);
  if (!hasPlan5Current || !mentionsRegistry || plan4AsCurrent) {
    addViolation(violations, 'H2U-P5-001', {
      summary: 'skill doc does not point to Plan5 + rule-registry.json as the current governance source',
      evidence: RULE_REGISTRY.skillDocPath || '.github/skills/html-to-ucuf/SKILL.md'
    });
  }
}

function scanDraftBuilderRegistry(repoRoot, violations) {
  const text = readTextIfExists(path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder.js'));
  if (!/draftBuilderStageRules|ruleRegistry|rule-registry\.json/.test(text)) {
    addViolation(violations, 'H2U-P4-012', {
      summary: 'draft-builder has no registry-backed stage rule marker',
      evidence: 'tools_node/lib/dom-to-ui/draft-builder.js'
    });
  }
}

function validateDraftBuilderStageRules(repoRoot, violations) {
  const draftBuilderPath = path.join(repoRoot, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder.js');
  const text = readTextIfExists(draftBuilderPath);
  const stageRules = getDraftBuilderStageRules();
  const requiredStages = [
    'css-capture',
    'layout-extraction',
    'skin-extraction',
    'semantic-extraction',
    'composite-svg-extraction',
    'asset-mapping',
    'token-governance'
  ];
  const knownRuleIds = new Set(listRules().map((rule) => rule.id));
  const seenStages = new Set();
  const issues = [];

  if (!/draftBuilderStageRules\s*:\s*DRAFT_BUILDER_STAGE_RULES/.test(text)) {
    issues.push('draft-builder does not import registry-backed DRAFT_BUILDER_STAGE_RULES');
  }
  if (!/ruleRegistry\s*:\s*DRAFT_BUILDER_STAGE_RULES/.test(text)) {
    issues.push('draft-builder does not bind DRAFT_BUILDER_STAGE_RULES into build context');
  }
  if (!/draftStageRules\s*:\s*ctx\.ruleRegistry/.test(text)) {
    issues.push('draft-builder does not emit skinDraft.meta.draftStageRules');
  }
  if (stageRules.length === 0) {
    issues.push('rule-registry draftBuilderStageRules is empty');
  }

  stageRules.forEach((entry, index) => {
    const stage = typeof entry && entry && typeof entry.stage === 'string' ? entry.stage.trim() : '';
    if (!stage) {
      issues.push(`draftBuilderStageRules[${index}] missing stage`);
      return;
    }
    if (seenStages.has(stage)) {
      issues.push(`draftBuilderStageRules contains duplicate stage "${stage}"`);
    }
    seenStages.add(stage);

    const ruleIds = Array.isArray(entry.ruleIds)
      ? entry.ruleIds.map((ruleId) => String(ruleId || '').trim()).filter(Boolean)
      : [];
    const testTags = Array.isArray(entry.testTags)
      ? entry.testTags.map((tag) => String(tag || '').trim()).filter(Boolean)
      : [];

    if (ruleIds.length === 0) {
      issues.push(`${stage} missing ruleIds`);
    }
    if (testTags.length === 0) {
      issues.push(`${stage} missing testTags`);
    }

    const unknownRuleIds = ruleIds.filter((ruleId) => !knownRuleIds.has(ruleId));
    if (unknownRuleIds.length > 0) {
      issues.push(`${stage} references unknown ruleIds: ${unknownRuleIds.join(', ')}`);
    }
  });

  const missingStages = requiredStages.filter((stage) => !seenStages.has(stage));
  if (missingStages.length > 0) {
    issues.push(`missing required draft-builder stages: ${missingStages.join(', ')}`);
  }

  if (issues.length > 0) {
    addViolation(violations, 'H2U-P4-012', {
      summary: 'draftBuilderStageRules registry contract is incomplete or not emitted by draft-builder',
      evidence: issues.slice(0, 6).join('; '),
      fixAction: 'Sync rule-registry draftBuilderStageRules with draft-builder import/context/meta emission, and ensure every stage references real rule IDs.'
    });
  }
}

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

function validateWorkflowSummary(repoRoot, summary, sourceHtml, violations, warnings) {
  const debugOnly = summary.debugOnly === true;
  const reasons = Array.isArray(summary.debugOnlyReasons) ? summary.debugOnlyReasons : [];
  const sourcePackage = summary.sourcePackage || null;
  const hasSourcePackage = !!(sourcePackage && sourcePackage.mainHtml && sourcePackage.tokens && sourcePackage.css);
  const hasTabbedSource = detectTabbedSource(sourceHtml, summary);

  if (!hasSourcePackage && !debugOnly) {
    addViolation(violations, 'H2U-P4-001', {
      summary: 'single-file or incomplete source package produced a formal summary',
      evidence: 'workflowSummary.debugOnly=false'
    });
  }
  if ((reasons.includes('input-debug-entry') || !hasSourcePackage) && !debugOnly) {
    addViolation(violations, 'H2U-P4-001', {
      summary: '--input/debug entry was not marked debugOnly',
      evidence: 'workflowSummary.debugOnly=false'
    });
  }
  if ((reasons.includes('editor-compare-skipped') || reasons.includes('editor-screenshot-missing') || reasons.includes('capture-protocol-missing')) && !debugOnly) {
    addViolation(violations, 'H2U-P4-002', {
      summary: 'missing/skipped editor final gate was not marked debugOnly',
      evidence: `debugOnlyReasons=${reasons.join(',')}`
    });
  }
  if (reasons.includes('runtime-sync-disabled') && !debugOnly) {
    addViolation(violations, 'H2U-P4-003', {
      summary: '--no-runtime-sync was not marked debugOnly',
      evidence: `debugOnlyReasons=${reasons.join(',')}`
    });
  }

  const steps = Array.isArray(summary.steps) ? summary.steps : [];
  const perTabStep = steps.find((step) => step && step.step === 'per-tab-replay');
  if (hasTabbedSource) {
    if (!perTabStep || perTabStep.skipped || perTabStep.ok !== true || (perTabStep.fragmentCount || 0) <= 0) {
      addViolation(violations, 'H2U-P4-004', {
        summary: 'tabbed source did not finish per-tab replay with fragments',
        evidence: perTabStep ? JSON.stringify({
          skipped: perTabStep.skipped,
          ok: perTabStep.ok,
          fragmentCount: perTabStep.fragmentCount,
          reason: perTabStep.reason
        }) : 'missing per-tab-replay step'
      });
    }
  }

  if (steps.some((step) => step && step.step === 'strict-replay-sidecar-repair')) {
    addViolation(violations, 'H2U-P4-006', {
      summary: 'workflow summary recorded forbidden strict replay sidecar repair',
      evidence: 'steps[].step=strict-replay-sidecar-repair'
    });
  }

  const runtimeAuthority = summary.runtimeAuthority || {};
  if (summary.debugOnly !== true && runtimeAuthority.authority !== 'synced-final-runtime-json') {
    addViolation(violations, 'H2U-P4-008', {
      summary: 'formal summary is not using synced final runtime JSON as authority',
      evidence: `runtimeAuthority.authority=${runtimeAuthority.authority || 'missing'}`
    });
  }

  if (summary.debugOnly !== true && sourcePackage && (!sourcePackage.tokens || !sourcePackage.css)) {
    addViolation(violations, 'H2U-P4-009', {
      summary: 'formal source package is missing CSS or token authority',
      evidence: JSON.stringify({ tokens: sourcePackage.tokens || null, css: sourcePackage.css || null })
    });
  }

  const finalCapture = summary.finalCapture || {};
  const captureAuthority = finalCapture.authority || (summary.metrics && summary.metrics.htmlCocos && summary.metrics.htmlCocos.captureAuthority) || null;
  if (summary.debugOnly !== true && !finalCapture.captureReport) {
    addViolation(violations, 'H2U-P4-022', {
      summary: 'formal summary is missing final capture report authority',
      evidence: 'workflowSummary.finalCapture.captureReport=missing'
    });
  }
  if (captureAuthority) {
    if (Array.isArray(captureAuthority.violations) && captureAuthority.violations.length > 0) {
      for (const violation of captureAuthority.violations) {
        addViolation(violations, violation.ruleId || 'H2U-P4-021', {
          summary: violation.summary || 'capture authority violation',
          evidence: violation.evidence || JSON.stringify(captureAuthority),
          fixAction: violation.fixAction
        });
      }
    }
    if (captureAuthority.ok === false) {
      addViolation(violations, 'H2U-P4-021', {
        summary: 'final capture authority is not ok',
        evidence: JSON.stringify({
          expectedScreenId: captureAuthority.expectedScreenId || null,
          actualScreenId: captureAuthority.actualScreenId || null,
          captureMode: captureAuthority.captureMode || null
        })
      });
    }
  }

  if (summary.debugOnly !== true) {
    const visualFidelityRisk = summary.visualFidelityRisk || null;
    if (!visualFidelityRisk) {
      addViolation(violations, 'H2U-P4-019', {
        summary: 'formal summary is missing visualFidelityRisk',
        evidence: 'workflowSummary.visualFidelityRisk=missing'
      });
    } else if (visualFidelityRisk.status !== 'pass' || Number(visualFidelityRisk.blockerCount || 0) > 0) {
      addViolation(violations, 'H2U-P4-019', {
        summary: 'visualFidelityRisk blocks formal pass',
        evidence: JSON.stringify({
          status: visualFidelityRisk.status || null,
          blockerCount: visualFidelityRisk.blockerCount || 0
        })
      });
    }

    const interactionRequired = detectInteractionRequired(sourceHtml, summary);
    const interactionRuntime = summary.interactionRuntime || null;
    if (interactionRequired && (!interactionRuntime || interactionRuntime.status !== 'pass')) {
      addViolation(violations, 'H2U-P4-018', {
        summary: 'formal interaction sidecar is not executed by runtime smoke',
        evidence: interactionRuntime ? JSON.stringify({
          status: interactionRuntime.status || null,
          actionsBound: interactionRuntime.actionsBound || 0
        }) : 'workflowSummary.interactionRuntime=missing'
      });
    }
  }

  if (summary.environmentBlocked) {
    warnings.push(buildViolation('H2U-P4-002', {
      severity: 'warning',
      summary: 'environment-blocked: final/browser compare could not run in this environment',
      evidence: String(summary.environmentBlocked)
    }));
  }

  validateTokenGovernance(repoRoot, summary, violations);
  validatePlan5Summary(repoRoot, summary, violations);
}

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

function isZoneExcludedFromScore(zone) {
  if (!zone || typeof zone !== 'object') return false;
  const scoring = zone.scoring && typeof zone.scoring === 'object' ? zone.scoring : {};
  const treatments = [zone.treatment, zone.scoreTreatment, scoring.treatment]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return zone.excludedFromScore === true
    || zone.scoreExcluded === true
    || zone.exempted === true
    || scoring.excluded === true
    || scoring.skip === true
    || treatments.includes('exclude-from-score')
    || treatments.includes('assetize-then-pass')
    || treatments.includes('excluded');
}

function dimensionPassed(entry) {
  if (entry === true) return true;
  if (!entry || typeof entry !== 'object') return false;
  return entry.pass === true || entry.status === 'pass';
}

function firstNonEmpty() {
  for (const value of arguments) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

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

function compareVersions(a, b) {
  const parse = (value) => String(value || '').replace(/^v/i, '').split('.').map((part) => parseInt(part, 10) || 0);
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
      evidence: relative(process.cwd(), payload.filePath)
    });
    return;
  }
  const captures = Array.isArray(payload.report.captures) ? payload.report.captures : [];
  if (captures.length === 0) {
    addViolation(violations, 'H2U-P4-021', {
      summary: 'capture report has no captures',
      evidence: relative(process.cwd(), payload.filePath)
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
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`
      });
    }
    if (capture.captureMode !== 'formal-html-to-ucuf') {
      addViolation(violations, 'H2U-P4-023', {
        summary: `capture uses legacy or missing captureMode: ${capture.captureMode || '(missing)'}`,
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`
      });
    }
    const version = String(capture.runtimeVersion || capture.uiVersion || '').trim();
    const hash = capture.runtimeSpecHash || {};
    if (!version || !hash.screen || !hash.layout || !hash.skin) {
      addViolation(violations, 'H2U-P4-022', {
        summary: 'capture report is missing runtime version or runtime spec hashes',
        evidence: `${relative(process.cwd(), payload.filePath)} target=${capture.target || '(missing)'}`
      });
    }
  }
}

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

function readNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

// rule-checkers.js — thin shim：實際實作已拆入 rule-checkers/ 子目錄。
// rule-guard.js 等所有呼叫端的 require('./rule-checkers') 路徑不需任何修改。
module.exports = require('./rule-checkers/index');
