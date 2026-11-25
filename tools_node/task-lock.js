#!/usr/bin/env node
'use strict';

const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

function parseFiles(rawArgs) {
  const filesFlagIndex = rawArgs.indexOf('--files');
  if (filesFlagIndex < 0) {
    return [];
  }
  const tokens = rawArgs.slice(filesFlagIndex + 1).filter((arg) => !String(arg).startsWith('--'));
  const files = [];
  for (const token of tokens) {
    for (const piece of String(token).split(',')) {
      const file = piece.trim();
      if (file && !files.includes(file)) {
        files.push(file);
      }
    }
  }
  return files;
}

function printUsage() {
  console.log('Usage: task-lock.js <lock|reserve|unlock|check|check-cross-shard|validateScope|list> [task-id|task-prefix] [agent-name]');
}

function printIdentityHint() {
  console.log('Tip: run `node tools_node/agent-identity.js ensure --write-git` first if agent name is missing.');
}

function main(argv = process.argv.slice(2), adapter = new LockAdapter(createLockAdapterConfig())) {
  const rawArgs = Array.isArray(argv) ? argv : [];
  const command = rawArgs[0];
  const taskIdOrPrefix = rawArgs[1];
  const explicitAgentName = rawArgs[2] && !String(rawArgs[2]).startsWith('--') ? rawArgs[2] : '';
  const agentName = explicitAgentName || adapter.getDefaultAgentName();
  if (!explicitAgentName && agentName && ['lock', 'reserve', 'unlock'].includes(command)) {
    const source = typeof adapter.getDefaultAgentSource === 'function' ? adapter.getDefaultAgentSource() : '';
    console.error(`ℹ️ 未傳入 agent-name，改用預設身分 "${agentName}"${source ? `（來源：${source}）` : ''}；若不是你，請在卡號後面直接傳入你的 agent-name。`);
  }
  const files = parseFiles(rawArgs);

  switch (command) {
    case 'lock':
      if (!taskIdOrPrefix || !agentName) {
        console.error('Usage: task-lock.js lock <task-id> <agent-name> (or resolve identity first)');
        printIdentityHint();
        return 1;
      }
      try {
        adapter.lock(taskIdOrPrefix, agentName, files);
        return 0;
      } catch (error) {
        if (error && error.result) {
          console.error(`cross-shard scope conflict: "${taskIdOrPrefix}"`);
          console.error(JSON.stringify(error.result, null, 2));
        } else {
          console.error(error instanceof Error ? error.message : String(error));
        }
        return 1;
      }

    case 'reserve':
      if (!taskIdOrPrefix || !agentName) {
        console.error('Usage: task-lock.js reserve <task-prefix|task-id> <agent-name> (or resolve identity first)');
        printIdentityHint();
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
        console.error('Usage: task-lock.js unlock <task-id> <agent-name> (agent name is required)');
        printIdentityHint();
        return 1;
      }
      adapter.unlock(taskIdOrPrefix, agentName);
      return Number(process.exitCode || 0);

    case 'check':
      if (!taskIdOrPrefix) {
        console.error('Usage: task-lock.js check <task-id>');
        return 1;
      }
      adapter.check(taskIdOrPrefix);
      return 0;

    case 'check-cross-shard':
    case 'validateScope':
    case 'validate-scope': {
      if (!taskIdOrPrefix) {
        console.error('Usage: task-lock.js check-cross-shard <task-id> --files <file...>');
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
