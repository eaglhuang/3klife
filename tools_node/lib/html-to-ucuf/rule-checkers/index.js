'use strict';

// index.js — re-export all rule-checkers 子模組，維持 rule-guard.js 的 require('./rule-checkers') API 不變。
// 外部呼叫者不需修改任何 require 路徑。

const base = require('./base');
const sourcePackage = require('./source-package');
const draftBuilder = require('./draft-builder');
const workflowSummary = require('./workflow-summary');
const formalEntry = require('./formal-entry');

module.exports = {
  // ─ base: registry & tools ─
  RULE_REGISTRY: base.RULE_REGISTRY,
  DEFAULT_CORE_FILES: base.DEFAULT_CORE_FILES,
  listRules: base.listRules,
  getRule: base.getRule,
  getDraftBuilderStageRules: base.getDraftBuilderStageRules,
  getFidelityThresholds: base.getFidelityThresholds,
  getExemptCategories: base.getExemptCategories,
  getKnownGaps: base.getKnownGaps,
  buildViolation: base.buildViolation,
  addViolation: base.addViolation,
  loadWorkflowSummary: base.loadWorkflowSummary,
  loadSourceHtml: base.loadSourceHtml,
  loadCaptureReport: base.loadCaptureReport,
  readTextIfExists: base.readTextIfExists,
  readJsonIfExists: base.readJsonIfExists,
  relative: base.relative,

  // ─ source-package ─
  scanCoreSource: sourcePackage.scanCoreSource,
  scanSkillDoc: sourcePackage.scanSkillDoc,

  // ─ draft-builder ─
  scanDraftBuilderRegistry: draftBuilder.scanDraftBuilderRegistry,
  validateDraftBuilderStageRules: draftBuilder.validateDraftBuilderStageRules,

  // ─ workflow-summary ─
  validatePlan5RegistryContracts: workflowSummary.validatePlan5RegistryContracts,
  validateRadarGeometryFromSummary: workflowSummary.validateRadarGeometryFromSummary,
  validateRadarGeometryInFile: workflowSummary.validateRadarGeometryInFile,
  missingRadarGeometryFields: workflowSummary.missingRadarGeometryFields,

  // ─ formal-entry ─
  validateWorkflowSummary: formalEntry.validateWorkflowSummary,
  validateCaptureReportArtifact: formalEntry.validateCaptureReportArtifact
};
