#!/usr/bin/env node
'use strict';

const path = require('path');

const handoffDiff = require('./lib/handoff-diff-core');

function printHelp() {
  console.log('Usage: node tools_node/check-task-scope.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --repository <path>    Git repository path (default: .)');
  console.log('  --task-lock-dir <dir>  Task lock directory (default: .task-locks)');
  console.log('  --task-card-dir <dir>  Task card directory (default: docs/agent-briefs/tasks)');
  console.log('  --task <id>            Validate one explicit task lock/card in addition to repo coverage');
  console.log('  --json                 Print JSON result');
  console.log('  --strict               Exit 1 on warn as well as fail');
  console.log('  --verbose              Print warning/details even when status is pass');
  console.log('  --help, -h             Show this help message');
}

function parseArgs(argv) {
  const parsed = {
    repository: '.',
    taskLockDir: '',
    taskCardDir: '',
    task: '',
    json: false,
    strict: false,
    verbose: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repository') {
      parsed.repository = argv[index + 1] || '.';
      index += 1;
      continue;
    }
    if (token === '--task-lock-dir') {
      parsed.taskLockDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--task-card-dir') {
      parsed.taskCardDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--task') {
      parsed.task = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--json') {
      parsed.json = true;
      continue;
    }
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--verbose') {
      parsed.verbose = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`未知參數：${token}`);
  }

  return parsed;
}

function resolveProjectPath(inputPath) {
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.join(handoffDiff.PROJECT_ROOT, inputPath);
}

function displayPath(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const relativePath = handoffDiff.toPosixPath(path.relative(handoffDiff.PROJECT_ROOT, absolutePath));
  if (relativePath && !relativePath.startsWith('../') && relativePath !== '') {
    return relativePath;
  }
  return handoffDiff.toPosixPath(absolutePath);
}

function computeExitCode(result, strict) {
  if (result.status === 'fail') {
    return 1;
  }
  if (strict && result.status === 'warn') {
    return 1;
  }
  return 0;
}

function buildSummary(result) {
  const warningCount = result.issues.filter((issue) => issue.severity === 'warn').length;
  const failCount = result.issues.filter((issue) => issue.severity === 'fail').length;
  return {
    changedFiles: result.coverage.length,
    activeLocks: result.locks.length,
    scopedLocks: result.locks.filter((lock) => lock.files.length > 0).length,
    uncoveredFiles: result.uncoveredFiles.length,
    overlappingFiles: result.overlappingFiles.length,
    foreignScopedFiles: result.foreignScopedFiles.length,
    warnings: warningCount,
    failures: failCount,
  };
}

function printPathList(title, paths) {
  if (!paths.length) {
    return;
  }
  console.log(`  ${title} (${paths.length})`);
  paths.forEach((entry) => {
    console.log(`    - ${entry}`);
  });
}

function printOverlapList(entries) {
  if (!entries.length) {
    return;
  }
  console.log(`  overlappingFiles (${entries.length})`);
  entries.forEach((entry) => {
    console.log(`    - ${entry.path} => ${entry.taskIds.join(', ')}`);
  });
}

function printIssueList(issues, verbose) {
  const visibleIssues = verbose
    ? issues
    : issues.filter((issue) => issue.severity === 'fail');
  if (!visibleIssues.length) {
    return;
  }
  console.log(`  issues (${visibleIssues.length})`);
  visibleIssues.forEach((issue) => {
    console.log(`    - [${issue.severity}] ${issue.layer}: ${issue.message}`);
    if (verbose) {
      console.log(`      expected=${issue.expected || '(none)'}`);
      console.log(`      actual=${issue.actual || '(none)'}`);
    }
  });
}

function printResult(result, verbose) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  const summary = buildSummary(result);
  const taskLabel = result.taskId ? ` task=${result.taskId}` : '';
  console.log(`${icon} task-scope ${result.status}: repo=${displayPath(result.repositoryRoot)}${taskLabel}`);
  console.log(`  changedFiles=${summary.changedFiles} activeLocks=${summary.activeLocks} scopedLocks=${summary.scopedLocks} uncovered=${summary.uncoveredFiles} overlapping=${summary.overlappingFiles}`);

  if (result.taskId) {
    console.log(`  currentTaskLock=${result.currentTaskLock.found ? 'found' : 'missing'} currentTaskCard=${result.currentTaskCard.found ? 'found' : 'missing'}`);
    if (result.currentTaskFiles.length > 0) {
      console.log(`  currentTaskMatchedFiles=${result.currentTaskFiles.length}`);
    }
  }

  printPathList('uncoveredFiles', result.uncoveredFiles);
  printOverlapList(result.overlappingFiles);

  if (verbose && result.foreignScopedFiles.length > 0) {
    console.log(`  foreignScopedFiles (${result.foreignScopedFiles.length})`);
    result.foreignScopedFiles.forEach((entry) => {
      console.log(`    - ${entry.path} => ${entry.taskIds.join(', ')}`);
    });
  }

  printIssueList(result.issues, verbose || result.status !== 'pass');

  if (result.status === 'pass') {
    console.log('  all git changed files are covered by exactly one active task scope');
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[task-scope] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  let repositoryRoot;
  let gitEntries;
  let result;

  try {
    repositoryRoot = handoffDiff.resolveGitRepositoryRoot(resolveProjectPath(args.repository));
    gitEntries = handoffDiff.readGitChangedEntries(repositoryRoot);
    result = handoffDiff.buildGitTaskScopeCoverage({
      repositoryRoot,
      gitEntries,
      taskLockDir: args.taskLockDir,
      taskCardDir: args.taskCardDir,
      taskId: args.task,
    });
  } catch (error) {
    console.error(`[task-scope] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const fingerprintIssues = result.issues.filter((issue) => issue.layer === 'scope-fingerprint');
  handoffDiff.appendTaskLockTrace({
    command: 'check-task-scope',
    outcome: result.status,
    repositoryRoot: result.repositoryRoot,
    taskId: result.taskId,
    changedFiles: result.coverage.length,
    uncoveredFiles: result.uncoveredFiles,
    overlappingFiles: result.overlappingFiles,
    foreignScopedFiles: result.foreignScopedFiles,
    currentTaskFiles: result.currentTaskFiles,
    issueCount: result.issues.length,
    fingerprintIssueCount: fingerprintIssues.length,
  }, {
    repositoryRoot,
    taskLockDir: args.taskLockDir,
    tracePath: process.env.TASK_LOCK_TRACE_JSONL || '',
  });

  if (args.json) {
    console.log(JSON.stringify({ summary: buildSummary(result), result }, null, 2));
    process.exit(computeExitCode(result, args.strict));
    return;
  }

  printResult(result, args.verbose);
  process.exit(computeExitCode(result, args.strict));
}

main();