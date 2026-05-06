'use strict';

const path = require('path');

function hasNonAsciiFilename(relativePath) {
  const basename = path.posix.basename(String(relativePath || '').replace(/\\/g, '/'));
  return /[^\x00-\x7F]/u.test(basename);
}

function pathMatchesPattern(relativePath, pattern) {
  const normalizedPath = String(relativePath || '').replace(/\\/g, '/');
  if (pattern.normalized === '<non-ascii-filename>') {
    return hasNonAsciiFilename(normalizedPath);
  }
  return normalizedPath.includes(pattern.normalized);
}

function scanPathPatterns(options) {
  const targets = options.targets || [];
  const lexicon = options.lexicon || { forbiddenPathPatterns: [] };
  const violations = [];
  for (const target of targets) {
    for (const pattern of lexicon.forbiddenPathPatterns) {
      if (!pathMatchesPattern(target.relativePath, pattern)) {
        continue;
      }
      violations.push({
        sourceAtom: 'ATM-CORE-0003-D',
        type: 'path',
        file: target.relativePath,
        matchedRule: pattern.raw,
      });
    }
  }
  return violations.sort((left, right) => `${left.file}:${left.matchedRule}`.localeCompare(`${right.file}:${right.matchedRule}`));
}

module.exports = {
  hasNonAsciiFilename,
  scanPathPatterns,
};