#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadEncodingProfile, validateEncodingProfile } = require('../tools_node/encoding-profile-loader');

function countOccurrences(text, fragments) {
  return (Array.isArray(fragments) ? fragments : []).reduce((total, fragment) => {
    if (!fragment) {
      return total;
    }
    return total + (String(text || '').split(fragment).length - 1);
  }, 0);
}

function compileForbiddenPatterns(policy) {
  return (Array.isArray(policy.forbiddenPatterns) ? policy.forbiddenPatterns : []).map((rule) => ({
    message: rule.message || 'Forbidden pattern detected.',
    pathRegex: new RegExp(rule.pathPattern, 'u'),
    contentRegex: new RegExp(rule.regex, 'u'),
  }));
}

function analyzeBuffer(buffer, policy, relativePath = '') {
  const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  const textBuffer = hasBom ? buffer.subarray(3) : buffer;
  const text = textBuffer.toString('utf8');
  const roundTripBuffer = Buffer.from(text, 'utf8');
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const latinMojibakeCount = countOccurrences(text, policy.latinMojibakeFragments);
  const weirdCjkCount = countOccurrences(text, policy.weirdCjkFragments);
  const suspiciousRatio = text.length > 0 ? latinMojibakeCount / text.length : 0;

  const issues = [];

  if (!textBuffer.equals(roundTripBuffer)) {
    issues.push('non-utf8-decode');
  }
  if (hasBom) {
    issues.push('utf8-bom');
  }
  if (replacementCount > 0) {
    issues.push('replacement-char');
  }

  const exceedsLatinHeuristic = latinMojibakeCount >= policy.latinMojibakeMinCount
    && suspiciousRatio >= policy.latinMojibakeMinRatio;
  const exceedsWeirdCjkHeuristic = weirdCjkCount >= policy.weirdCjkMinCount;
  if (exceedsLatinHeuristic || exceedsWeirdCjkHeuristic) {
    issues.push('mojibake-pattern');
  }

  const forbiddenPatterns = compileForbiddenPatterns(policy);
  for (const rule of forbiddenPatterns) {
    if (rule.pathRegex.test(relativePath) && rule.contentRegex.test(text)) {
      issues.push('forbidden-pattern');
      break;
    }
  }

  return {
    hasBom,
    replacementCount,
    latinMojibakeCount,
    weirdCjkCount,
    suspiciousRatio,
    issues,
  };
}

function analyzeFile(filePath, policy) {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  return analyzeBuffer(buffer, policy, String(filePath || '').replace(/\\/g, '/'));
}

function usage() {
  console.log('Usage: node .atm/encoding-guard-validator.js [--profile <path>] [--self-test] [--files <path...>]');
}

function parseArgs(argv) {
  const options = {
    profilePath: null,
    selfTest: false,
    files: [],
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--self-test') {
      options.selfTest = true;
      continue;
    }
    if (token === '--profile' && index + 1 < argv.length) {
      options.profilePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--files') {
      while (index + 1 < argv.length && !String(argv[index + 1]).startsWith('--')) {
        options.files.push(argv[index + 1]);
        index += 1;
      }
    }
  }

  return options;
}

function runSelfTest(policy) {
  const samples = [
    {
      name: 'utf8-bom',
      buffer: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('clean sample', 'utf8')]),
      expected: ['utf8-bom'],
    },
    {
      name: 'replacement-char',
      buffer: Buffer.from('bad\uFFFDsample', 'utf8'),
      expected: ['replacement-char'],
    },
    {
      name: 'mojibake-pattern',
      buffer: Buffer.from('ÃÃÃ legacy mojibake', 'utf8'),
      expected: ['mojibake-pattern'],
    },
    {
      name: 'clean-sample',
      buffer: Buffer.from('encoding guard baseline', 'utf8'),
      expected: [],
    },
    {
      name: 'forbidden-pattern',
      buffer: Buffer.from('{"title":"DC-0 ????"}', 'utf8'),
      relativePath: 'docs/ui-quality-tasks/phase-demo.json',
      expected: ['forbidden-pattern'],
    },
  ];

  const failures = [];
  for (const sample of samples) {
    const result = analyzeBuffer(sample.buffer, policy, sample.relativePath || 'self-test/sample.txt');
    const issueSet = new Set(result.issues);
    const expectedSet = new Set(sample.expected);
    const matches = result.issues.length === sample.expected.length
      && sample.expected.every((issue) => issueSet.has(issue))
      && result.issues.every((issue) => expectedSet.has(issue));
    if (!matches) {
      failures.push(`${sample.name}: expected ${sample.expected.join(', ') || 'none'} but got ${result.issues.join(', ') || 'none'}`);
    }
  }

  return failures;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }

  const profile = loadEncodingProfile({ profilePath: options.profilePath, projectRoot: path.resolve(__dirname, '..') });
  const profileCheck = validateEncodingProfile(profile);
  if (!profileCheck.ok) {
    console.error('[encoding-profile] Invalid profile:');
    for (const error of profileCheck.errors) {
      console.error(`  error: ${error}`);
    }
    process.exit(1);
  }

  const policy = profileCheck.policy;

  if (options.selfTest) {
    const failures = runSelfTest(policy);
    if (failures.length > 0) {
      console.error('[encoding-profile] Self-test failed:');
      for (const failure of failures) {
        console.error(`  error: ${failure}`);
      }
      process.exit(1);
    }
    console.log('[encoding-profile] Self-test passed.');
    process.exit(0);
  }

  const files = Array.from(new Set(options.files.map((filePath) => String(filePath || '').trim()).filter(Boolean)));
  if (files.length === 0) {
    console.log('[encoding-profile] Profile validation passed.');
    process.exit(0);
  }

  const issues = [];
  for (const filePath of files) {
    const result = analyzeFile(filePath, policy);
    if (result.issues.length > 0) {
      issues.push(`${filePath}: ${result.issues.join(', ')}`);
    }
  }

  if (issues.length > 0) {
    console.error('[encoding-profile] Sample validation failed:');
    for (const issue of issues) {
      console.error(`  error: ${issue}`);
    }
    process.exit(1);
  }

  console.log('[encoding-profile] Sample validation passed.');
}

main();