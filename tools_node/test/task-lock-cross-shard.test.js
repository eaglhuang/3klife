#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const taskLockCli = path.join(projectRoot, 'tools_node', 'task-lock.js');
const taskScopeCli = path.join(projectRoot, 'tools_node', 'check-task-scope.js');
const { getTaskCardRelativePath } = require('../lib/task-card-paths');
const tracePath = path.join(projectRoot, 'temp', 'task-lock-trace.test.jsonl');

const testTasks = ['ATM-TEST-A', 'ATM-TEST-B', 'ATM-TEST-FP'];

function buildEnv(extraEnv = {}) {
    return {
        ...process.env,
        TASK_LOCK_TRACE_JSONL: tracePath,
        ...extraEnv,
    };
}

function runTaskLock(args, expectedStatus = 0, extraEnv = {}) {
    const result = spawnSync(process.execPath, [taskLockCli, ...args], {
        cwd: projectRoot,
        encoding: 'utf8',
        shell: false,
        env: buildEnv(extraEnv),
    });
    if (result.status !== expectedStatus) {
        throw new Error([
            `task-lock ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}`,
            String(result.stdout || '').trim(),
            String(result.stderr || '').trim(),
            result.error ? result.error.message : ''
        ].filter(Boolean).join('\n'));
    }
    return result;
}

function runTaskScope(args, expectedStatus = 0, extraEnv = {}) {
    const result = spawnSync(process.execPath, [taskScopeCli, ...args], {
        cwd: projectRoot,
        encoding: 'utf8',
        shell: false,
        env: buildEnv(extraEnv),
    });
    if (result.status !== expectedStatus) {
        throw new Error([
            `check-task-scope ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}`,
            String(result.stdout || '').trim(),
            String(result.stderr || '').trim(),
            result.error ? result.error.message : ''
        ].filter(Boolean).join('\n'));
    }
    return result;
}

function writeTaskCard(taskId, body) {
    const cardPath = path.join(projectRoot, getTaskCardRelativePath(taskId));
    fs.mkdirSync(path.dirname(cardPath), { recursive: true });
    fs.writeFileSync(cardPath, body, 'utf8');
}

function cleanup() {
    for (const taskId of testTasks) {
        spawnSync(process.execPath, [taskLockCli, 'unlock', taskId, `${taskId}-agent`], {
            cwd: projectRoot,
            encoding: 'utf8',
            shell: false,
            env: buildEnv(),
        });
        const cardPath = path.join(projectRoot, getTaskCardRelativePath(taskId));
        if (fs.existsSync(cardPath)) {
            fs.unlinkSync(cardPath);
        }
    }
    const fingerprintPath = path.join(projectRoot, 'temp', 'task-lock-fingerprint.txt');
    if (fs.existsSync(fingerprintPath)) {
        fs.unlinkSync(fingerprintPath);
    }
    if (fs.existsSync(tracePath)) {
        fs.unlinkSync(tracePath);
    }
}

function parseJson(stdout) {
    return JSON.parse(stdout);
}

