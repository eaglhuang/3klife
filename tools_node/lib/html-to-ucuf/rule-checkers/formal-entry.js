'use strict';

// formal-entry.js — H2U-P4-001~009、P4-018~019、P4-021~023、P4-025~028 等工作流正式入口驗證。
// validateWorkflowSummary 是 rule-guard.js 的主要呼叫入口。

const path = require('path');
const {
  addViolation,
  buildViolation,
  detectTabbedSource,
  detectInteractionRequired,
  relative
} = require('./base');

// 延遲 require 避免循環引用（workflow-summary 也可能 require base）
function _workflowSummaryMod() {
  return require('./workflow-summary');
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

  const wsMod = _workflowSummaryMod();
  wsMod.validateTokenGovernance(repoRoot, summary, violations);
  wsMod.validatePlan5Summary(repoRoot, summary, violations);
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

module.exports = {
  validateWorkflowSummary,
  validateCaptureReportArtifact
};

