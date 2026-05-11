'use strict';

// draft-builder.js — 驗證 dom-to-ui/draft-builder.js 是否正確綁定 registry-backed stage rules。
// 對應規則：H2U-P4-012 等 draft-builder 階段規則。

const path = require('path');
const {
  addViolation,
  readTextIfExists,
  getDraftBuilderStageRules,
  listRules
} = require('./base');

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

module.exports = {
  scanDraftBuilderRegistry,
  validateDraftBuilderStageRules
};
