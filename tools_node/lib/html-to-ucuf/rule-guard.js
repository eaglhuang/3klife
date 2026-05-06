// HTML-to-UCUF rule guard engine.
// 這裡只負責組裝 registry 與 checker；正式規則真相在 rule-registry.json。
'use strict';

const path = require('path');
const {
  RULE_REGISTRY,
  DEFAULT_CORE_FILES,
  listRules,
  loadWorkflowSummary,
  loadSourceHtml,
  loadCaptureReport,
  scanCoreSource,
  scanSkillDoc,
  scanDraftBuilderRegistry,
  validateDraftBuilderStageRules,
  validatePlan5RegistryContracts,
  validateWorkflowSummary,
  validateCaptureReportArtifact,
  validateRadarGeometryFromSummary,
  validateRadarGeometryInFile,
  missingRadarGeometryFields
} = require('./rule-checkers');

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
    validateDraftBuilderStageRules(repoRoot, violations);
    validatePlan5RegistryContracts(violations);
  }
  if (workflowSummary) {
    validateWorkflowSummary(repoRoot, workflowSummary, sourceHtml, violations, warnings);
    validateRadarGeometryFromSummary(repoRoot, workflowSummary, violations);
  }
  if (captureReport) {
    validateCaptureReportArtifact(captureReport, {
      expectedScreenId: opts.expectedScreenId || workflowSummary && workflowSummary.screenId || '',
      violations
    });
  }
  if (opts.layout) {
    validateRadarGeometryInFile(repoRoot, path.resolve(opts.layout), violations);
  }

  const blockerCount = violations.filter((item) => item.severity === 'blocker').length;
  const warningCount = warnings.length + violations.filter((item) => item.severity === 'warning').length;
  const status = blockerCount > 0 ? 'blocker' : (warningCount > 0 ? 'warning' : 'pass');
  const allViolations = violations.concat(warnings);

  return {
    schemaVersion: RULE_REGISTRY.schemaVersion || '1.0.0',
    registryId: RULE_REGISTRY.registryId || 'html-to-ucuf-rules',
    currentExecutionSpec: RULE_REGISTRY.currentExecutionSpec || null,
    generatedAt: new Date().toISOString(),
    status,
    blockerCount,
    warningCount,
    violations: allViolations,
    rules: listRules().map((rule) => ({
      id: rule.id,
      slug: rule.slug,
      severity: rule.severity,
      status: rule.status,
      checkerId: rule.checkerId || null,
      aliasOf: rule.aliasOf || null,
      replacedBy: rule.replacedBy || null,
      result: resolveRuleResult(rule, allViolations)
    }))
  };
}

function resolveRuleResult(rule, violations) {
  const failed = violations.some((item) => item.ruleId === rule.id);
  if (failed) return 'failed';
  if (rule.status === 'deprecated') return 'deprecated';
  if (rule.status === 'advisory') return 'advisory';
  if (rule.status === 'alias') {
    const aliases = Array.isArray(rule.aliasOf) ? rule.aliasOf : (rule.aliasOf ? [rule.aliasOf] : []);
    return aliases.some((ruleId) => violations.some((item) => item.ruleId === ruleId)) ? 'failed' : 'passed';
  }
  return 'passed';
}

module.exports = {
  runRuleGuard,
  missingRadarGeometryFields,
  DEFAULT_CORE_FILES
};
