#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const storage = require('./lib/turn-artifact-storage');

const projectRoot = storage.PROJECT_ROOT;

function parseArgs(argv) {
  const parsed = {
    root: storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot,
    rotationDays: 30,
    dryRun: true,
    apply: false,
    yes: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--root') {
      parsed.root = argv[index + 1] || parsed.root;
      index += 1;
      continue;
    }
    if (token === '--rotation-days') {
      const value = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isFinite(value) && value >= 0) {
        parsed.rotationDays = value;
      }
      index += 1;
      continue;
    }
    if (token === '--dry-run') {
      parsed.dryRun = true;
      parsed.apply = false;
      continue;
    }
    if (token === '--apply') {
      parsed.apply = true;
      parsed.dryRun = false;
      continue;
    }
    if (token === '--yes') {
      parsed.yes = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/rotate-turn-artifacts.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run                Plan-only mode (default)');
  console.log('  --apply --yes            Execute file moves');
  console.log('  --root <path>            Scan root (default: artifacts/turn-artifacts)');
  console.log('  --rotation-days <n>      Candidate age threshold in days (default: 30)');
  console.log('  --report <json>          Write machine-readable report');
  console.log('  --help, -h               Show this help');
}

function rel(filePath) {
  return storage.toProjectRelative(filePath);
}

function resolveProjectPath(targetPath) {
  if (!targetPath) {
    return path.join(projectRoot, storage.TURN_ARTIFACT_STORAGE_POLICY.formalRoot);
  }
  return path.isAbsolute(targetPath) ? targetPath : path.join(projectRoot, targetPath);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toDatePrefix(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function ageDaysSince(datePrefix) {
  if (!datePrefix) return null;
  const parsed = new Date(`${datePrefix}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / (24 * 60 * 60 * 1000));
}

function readJsonSafe(filePath) {
  try {
    return {
      ok: true,
      value: JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: String(error && error.message ? error.message : error),
    };
  }
}

function walkJsonFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }
  const files = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        files.push(absolutePath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isCanonicalFormalPath(relativePath) {
  return /^artifacts\/turn-artifacts\/\d{4}-\d{2}-\d{2}\/[^/]+\/[^/]+\.json$/i.test(relativePath);
}

function buildCandidate(filePath, artifact, rotationDays) {
  const relativePath = rel(filePath);
  if (!storage.isFormalTurnArtifactPath(filePath)) {
    return { candidate: null, skipped: { path: relativePath, reason: 'non-formal-path' } };
  }
  if (isCanonicalFormalPath(relativePath)) {
    return { candidate: null, skipped: { path: relativePath, reason: 'already-canonical' } };
  }
  const allowlistEntry = storage.findLegacyFormalPathAllowlistEntry(relativePath);
  if (allowlistEntry) {
    return {
      candidate: null,
      skipped: {
        path: relativePath,
        reason: 'legacy-allowlisted',
        details: {
          ownerTask: normalizeText(allowlistEntry.ownerTask),
          reviewBy: normalizeText(allowlistEntry.reviewBy),
          note: normalizeText(allowlistEntry.reason),
        },
      },
    };
  }

  const workflow = normalizeText(artifact && artifact.workflow);
  const task = normalizeText(artifact && artifact.task);
  const generatedAt = normalizeText(artifact && artifact.generatedAt);
  const datePrefix = toDatePrefix(generatedAt);
  const ageDays = ageDaysSince(datePrefix);

  if (!workflow || !task || !datePrefix) {
    return {
      candidate: null,
      skipped: {
        path: relativePath,
        reason: 'missing-required-metadata',
        details: { workflow, task, generatedAt },
      },
    };
  }

  if (ageDays !== null && ageDays < rotationDays) {
    return {
      candidate: null,
      skipped: {
        path: relativePath,
        reason: 'age-below-threshold',
        details: { ageDays, rotationDays },
      },
    };
  }

  const canonical = storage.buildFormalTurnArtifactPath({ workflow, task, generatedAt: datePrefix });
  return {
    candidate: {
      sourcePath: filePath,
      sourceRelativePath: relativePath,
      targetPath: canonical.absolutePath,
      targetRelativePath: canonical.relativePath,
      generatedAt,
      workflow,
      task,
      ageDays,
    },
    skipped: null,
  };
}

function executeRotation(candidates, options) {
  const moved = [];
  const skipped = [];

  for (const item of candidates) {
    const targetExists = fs.existsSync(item.targetPath);
    if (targetExists) {
      skipped.push({
        path: item.sourceRelativePath,
        reason: 'target-exists',
        details: { target: item.targetRelativePath },
      });
      continue;
    }

    if (options.dryRun) {
      moved.push({
        from: item.sourceRelativePath,
        to: item.targetRelativePath,
        action: 'planned',
      });
      continue;
    }

    ensureDir(path.dirname(item.targetPath));
    fs.renameSync(item.sourcePath, item.targetPath);
    moved.push({
      from: item.sourceRelativePath,
      to: item.targetRelativePath,
      action: 'moved',
    });
  }

  return { moved, skipped };
}

function buildReport(args) {
  const rootPath = resolveProjectPath(args.root);
  const files = walkJsonFiles(rootPath);
  const candidates = [];
  const skipped = [];
  const parseErrors = [];

  for (const filePath of files) {
    const loaded = readJsonSafe(filePath);
    if (!loaded.ok) {
      parseErrors.push({
        path: rel(filePath),
        reason: 'json-parse-failed',
        details: { error: loaded.error },
      });
      continue;
    }

    const decision = buildCandidate(filePath, loaded.value, args.rotationDays);
    if (decision.candidate) {
      candidates.push(decision.candidate);
    } else if (decision.skipped) {
      skipped.push(decision.skipped);
    }
  }

  let moved = [];
  if (args.apply) {
    if (!args.yes) {
      parseErrors.push({
        path: rel(rootPath),
        reason: 'apply-requires-yes',
        details: {},
      });
    } else {
      const result = executeRotation(candidates, args);
      moved = result.moved;
      skipped.push(...result.skipped);
    }
  } else {
    moved = candidates.map((item) => ({
      from: item.sourceRelativePath,
      to: item.targetRelativePath,
      action: 'planned',
    }));
  }

  const blockerCount = parseErrors.length;
  return {
    tool: 'rotate-turn-artifacts',
    mode: args.apply ? 'apply' : 'dry-run',
    root: rel(rootPath),
    rotationDays: args.rotationDays,
    candidateCount: candidates.length,
    movedCount: moved.filter((item) => item.action === 'moved').length,
    plannedCount: moved.filter((item) => item.action === 'planned').length,
    skippedCount: skipped.length,
    blockerCount,
    passed: blockerCount === 0,
    candidates: moved,
    skipped,
    blockers: parseErrors,
    policy: storage.describeTurnArtifactStorage(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const report = buildReport(args);
  if (args.report) {
    const reportPath = resolveProjectPath(args.report);
    writeJson(reportPath, report);
    console.log(`[rotate-turn-artifacts] report=${rel(reportPath)}`);
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`[rotate-turn-artifacts] status=${report.passed ? 'pass' : 'fail'} mode=${report.mode} candidates=${report.candidateCount}`);

  if (!report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[rotate-turn-artifacts] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  buildReport,
  main,
};
