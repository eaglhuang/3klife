'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('./project-config');

const DEFAULT_UPSTREAM_REPO_NAME = 'upstream-atm-repo';
const UPSTREAM_CLI_RELATIVE_PATH = path.join('packages', 'cli', 'src', 'atm.mjs');
const UPSTREAM_REGISTRY_FILENAME = 'atomic-registry.json';

function uniquePaths(paths = []) {
  const seen = new Set();
  const out = [];
  for (const item of paths) {
    const value = String(item || '').trim();
    if (!value) {
      continue;
    }
    const normalized = path.resolve(value);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function hasUpstreamMarkers(repoRoot) {
  if (!repoRoot) {
    return false;
  }
  const root = path.resolve(repoRoot);
  const hasCli = fs.existsSync(path.join(root, UPSTREAM_CLI_RELATIVE_PATH));
  const hasRegistry = fs.existsSync(path.join(root, UPSTREAM_REGISTRY_FILENAME));
  return hasCli && hasRegistry;
}

function listSiblingDirectories(parentDir) {
  try {
    return fs.readdirSync(parentDir, { withFileTypes: true })
      .filter((entry) => entry && entry.isDirectory())
      .map((entry) => path.join(parentDir, entry.name));
  } catch {
    return [];
  }
}

function buildSiblingCandidates(projectRoot, preferredName) {
  const parentDir = path.resolve(projectRoot, '..');
  const candidates = [];

  if (preferredName) {
    candidates.push(path.join(parentDir, preferredName));
  }

  candidates.push(...listSiblingDirectories(parentDir));
  return uniquePaths(candidates);
}

function pickBestCandidate(candidates = []) {
  const valid = candidates.filter(hasUpstreamMarkers);
  if (valid.length === 0) {
    return null;
  }
  valid.sort((left, right) => left.localeCompare(right));
  const atomicName = valid.find((candidate) => /atomic/i.test(path.basename(candidate)));
  return atomicName || valid[0];
}

function deriveRepoRootFromCliEntrypoint(cliEntrypoint) {
  if (!cliEntrypoint) {
    return null;
  }
  return path.resolve(cliEntrypoint, '..', '..', '..', '..');
}

function resolveUpstreamRepoRoot(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || ROOT);
  const envRepoRoot = String(process.env.ATM_UPSTREAM_REPO_ROOT || '').trim();
  const envCliEntrypoint = String(process.env.ATM_UPSTREAM_CLI_ENTRYPOINT || '').trim();
  const preferredRepoName = String(
    options.upstreamRepoName ||
    process.env.ATM_UPSTREAM_REPO_NAME ||
    DEFAULT_UPSTREAM_REPO_NAME
  ).trim();

  if (options.upstreamRepoRoot) {
    return {
      upstreamRepoRoot: path.resolve(options.upstreamRepoRoot),
      source: 'option:upstreamRepoRoot',
    };
  }

  if (envRepoRoot) {
    return {
      upstreamRepoRoot: path.resolve(envRepoRoot),
      source: 'env:ATM_UPSTREAM_REPO_ROOT',
    };
  }

  if (options.upstreamCliEntrypoint || envCliEntrypoint) {
    const derivedRoot = deriveRepoRootFromCliEntrypoint(options.upstreamCliEntrypoint || envCliEntrypoint);
    if (derivedRoot) {
      return {
        upstreamRepoRoot: path.resolve(derivedRoot),
        source: options.upstreamCliEntrypoint
          ? 'option:upstreamCliEntrypoint'
          : 'env:ATM_UPSTREAM_CLI_ENTRYPOINT',
      };
    }
  }

  const siblingCandidates = buildSiblingCandidates(projectRoot, preferredRepoName);
  const picked = pickBestCandidate(siblingCandidates);
  if (picked) {
    return {
      upstreamRepoRoot: picked,
      source: 'sibling-scan',
    };
  }

  return {
    upstreamRepoRoot: path.resolve(projectRoot, '..', preferredRepoName),
    source: 'fallback:preferredRepoName',
  };
}

function resolveUpstreamCliEntrypoint(options = {}) {
  const envCliEntrypoint = String(process.env.ATM_UPSTREAM_CLI_ENTRYPOINT || '').trim();
  if (options.upstreamCliEntrypoint) {
    return {
      upstreamCliEntrypoint: path.resolve(options.upstreamCliEntrypoint),
      source: 'option:upstreamCliEntrypoint',
    };
  }
  if (envCliEntrypoint) {
    return {
      upstreamCliEntrypoint: path.resolve(envCliEntrypoint),
      source: 'env:ATM_UPSTREAM_CLI_ENTRYPOINT',
    };
  }

  const upstreamRepo = resolveUpstreamRepoRoot(options);
  return {
    upstreamCliEntrypoint: path.resolve(upstreamRepo.upstreamRepoRoot, UPSTREAM_CLI_RELATIVE_PATH),
    source: `derived:${upstreamRepo.source}`,
  };
}

function resolveUpstreamPaths(options = {}) {
  const upstreamRepo = resolveUpstreamRepoRoot(options);
  const upstreamCli = resolveUpstreamCliEntrypoint({
    ...options,
    upstreamRepoRoot: upstreamRepo.upstreamRepoRoot,
  });

  return {
    upstreamRepoRoot: upstreamRepo.upstreamRepoRoot,
    upstreamRepoSource: upstreamRepo.source,
    upstreamCliEntrypoint: upstreamCli.upstreamCliEntrypoint,
    upstreamCliSource: upstreamCli.source,
  };
}

module.exports = {
  DEFAULT_UPSTREAM_REPO_NAME,
  UPSTREAM_CLI_RELATIVE_PATH,
  UPSTREAM_REGISTRY_FILENAME,
  hasUpstreamMarkers,
  resolveUpstreamCliEntrypoint,
  resolveUpstreamPaths,
  resolveUpstreamRepoRoot,
};
