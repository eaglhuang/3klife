#!/usr/bin/env node
'use strict';

const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

function parseFiles(rawArgs) {
    const filesFlagIndex = rawArgs.indexOf('--files');
    if (filesFlagIndex < 0) {
        return [];
    }
    return rawArgs.slice(filesFlagIndex + 1).filter((arg) => !arg.startsWith('--'));
}

function printUsage() {
    console.log('用法: task-lock.js <lock|reserve|unlock|check|check-cross-shard|validateScope|list> [task-id|task-prefix] [agent-name]');
}

function main(argv = process.argv.slice(2), adapter = new LockAdapter(createLockAdapterConfig())) {
    const rawArgs = Array.isArray(argv) ? argv : [];
    const command = rawArgs[0];
    const taskIdOrPrefix = rawArgs[1];
    const explicitAgentName = rawArgs[2] && !String(rawArgs[2]).startsWith('--') ? rawArgs[2] : '';
    const agentName = explicitAgentName || adapter.getDefaultAgentName();
    const files = parseFiles(rawArgs);

    switch (command) {
        case 'lock':
            if (!taskIdOrPrefix || !agentName) {
                console.error('用法: task-lock.js lock <task-id> <agent-name>（或設定 AGENT_IDENTITY）');
                return 1;
            }
            try {
                adapter.lock(taskIdOrPrefix, agentName, files);
                return 0;
            } catch (error) {
                if (error && error.result) {
                    console.error(`cross-shard 檔案鎖定衝突: "${taskIdOrPrefix}"`);
                    console.error(JSON.stringify(error.result, null, 2));
                } else {
                    console.error(error instanceof Error ? error.message : String(error));
                }
                return 1;
            }

        case 'reserve':
            if (!taskIdOrPrefix || !agentName) {
                console.error('用法: task-lock.js reserve <task-prefix> <agent-name>（或設定 AGENT_IDENTITY）');
                return 1;
            }
            try {
                const reservation = adapter.reserve(taskIdOrPrefix, agentName);
                console.log(JSON.stringify(reservation, null, 2));
                return 0;
            } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                return 1;
            }

        case 'unlock':
            if (!taskIdOrPrefix || !agentName) {
                console.error('用法: task-lock.js unlock <task-id> <agent-name>（或設定 AGENT_IDENTITY；人名可作為覆寫解鎖）');
                return 1;
            }
            adapter.unlock(taskIdOrPrefix, agentName);
            return Number(process.exitCode || 0);

        case 'check':
            if (!taskIdOrPrefix) {
                console.error('用法: task-lock.js check <task-id>');
                return 1;
            }
            adapter.check(taskIdOrPrefix);
            return 0;

        case 'check-cross-shard':
        case 'validateScope':
        case 'validate-scope': {
            if (!taskIdOrPrefix) {
                console.error('用法: task-lock.js check-cross-shard <task-id> --files <file...>');
                return 1;
            }
            const result = adapter.validateScope(taskIdOrPrefix, files);
            adapter.appendTrace({
                command,
                outcome: result.ok ? 'success' : 'fail',
                taskId: taskIdOrPrefix,
                agentName,
                files,
                conflicts: result.conflicts,
                errors: result.errors,
            });
            console.log(JSON.stringify(result, null, 2));
            return result.ok ? 0 : 1;
        }

        case 'list':
            adapter.list();
            return 0;

        default:
            printUsage();
            return 1;
    }
}

if (require.main === module) {
    process.exit(main());
}

module.exports = {
    main,
    parseFiles,
};
