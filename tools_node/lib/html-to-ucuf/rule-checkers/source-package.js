'use strict';

const path = require('path');
const {
  RULE_REGISTRY,
  DEFAULT_CORE_FILES,
  FORBIDDEN_SCREEN_PATTERNS,
  addViolation,
  extractFunctionBody,
  findLineMatches,
  readTextIfExists
} = require('./base');

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
  const normalized = String(text || '').replace(/\\/g, '/');
  const currentExecutionSpec = String(RULE_REGISTRY.currentExecutionSpec || '').replace(/\\/g, '/').toLowerCase();
  const hasCurrentSpec = /current execution spec/i.test(normalized)
    && Boolean(currentExecutionSpec)
    && normalized.toLowerCase().includes(currentExecutionSpec);
  const mentionsRegistry = /tools_node\/lib\/html-to-ucuf\/rule-registry\.json|rule-registry\.json/i.test(normalized);
  const plan4AsCurrent = /(Plan 4|Plan4)[^\n]{0,80}current execution spec/i.test(normalized);
  if (!hasCurrentSpec || !mentionsRegistry || plan4AsCurrent) {
    addViolation(violations, 'H2U-P5-001', {
      summary: 'skill doc does not point to current-roadmap + rule-registry.json as the current governance source',
      evidence: RULE_REGISTRY.skillDocPath || '.github/skills/html-to-ucuf/SKILL.md'
    });
  }
}

module.exports = {
  scanCoreSource,
  scanSkillDoc
};
