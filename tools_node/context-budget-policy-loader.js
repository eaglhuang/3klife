'use strict';

const fs = require('fs');
const path = require('path');

function resolvePolicyPath(projectRoot, policyPath) {
  const root = projectRoot ? path.resolve(projectRoot) : path.resolve(__dirname, '..');
  if (policyPath) {
    return path.isAbsolute(policyPath) ? policyPath : path.resolve(root, policyPath);
  }
  return path.join(root, '.atm', 'context-budget-policy.json');
}

function loadContextBudgetPolicy(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const resolvedPath = resolvePolicyPath(projectRoot, options.policyPath);
  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  const policy = raw.policy && typeof raw.policy === 'object' ? raw.policy : raw;
  const thresholds = policy.thresholds && typeof policy.thresholds === 'object' ? policy.thresholds : {};
  const scan = policy.scan && typeof policy.scan === 'object' ? policy.scan : {};
  const routing = policy.routing && typeof policy.routing === 'object' ? policy.routing : {};
  const output = policy.output && typeof policy.output === 'object' ? policy.output : {};

  return {
    sourcePath: resolvedPath,
    profile: raw,
    policy,
    thresholds: {
      warningTokens: Number.isFinite(thresholds.warningTokens) ? thresholds.warningTokens : 6000,
      summarizeTokens: Number.isFinite(thresholds.summarizeTokens) ? thresholds.summarizeTokens : 18000,
      hardStopTokens: Number.isFinite(thresholds.hardStopTokens) ? thresholds.hardStopTokens : 30000,
      maxInlineArtifacts: Number.isFinite(thresholds.maxInlineArtifacts) ? thresholds.maxInlineArtifacts : 2,
      imageWarningCount: Number.isFinite(thresholds.imageWarningCount) ? thresholds.imageWarningCount : 2,
      imageWarningBytes: Number.isFinite(thresholds.imageWarningBytes) ? thresholds.imageWarningBytes : 4 * 1024 * 1024,
    },
    scan: {
      textExtensions: Array.isArray(scan.textExtensions) ? scan.textExtensions : [],
      imageExtensions: Array.isArray(scan.imageExtensions) ? scan.imageExtensions : [],
      defaultScanDirs: Array.isArray(scan.defaultScanDirs) ? scan.defaultScanDirs : [],
    },
    routing: {
      largeDocumentStrategy: routing.largeDocumentStrategy || 'summarize-first',
      structuredDiffStrategy: routing.structuredDiffStrategy || 'summarize-before-read',
      imageStrategy: routing.imageStrategy || 'thumbnail-first',
    },
    output: {
      topRiskFiles: Number.isFinite(output.topRiskFiles) ? output.topRiskFiles : 20,
      emitKeepNoteOnWarn: output.emitKeepNoteOnWarn !== false,
    },
  };
}

module.exports = {
  loadContextBudgetPolicy,
  resolvePolicyPath,
};