'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_TAXONOMY_PATH = path.join(__dirname, 'workflow-path-taxonomy.json');

function loadWorkflowPathTaxonomy(filePath = DEFAULT_TAXONOMY_PATH) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function listWorkflowPathClasses(taxonomy = loadWorkflowPathTaxonomy()) {
  return Array.isArray(taxonomy.classes) ? taxonomy.classes : [];
}

function classifyWorkflowPath(input, taxonomy = loadWorkflowPathTaxonomy()) {
  const context = normalizeClassificationInput(input || {});
  const classes = listWorkflowPathClasses(taxonomy)
    .slice()
    .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
  const evaluations = classes.map((definition, index) => evaluateClass(definition, context, index));
  const matched = evaluations.filter((entry) => entry.matched);
  const primary = matched[0] || null;

  return {
    taxonomyVersion: taxonomy.schemaVersion || 'workflow-path-taxonomy/v1',
    defaultClass: taxonomy && taxonomy.decisionModel ? taxonomy.decisionModel.defaultClass || 'unclassified' : 'unclassified',
    classId: primary ? primary.classId : 'unclassified',
    label: primary ? primary.label : 'Unclassified',
    matched: !!primary,
    matchedPredicates: primary ? primary.matchedPredicates : 0,
    evaluationOrder: evaluations.map((entry) => entry.classId),
    evidence: primary ? primary.evidence : [],
    risks: primary ? primary.risks : [],
    rationale: primary ? primary.description : 'No class matched the deterministic evidence rules.',
    candidates: evaluations,
  };
}

function normalizeClassificationInput(input) {
  const finalizeResult = input.finalizeResult && typeof input.finalizeResult === 'object'
    ? input.finalizeResult
    : null;
  const turnArtifact = input.turnArtifact && typeof input.turnArtifact === 'object'
    ? input.turnArtifact
    : finalizeResult && finalizeResult.turnArtifact && typeof finalizeResult.turnArtifact === 'object'
      ? finalizeResult.turnArtifact
      : {};
  const traceSummary = normalizeTraceSummary(
    input.traceSummary
    || input.traceArtifact
    || (finalizeResult && finalizeResult.traceSummary)
    || null,
  );

  return {
    turnArtifact,
    traceSummary,
    projectRoot: input.projectRoot || PROJECT_ROOT,
  };
}

function normalizeTraceSummary(input) {
  if (!input || typeof input !== 'object') {
    return {};
  }
  if (input.summary && typeof input.summary === 'object') {
    return input.summary;
  }
  return input;
}

function evaluateClass(definition, context, declarationIndex) {
  const match = definition && definition.match && typeof definition.match === 'object' ? definition.match : {};
  const allResults = evaluatePredicateGroup(match.all, context, true);
  const anyPredicates = Array.isArray(match.any) ? match.any : [];
  const anyResults = anyPredicates.length > 0 ? evaluatePredicateGroup(anyPredicates, context, false) : [];
  const noneResults = evaluatePredicateGroup(match.none, context, false);

  const allPassed = allResults.every((entry) => entry.passed);
  const anyPassed = anyPredicates.length === 0 || anyResults.some((entry) => entry.passed);
  const nonePassed = noneResults.every((entry) => !entry.passed);
  const matched = allPassed && anyPassed && nonePassed;
  const evidence = matched
    ? [...allResults, ...anyResults.filter((entry) => entry.passed), ...noneResults.filter((entry) => !entry.passed)]
        .map((entry) => ({
          field: entry.field,
          operator: entry.operator,
          expected: entry.expected,
          actual: entry.actual,
        }))
    : [];

  return {
    classId: definition.id,
    label: definition.label,
    priority: Number(definition.priority || 0),
    declarationIndex,
    matched,
    matchedPredicates: evidence.length,
    evidence,
    risks: Array.isArray(definition.risks) ? definition.risks : [],
    description: definition.description || '',
  };
}

function evaluatePredicateGroup(predicates, context, requireAll) {
  const list = Array.isArray(predicates) ? predicates : [];
  const results = list.map((predicate) => evaluatePredicate(predicate, context));
  if (!requireAll) {
    return results;
  }
  return results;
}

function evaluatePredicate(predicate, context) {
  const field = String(predicate && predicate.field || '');
  const operator = String(predicate && predicate.op || '');
  const expected = predicate ? predicate.value : undefined;
  const actual = readEvidenceField(context, field);
  const passed = runOperator(operator, actual, expected);
  return {
    field,
    operator,
    expected,
    actual,
    passed,
  };
}

function readEvidenceField(context, field) {
  switch (field) {
    case 'turnArtifact.workflow':
      return stringOrEmpty(context.turnArtifact && context.turnArtifact.workflow);
    case 'turnArtifact.task':
      return stringOrEmpty(context.turnArtifact && context.turnArtifact.task);
    case 'turnArtifact.files[].path':
      return collectPaths(context.turnArtifact && context.turnArtifact.files, 'path');
    case 'turnArtifact.source.explicitFiles':
      return arrayOfStrings(context.turnArtifact && context.turnArtifact.source && context.turnArtifact.source.explicitFiles);
    case 'trace.summary.tools':
      return arrayOfStrings(context.traceSummary && context.traceSummary.tools);
    case 'trace.summary.errorCount':
      return numberOrZero(context.traceSummary && context.traceSummary.errorCount);
    case 'trace.summary.retryCount':
      return numberOrZero(context.traceSummary && context.traceSummary.retryCount);
    case 'trace.summary.totalDurationMs':
      return numberOrZero(context.traceSummary && context.traceSummary.totalDurationMs);
    default:
      return undefined;
  }
}

function runOperator(operator, actual, expected) {
  switch (operator) {
    case 'regex':
      return regexTest(actual, expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'arrayIncludesAny':
      return arrayIncludesAny(actual, expected);
    case 'arrayAnyStartsWith':
      return arrayAnyStartsWith(actual, expected);
    case 'arrayAllStartsWith':
      return arrayAllStartsWith(actual, expected);
    default:
      throw new Error(`unsupported workflow taxonomy operator: ${operator}`);
  }
}

function regexTest(actual, expected) {
  if (typeof actual !== 'string') {
    return false;
  }
  return new RegExp(String(expected), 'i').test(actual);
}

function arrayIncludesAny(actual, expected) {
  const values = arrayOfStrings(actual).map((item) => item.toLowerCase());
  return arrayOfStrings(expected).some((candidate) => values.includes(candidate.toLowerCase()));
}

function arrayAnyStartsWith(actual, expected) {
  const values = arrayOfStrings(actual);
  const prefixes = arrayOfStrings(expected);
  return values.some((entry) => prefixes.some((prefix) => startsWithNormalized(entry, prefix)));
}

function arrayAllStartsWith(actual, expected) {
  const values = arrayOfStrings(actual);
  const prefixes = arrayOfStrings(expected);
  if (values.length === 0) {
    return false;
  }
  return values.every((entry) => prefixes.some((prefix) => startsWithNormalized(entry, prefix)));
}

function startsWithNormalized(entry, prefix) {
  if (entry === prefix) {
    return true;
  }
  if (!prefix.endsWith('/')) {
    return entry.startsWith(`${prefix}/`);
  }
  return entry.startsWith(prefix);
}

function collectPaths(entries, key) {
  return Array.isArray(entries)
    ? entries
        .map((entry) => entry && entry[key])
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
}

function arrayOfStrings(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

module.exports = {
  DEFAULT_TAXONOMY_PATH,
  loadWorkflowPathTaxonomy,
  listWorkflowPathClasses,
  classifyWorkflowPath,
  normalizeClassificationInput,
};