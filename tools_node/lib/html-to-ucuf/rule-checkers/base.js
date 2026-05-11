'use strict';

const fs = require('fs');
const path = require('path');
const RULE_REGISTRY = require('../rule-registry.json');

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

function firstNonEmpty() {
  for (const value of arguments) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function dimensionPassed(entry) {
  if (entry === true) return true;
  if (!entry || typeof entry !== 'object') return false;
  return entry.pass === true || entry.status === 'pass';
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

function compareVersions(a, b) {
  const parse = (value) => String(value || '').replace(/^v/i, '').split('.').map((part) => parseInt(part, 10) || 0);
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
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

module.exports = {
  RULE_REGISTRY,
  DEFAULT_CORE_FILES,
  FORBIDDEN_SCREEN_PATTERNS,
  listRules,
  getRule,
  getDraftBuilderStageRules,
  getFidelityThresholds,
  getExemptCategories,
  getKnownGaps,
  buildViolation,
  addViolation,
  loadWorkflowSummary,
  loadSourceHtml,
  loadCaptureReport,
  extractFunctionBody,
  detectTabbedSource,
  detectInteractionRequired,
  findLineMatches,
  readTextIfExists,
  readJsonIfExists,
  walkJson,
  relative,
  readNumber,
  firstNonEmpty,
  dimensionPassed,
  isZoneExcludedFromScore,
  compareVersions
};
