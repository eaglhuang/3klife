#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const taskLockCli = path.join(projectRoot, 'tools_node', 'task-lock.js');
const taskCardDir = path.join(projectRoot, 'docs', 'agent-briefs', 'tasks');

const testTasks = ['ATM-TEST-A', 'ATM-TEST-B'];

function runTaskLock(args, expectedStatus = 0) {
    const result = spawnSync(process.execPath, [taskLockCli, ...args], {
        cwd: projectRoot,
        encoding: 'utf8',
        shell: false
    });
    if (result.status !== expectedStatus) {
        throw new Error([
            `task-lock ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}`,
            result.stdout.trim(),
            result.stderr.trim()
        ].filter(Boolean).join('\n'));
    }
    return result;
}

function writeTaskCard(taskId, body) {
    fs.writeFileSync(path.join(taskCardDir, `${taskId}.md`), body, 'utf8');
}

function cleanup() {
    for (const taskId of testTasks) {
        spawnSync(process.execPath, [taskLockCli, 'unlock', taskId, `${taskId}-agent`], {
            cwd: projectRoot,
            encoding: 'utf8',
            shell: false
        });
        const cardPath = path.join(taskCardDir, `${taskId}.md`);
        if (fs.existsSync(cardPath)) {
            fs.unlinkSync(cardPath);
        }
    }
}

function parseJson(stdout) {
    return JSON.parse(stdout);
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

        console.log('task-lock cross-shard tests passed');
    } finally {
        cleanup();
    }
}

main();