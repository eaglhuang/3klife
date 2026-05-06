#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const {
  DEFAULT_MAX_PART_BYTES,
  DEFAULT_MAX_PART_LINES,
  readTasksAtmStore,
} = require('./lib/tasks-atm-shard-store');

const ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT = path.join(ROOT, 'docs');
const LARGE_FILE_THRESHOLD_BYTES = 6 * 1024;
const LARGE_FILE_THRESHOLD_TOKENS = 6000;
const SKIP_DIRS = new Set(['node_modules', 'library', 'temp', '.git']);

function toPosixPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function relativePath(absPath) {
  return toPosixPath(path.relative(ROOT, absPath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function calcLineCount(text) {
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text;
  return trimmed.length === 0 ? 0 : trimmed.split('\n').length;
}

function estimateTextTokens(buffer) {
  const text = buffer.toString('utf8');
  let ascii = 0;
  let nonAscii = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) <= 0x7f) {
      ascii += 1;
    } else {
      nonAscii += 1;
    }
  }
  return Math.ceil(ascii / 4 + nonAscii * 0.9);
}

function isTextDoc(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.json';
}

function parseGitStatusLine(line) {
  if (!line || line.length < 3) {
    return null;
  }

  const rawStatus = String(line.slice(0, 2) || '  ').padEnd(2, ' ').slice(0, 2);
  if (rawStatus === '!!') {
    return null;
  }

  let filePath = line.slice(3).trim();
  if (!filePath) {
    return null;
  }

  if (filePath.includes(' -> ')) {
    const segments = filePath.split(' -> ');
    filePath = segments[segments.length - 1].trim();
  }

  return toPosixPath(filePath);
}

function collectChangedFiles() {
  try {
    const output = cp.execSync('git status --short --untracked-files=all', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.replace(/\r/g, ''))
      .map(parseGitStatusLine)
      .filter((filePath) => Boolean(filePath) && filePath.startsWith('docs/'));
  } catch {
    return [];
  }
}

function walkShardRcFiles(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walkShardRcFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name === '.shardrc.json') {
      out.push(fullPath);
    }
  }
}

function getPartExtension(cfg) {
  if (cfg.type === 'auto-parts') {
    return path.extname(cfg.source || '') || '.json';
  }
  if (cfg.type === 'json-array') {
    return '.json';
  }
  return '.md';
}

