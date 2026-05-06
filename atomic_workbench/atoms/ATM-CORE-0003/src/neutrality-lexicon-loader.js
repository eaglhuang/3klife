'use strict';

const DEFAULT_FORBIDDEN_TERMS = [
  '3KLife',
  'Cocos',
  'cocos-creator',
  'html-to-ucuf',
  'gacha',
  'UCUF',
  'draft-builder',
  'eaglhuang/3KLife',
];

const DEFAULT_FORBIDDEN_PATH_PATTERNS = [
  'tools_node/',
  'assets/scripts/',
  '<non-ascii-filename>',
];

function normalizeTerm(term) {
  return String(term || '').trim().toLowerCase();
}

function normalizePathPattern(pattern) {
  return String(pattern || '').trim().replace(/\\/g, '/');
}

function loadNeutralityLexicon(options = {}) {
  const forbiddenTerms = options.forbiddenTerms || DEFAULT_FORBIDDEN_TERMS;
  const forbiddenPathPatterns = options.forbiddenPathPatterns || DEFAULT_FORBIDDEN_PATH_PATTERNS;
  return {
    atomId: 'ATM-CORE-0003-B',
    forbiddenTerms: forbiddenTerms.map((term) => ({
      raw: term,
      normalized: normalizeTerm(term),
    })).filter((term) => term.normalized.length > 0),
    forbiddenPathPatterns: forbiddenPathPatterns.map((pattern) => ({
      raw: pattern,
      normalized: normalizePathPattern(pattern),
    })).filter((pattern) => pattern.normalized.length > 0),
  };
}

module.exports = {
  DEFAULT_FORBIDDEN_PATH_PATTERNS,
  DEFAULT_FORBIDDEN_TERMS,
  loadNeutralityLexicon,
  normalizePathPattern,
  normalizeTerm,
};