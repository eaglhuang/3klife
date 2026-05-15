'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT = path.join('artifacts', 'legacy-h2u-live-rollout');
const DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT = path.join('artifacts', 'legacy-h2u-first-win', 'final-decision.json');
const DEFAULT_LIVE_ROLLOUT_TARGET_FILE = 'tools_node/lib/dom-to-ui/draft-builder-core.js';
const DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER = 'processElement';

function buildRunId(prefix = 'h2u-live-rollout') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${timestamp}-${suffix}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
}

function parseJsonOutput(stdout) {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function findLatestRunDir(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return null;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry && entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name));

  if (entries.length === 0) {
    return null;
  }

  const withTimes = entries.map((entryPath) => {
    try {
      return {
        path: entryPath,
        mtimeMs: fs.statSync(entryPath).mtimeMs,
      };
    } catch {
      return {
        path: entryPath,
        mtimeMs: 0,
      };
    }
  });

  withTimes.sort((left, right) => {
    if (left.mtimeMs !== right.mtimeMs) {
      return right.mtimeMs - left.mtimeMs;
    }
    return left.path.localeCompare(right.path);
  });

  return withTimes[0].path;
}

module.exports = {
  DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT,
  DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT,
  DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER,
  DEFAULT_LIVE_ROLLOUT_TARGET_FILE,
  buildRunId,
  ensureDir,
  findLatestRunDir,
  parseJsonOutput,
  readJson,
  readJsonIfExists,
  writeJson,
};