function buildShardGroups() {
  const shardRcFiles = [];
  walkShardRcFiles(DOCS_ROOT, shardRcFiles);

  const groups = [];
  const managedFiles = new Set();
  const fileToGroupDirs = new Map();
  const groupByRcPath = new Map();

  for (const rcPath of shardRcFiles) {
    let cfg;
    try {
      cfg = readJson(rcPath);
    } catch (error) {
      groups.push({
        rcPath,
        rcDir: path.dirname(rcPath),
        cfg: null,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const rcDir = path.dirname(rcPath);
    const sourceAbs = path.resolve(rcDir, cfg.source || '.');
    const partExt = getPartExtension(cfg);
    const group = {
      rcPath,
      rcDir,
      cfg,
      sourceAbs,
      partExt,
      error: '',
    };

    groups.push(group);
    groupByRcPath.set(rcPath, group);

    const filesInGroup = [sourceAbs];
    if (Array.isArray(cfg.shards)) {
      for (const shard of cfg.shards) {
        filesInGroup.push(path.join(rcDir, `${shard.name}${partExt}`));
      }
    }

    for (const filePath of filesInGroup) {
      const absPath = path.resolve(filePath);
      managedFiles.add(absPath);
      if (!fileToGroupDirs.has(absPath)) {
        fileToGroupDirs.set(absPath, new Set());
      }
      fileToGroupDirs.get(absPath).add(rcDir);
    }
  }

  return {
    groups,
    managedFiles,
    fileToGroupDirs,
    groupByRcPath,
  };
}

function runShardManagerValidate(shardDir) {
  const result = cp.spawnSync(process.execPath, [
    path.join(__dirname, 'shard-manager.js'),
    'validate',
    relativePath(shardDir),
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  });

  return {
    exitCode: result.status ?? 1,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  };
}

function validateAutoPartsGroup(group) {
  const issues = [];
  if (!group.cfg || group.cfg.type !== 'auto-parts') {
    return issues;
  }

  const thresholdKB = Number.isFinite(Number(group.cfg._thresholdKB))
    ? Number(group.cfg._thresholdKB)
    : 30;
  const thresholdBytes = thresholdKB * 1024;
  const thresholdLines = Number.isFinite(Number(group.cfg._thresholdLines)) && Number(group.cfg._thresholdLines) > 0
    ? Number(group.cfg._thresholdLines)
    : null;

  if (!Array.isArray(group.cfg.shards) || group.cfg.shards.length === 0) {
    issues.push(`${relativePath(group.rcPath)} does not list any auto-parts shards`);
    return issues;
  }

  for (const shard of group.cfg.shards) {
    const partPath = path.join(group.rcDir, `${shard.name}${group.partExt}`);
    if (!fs.existsSync(partPath)) {
      issues.push(`missing auto-part: ${relativePath(partPath)}`);
      continue;
    }

    const rawText = fs.readFileSync(partPath, 'utf8');
    const bytes = fs.statSync(partPath).size;
    const lines = calcLineCount(rawText);

    if (group.partExt === '.json') {
      try {
        const parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) {
          issues.push(`${relativePath(partPath)} is not a JSON array`);
        }
      } catch (error) {
        issues.push(`${relativePath(partPath)} cannot be parsed as JSON: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }

    if (bytes > thresholdBytes) {
      issues.push(`${relativePath(partPath)} exceeds threshold (${(bytes / 1024).toFixed(1)} KB > ${thresholdKB} KB)`);
    }
    if (thresholdLines !== null && lines > thresholdLines) {
      issues.push(`${relativePath(partPath)} exceeds line threshold (${lines} > ${thresholdLines})`);
    }
  }

  return issues;
}

function validateTasksAtmThinIndexIfPresent(group) {
  const indexPath = path.join(ROOT, 'docs', 'tasks', 'tasks-atm.json');
  const partsDir = path.join(ROOT, 'docs', 'tasks', 'tasks-atm');
  const shardRcPath = path.join(partsDir, '.shardrc.json');

  const isTasksAtmSource = path.resolve(group.sourceAbs) === path.resolve(indexPath);
  const isTasksAtmGroup = path.resolve(group.rcDir) === path.resolve(partsDir);
  if (!isTasksAtmSource && !isTasksAtmGroup) {
    return [];
  }

  const issues = [];

  try {
    const indexData = readJson(indexPath);
    const shardRc = readJson(shardRcPath);
    const state = readTasksAtmStore(ROOT);

    if (indexData.kind !== 'task-aggregate-index') {
      issues.push(`${relativePath(indexPath)} should remain a thin index stub`);
    }
    if (Array.isArray(indexData.tasks)) {
      issues.push(`${relativePath(indexPath)} still contains a full tasks array`);
    }
    if (indexData._sourceOfTruth !== 'docs/tasks/tasks-atm/') {
      issues.push(`${relativePath(indexPath)} has an unexpected _sourceOfTruth`);
    }
    if (indexData._rebuild !== 'node tools_node/rebuild-tasks-atm-auto-parts.js') {
      issues.push(`${relativePath(indexPath)} has an unexpected _rebuild command`);
    }

    const thresholds = indexData.thresholds || {};
    if (Number(thresholds.maxPartKB) !== DEFAULT_MAX_PART_BYTES / 1024) {
      issues.push(`${relativePath(indexPath)} maxPartKB drifted (expected ${DEFAULT_MAX_PART_BYTES / 1024}, got ${thresholds.maxPartKB})`);
    }
    if (Number(thresholds.maxPartLines) !== DEFAULT_MAX_PART_LINES) {
      issues.push(`${relativePath(indexPath)} maxPartLines drifted (expected ${DEFAULT_MAX_PART_LINES}, got ${thresholds.maxPartLines})`);
    }

    if (!Array.isArray(indexData.shards) || indexData.shards.length === 0) {
      issues.push(`${relativePath(indexPath)} does not list any shard parts`);
    }

    if (shardRc.type !== 'auto-parts') {
      issues.push(`${relativePath(shardRcPath)} should remain type=auto-parts`);
    }
    if (shardRc.source !== '../tasks-atm.json') {
      issues.push(`${relativePath(shardRcPath)} has an unexpected source`);
    }
    if (Number(shardRc._thresholdKB) !== DEFAULT_MAX_PART_BYTES / 1024) {
      issues.push(`${relativePath(shardRcPath)} _thresholdKB drifted (expected ${DEFAULT_MAX_PART_BYTES / 1024}, got ${shardRc._thresholdKB})`);
    }
    if (Number(shardRc._thresholdLines) !== DEFAULT_MAX_PART_LINES) {
      issues.push(`${relativePath(shardRcPath)} _thresholdLines drifted (expected ${DEFAULT_MAX_PART_LINES}, got ${shardRc._thresholdLines})`);
    }
    if (!Array.isArray(shardRc.shards) || shardRc.shards.length === 0) {
      issues.push(`${relativePath(shardRcPath)} does not list any shard parts`);
    }

    if (state.mode !== 'thin-index') {
      issues.push(`tasks-atm store is not thin-index (mode=${state.mode})`);
    }
    if (JSON.stringify(state.summary) !== JSON.stringify(indexData.summary)) {
      issues.push(`summary mismatch between ${relativePath(indexPath)} and part files`);
    }
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  return issues;
}

function collectAffectedGroups(groups, fileToGroupDirs, groupByRcPath, changedFiles, managedFiles) {
  const affected = new Map();
  const largeIssues = [];

  for (const filePath of changedFiles) {
    const absPath = path.resolve(ROOT, filePath);
    if (!fs.existsSync(absPath)) {
      continue;
    }

    if (isTextDoc(absPath)) {
      const stat = fs.statSync(absPath);
      const raw = fs.readFileSync(absPath);
      const tokens = estimateTextTokens(raw);
      const isLarge = stat.size >= LARGE_FILE_THRESHOLD_BYTES || tokens >= LARGE_FILE_THRESHOLD_TOKENS;

      if (isLarge && !managedFiles.has(absPath)) {
        largeIssues.push(`${relativePath(absPath)} (${(stat.size / 1024).toFixed(1)} KB, ~${tokens} tokens) is a large unmanaged md/json file`);
      }
    }

    const sourceGroups = groups.filter((group) => group.cfg && path.resolve(group.sourceAbs) === absPath);
    if (sourceGroups.length > 0) {
      for (const group of sourceGroups) {
        affected.set(group.rcDir, group);
      }
      continue;
    }

    if (groupByRcPath.has(absPath)) {
      const group = groupByRcPath.get(absPath);
      affected.set(group.rcDir, group);
      continue;
    }

    const mappedGroupDirs = fileToGroupDirs.get(absPath);
    if (mappedGroupDirs) {
      for (const groupDir of mappedGroupDirs) {
        const group = groups.find((entry) => path.resolve(entry.rcDir) === path.resolve(groupDir));
        if (group) {
          affected.set(group.rcDir, group);
        }
      }
    }
  }

  return { affected, largeIssues };
}

function fail(issues) {
  console.error('[doc-shard-health] FAIL: doc shard health check failed');
  for (const issue of issues) {
    console.error(`[doc-shard-health]   - ${issue}`);
  }
  process.exit(1);
}

function main() {
  const { groups, managedFiles, fileToGroupDirs, groupByRcPath } = buildShardGroups();
  const changedFiles = collectChangedFiles();
  const { affected, largeIssues } = collectAffectedGroups(groups, fileToGroupDirs, groupByRcPath, changedFiles, managedFiles);

  const issues = [...largeIssues];

  for (const group of affected.values()) {
    if (!group || group.error) {
      issues.push(group ? `${relativePath(group.rcPath)}: ${group.error}` : 'unknown shard group error');
      continue;
    }

    if (group.cfg.type !== 'auto-parts') {
      const validateResult = runShardManagerValidate(group.rcDir);
      if (validateResult.exitCode !== 0) {
        const preview = (validateResult.stderr || validateResult.stdout)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 5)
          .join(' | ');
        issues.push(`${relativePath(group.rcDir)} validate failed${preview ? `: ${preview}` : ''}`);
      }
    }

    issues.push(...validateAutoPartsGroup(group));
    issues.push(...validateTasksAtmThinIndexIfPresent(group));
  }

  if (issues.length > 0) {
    fail(issues);
  }

  console.log(`[doc-shard-health] OK: ${affected.size} affected shard group(s), ${changedFiles.length} changed docs file(s) checked`);
}

try {
  main();
} catch (error) {
  fail([error instanceof Error ? error.message : String(error)]);
}