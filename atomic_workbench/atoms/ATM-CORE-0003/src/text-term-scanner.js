'use strict';

const fs = require('fs');

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

function scanTextTerms(options) {
  const targets = options.targets || [];
  const lexicon = options.lexicon || { forbiddenTerms: [] };
  const violations = [];
  for (const target of targets) {
    const content = fs.readFileSync(target.fullPath, 'utf8');
    const normalizedContent = content.toLowerCase();
    for (const term of lexicon.forbiddenTerms) {
      const index = normalizedContent.indexOf(term.normalized);
      if (index < 0) {
        continue;
      }
      violations.push({
        sourceAtom: 'ATM-CORE-0003-C',
        type: 'term',
        file: target.relativePath,
        matchedRule: term.raw,
        line: lineNumberForIndex(content, index),
      });
    }
  }
  return violations.sort((left, right) => `${left.file}:${left.matchedRule}`.localeCompare(`${right.file}:${right.matchedRule}`));
}

module.exports = {
  scanTextTerms,
};