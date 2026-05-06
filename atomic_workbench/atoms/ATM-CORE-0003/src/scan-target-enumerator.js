'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_INCLUDE_GLOBS = ['**/*.js', '**/*.ts', '**/*.json', '**/*.md'];
const DEFAULT_EXCLUDE_GLOBS = ['node_modules/**', '.git/**'];

function toPosixPath(inputPath) {
  return String(inputPath || '').replace(/\\/g, '/');
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(glob) {
  const source = toPosixPath(glob)
    .split('**')
    .map((part) => part.split('*').map(escapeRegExp).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${source}$`, 'u');
}

function matchesAny(relativePath, globs) {
  return globs.some((glob) => globToRegExp(glob).test(relativePath));
}

function walkFiles(rootDir, currentDir, output) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(rootDir, fullPath, output);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    output.push({
      fullPath,
      relativePath: toPosixPath(path.relative(rootDir, fullPath)),
    });
  }
}

function enumerateScanTargets(options) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const includeGlobs = options.includeGlobs || DEFAULT_INCLUDE_GLOBS;
  const excludeGlobs = options.excludeGlobs || DEFAULT_EXCLUDE_GLOBS;
  const allFiles = [];
  walkFiles(rootDir, rootDir, allFiles);
  return allFiles
    .filter((target) => matchesAny(target.relativePath, includeGlobs))
    .filter((target) => !matchesAny(target.relativePath, excludeGlobs))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

module.exports = {
  enumerateScanTargets,
  globToRegExp,
  toPosixPath,
};