function readTraceEvents() {
    if (!fs.existsSync(tracePath)) {
        return [];
    }
    return fs.readFileSync(tracePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function main() {
    cleanup();
    try {
        const free = parseJson(runTaskLock([
            'check-cross-shard',
            'ATM-TEST-B',
            '--files',
            'temp/cross-shard-free.txt'
        ]).stdout);
        assert(free.ok === true, 'free file should pass cross-shard check');
        assert(Array.isArray(free.conflicts) && free.conflicts.length === 0, 'free file should have no conflicts');

        runTaskLock([
            'lock',
            'ATM-TEST-A',
            'ATM-TEST-A-agent',
            '--files',
            'temp/cross-shard-conflict.txt'
        ]);

        const conflictResult = runTaskLock([
            'check-cross-shard',
            'ATM-TEST-B',
            '--files',
            'temp/cross-shard-conflict.txt'
        ], 1);
        const conflict = parseJson(conflictResult.stdout);
        assert(conflict.ok === false, 'locked file should fail cross-shard check');
        assert(conflict.conflicts.length === 1, 'locked file should report one conflict');
        assert(conflict.conflicts[0].taskId === 'ATM-TEST-A', 'conflict should identify existing task');

        const wrongUnlock = runTaskLock([
            'unlock',
            'ATM-TEST-A',
            'ATM-TEST-B-agent'
        ], 1);
        assert(/解鎖失敗/.test(wrongUnlock.stderr), 'non-owner agent unlock should still fail');

        runTaskLock([
            'unlock',
            'ATM-TEST-A',
            'wenyihuang'
        ]);

        const unlockedByHuman = parseJson(runTaskLock([
            'check-cross-shard',
            'ATM-TEST-B',
            '--files',
            'temp/cross-shard-conflict.txt'
        ]).stdout);
        assert(unlockedByHuman.ok === true, 'human override unlock should release the conflicting file');

        runTaskLock([
            'lock',
            'ATM-TEST-A',
            'ATM-TEST-A-agent',
            '--files',
            'temp/cross-shard-conflict.txt'
        ]);

        runTaskLock([
            'lock',
            'ATM-TEST-B',
            'ATM-TEST-B-agent',
            '--files',
            'temp/cross-shard-conflict.txt'
        ], 1);

        cleanup();
        writeTaskCard('ATM-TEST-A', [
            '---',
            'id: ATM-TEST-A',
            'status: in-progress',
            'coexistence: parallel',
            'coexistence_ranges: temp/cross-shard-parallel.txt#L1-L10',
            '---',
            '# ATM-TEST-A'
        ].join('\n'));
        writeTaskCard('ATM-TEST-B', [
            '---',
            'id: ATM-TEST-B',
            'status: in-progress',
            'coexistence: parallel',
            'coexistence_ranges: temp/cross-shard-parallel.txt#L20-L30',
            '---',
            '# ATM-TEST-B'
        ].join('\n'));

        runTaskLock([
            'lock',
            'ATM-TEST-A',
            'ATM-TEST-A-agent',
            '--files',
            'temp/cross-shard-parallel.txt'
        ]);
        const parallel = parseJson(runTaskLock([
            'check-cross-shard',
            'ATM-TEST-B',
            '--files',
            'temp/cross-shard-parallel.txt'
        ]).stdout);
        assert(parallel.ok === true, 'parallel non-overlapping ranges should pass');
        runTaskLock([
            'lock',
            'ATM-TEST-B',
            'ATM-TEST-B-agent',
            '--files',
            'temp/cross-shard-parallel.txt'
        ]);

        const fingerprintTaskId = 'ATM-TEST-FP';
        const fingerprintCardPath = path.join(projectRoot, getTaskCardRelativePath(fingerprintTaskId));
        const fingerprintFilePath = path.join(projectRoot, 'temp', 'task-lock-fingerprint.txt');
        fs.mkdirSync(path.dirname(fingerprintCardPath), { recursive: true });
        fs.writeFileSync(fingerprintCardPath, [
            '---',
            `id: ${fingerprintTaskId}`,
            'status: in-progress',
            '---',
            `# ${fingerprintTaskId}`
        ].join('\n'), 'utf8');
        fs.writeFileSync(fingerprintFilePath, 'alpha\n', 'utf8');
        runTaskLock([
            'lock',
            fingerprintTaskId,
            `${fingerprintTaskId}-agent`,
            '--files',
            'temp/task-lock-fingerprint.txt'
        ]);
        const traceAfterLock = readTraceEvents();
        assert(traceAfterLock.some((event) => event.command === 'lock' && event.taskId === fingerprintTaskId && String(event.scopeFingerprint || '').startsWith('sha256:')), 'lock trace should record scope fingerprint');

        fs.writeFileSync(fingerprintFilePath, 'beta\n', 'utf8');
        const scopeResult = runTaskScope([
            '--task',
            fingerprintTaskId,
            '--json'
        ], 1);
        const scopeJson = parseJson(scopeResult.stdout);
        assert(scopeJson.result.issues.some((issue) => issue.layer === 'scope-fingerprint' && issue.severity === 'fail'), 'task scope should fail when fingerprint drifts');
        const traceAfterScope = readTraceEvents();
        assert(traceAfterScope.some((event) => event.command === 'check-task-scope' && event.taskId === fingerprintTaskId && event.fingerprintIssueCount >= 1 && event.outcome === 'fail'), 'scope trace should record the fingerprint failure');

        console.log('task-lock cross-shard tests passed');
    } finally {
        cleanup();
    }
}

main();
