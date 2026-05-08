'use strict';

const path = require('node:path');
const projectConfig = require('../../lib/project-config');

const ROOT = projectConfig.ROOT;
const DEFAULT_LOCK_DIR = projectConfig.paths.taskLocksDir;
const DEFAULT_TASK_CARD_DIR = path.join(ROOT, 'docs', 'agent-briefs', 'tasks');
const DEFAULT_TRACE_ENV = 'TASK_LOCK_TRACE_JSONL';

const knownAgentNamePatterns = Object.freeze([
    /^vs-insiders-/i,
    /^vs-code-/i,
    /^claude-code-/i,
    /^claudecode[_-]/i,
    /^codex-/i,
    /^agent-/i,
    /^githubcopilot$/i,
    /^github-copilot/i,
    /^copilot/i,
    /^cursor$/i,
    /^aider$/i,
    /^openai(?:[-_ ].*)?$/i,
    /^gpt(?:[-_ ].*)?$/i,
    /^bot(?:[-_ ].*)?$/i,
]);

function isRecognizedAgentName(agentName) {
    const normalized = String(agentName || '').trim();
    if (!normalized) {
        return false;
    }
    if (normalized.includes('/') || normalized.includes('\\')) {
        return false;
    }
    if (knownAgentNamePatterns.some((pattern) => pattern.test(normalized))) {
        return true;
    }
    if (/(^|[-_. ])(agent|assistant|copilot|claude|cursor|aider|gpt|bot)(?:$|[-_. ])/i.test(normalized)) {
        return true;
    }
    return false;
}

function isHumanOverrideAgentName(agentName) {
    const normalized = String(agentName || '').trim();
    if (!normalized) {
        return false;
    }
    if (normalized.includes('/') || normalized.includes('\\')) {
        return false;
    }
    return !isRecognizedAgentName(normalized) && /^[\p{L}\p{N}._ -]+$/u.test(normalized);
}

function createLockAdapterConfig(overrides = {}) {
    return Object.freeze(Object.assign({
        projectRoot: ROOT,
        lockDir: DEFAULT_LOCK_DIR,
        taskCardDir: DEFAULT_TASK_CARD_DIR,
        tracePathEnv: DEFAULT_TRACE_ENV,
        knownAgentNamePatterns,
        isRecognizedAgentName,
        isHumanOverrideAgentName,
    }, overrides));
}

const defaultLockAdapterConfig = createLockAdapterConfig();

module.exports = {
    ROOT,
    DEFAULT_LOCK_DIR,
    DEFAULT_TASK_CARD_DIR,
    DEFAULT_TRACE_ENV,
    knownAgentNamePatterns,
    isRecognizedAgentName,
    isHumanOverrideAgentName,
    createLockAdapterConfig,
    defaultLockAdapterConfig,
};
