'use strict';

const fs = require('fs');
const path = require('path');

const { enumerateScanTargets } = require('./scan-target-enumerator');
const { loadNeutralityLexicon } = require('./neutrality-lexicon-loader');
const { scanTextTerms } = require('./text-term-scanner');
const { scanPathPatterns } = require('./path-pattern-scanner');
const { aggregateNeutralityReport } = require('./neutrality-report-aggregator');

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runNeutralityMap(options) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const lexicon = loadNeutralityLexicon(options.lexicon || {});
  const targets = enumerateScanTargets({
    rootDir,
    includeGlobs: options.includeGlobs,
    excludeGlobs: options.excludeGlobs,
  });
  const termViolations = scanTextTerms({ targets, lexicon });
  const pathViolations = scanPathPatterns({ targets, lexicon });
  const report = aggregateNeutralityReport({
    rootDir,
    targetCount: targets.length,
    ruleCount: lexicon.forbiddenTerms.length + lexicon.forbiddenPathPatterns.length,
    termViolations,
    pathViolations,
  });
  if (options.outputPath) {
    ensureParentDir(options.outputPath);
    fs.writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}

function parseArgs(argv) {
  const parsed = { rootDir: process.cwd(), outputPath: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--root') {
      parsed.rootDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--output') {
      parsed.outputPath = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return parsed;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  const report = runNeutralityMap(options);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
}

module.exports = {
  runNeutralityMap,
};