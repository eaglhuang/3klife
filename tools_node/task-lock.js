#!/usr/bin/env node
/**
 * task-lock.js — 多 Agent 任務鎖定協議
 *
 * 用法:
 *   node tools_node/task-lock.js lock   <task-id> <agent-name>
 *   node tools_node/task-lock.js unlock <task-id> <agent-name>
 *   node tools_node/task-lock.js check  <task-id>
 *   node tools_node/task-lock.js check-cross-shard <task-id> --files <file...>
 *   node tools_node/task-lock.js list
 *
 * 鎖定檔存放: .task-locks/<task-id>.lock.json
 * 格式: { taskId, agentName, lockedAt, files: [] }
 */
'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./lib/project-config');

const projectRoot = config.ROOT;
const lockDir = config.paths.taskLocksDir;
const taskCardDir = path.join(projectRoot, 'docs', 'agent-briefs', 'tasks');

let yamlParser = null;
try {
    yamlParser = require('yaml');
} catch (error) {
    yamlParser = null;
}

function normalizeRel(filePath) {
    return path.relative(projectRoot, path.resolve(projectRoot, filePath)).replace(/\\/g, '/');
}

function getDefaultAgentName() {
    return String(process.env.AGENT_IDENTITY || '').trim();
}

function ensureLockDir() {
    if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
        // 確保 .gitignore 包含 .task-locks/
        const gitignorePath = path.join(projectRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const content = fs.readFileSync(gitignorePath, 'utf8');
            if (!content.includes('.task-locks')) {
                fs.appendFileSync(gitignorePath, '\n# Agent task locks\n.task-locks/\n');
            }
        }
    }
}

function lockPath(taskId) {
    return path.join(lockDir, `${taskId}.lock.json`);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readAllLocks() {
    ensureLockDir();
    return fs.readdirSync(lockDir)
        .filter((entryName) => entryName.endsWith('.lock.json'))
        .sort((left, right) => left.localeCompare(right))
        .map((entryName) => {
            const filePath = path.join(lockDir, entryName);
            const parsed = readJson(filePath);
            return {
                taskId: String(parsed.taskId || '').trim(),
                agentName: String(parsed.agentName || '').trim(),
                lockedAt: String(parsed.lockedAt || '').trim(),
                files: Array.from(new Set((Array.isArray(parsed.files) ? parsed.files : []).map(normalizeRel).filter(Boolean))),
                path: filePath
            };
        });
}

function extractFrontmatter(text) {
    const lines = String(text || '').split(/\r?\n/);
    if (lines[0] !== '---') {
        return '';
    }
    const frontmatterLines = [];
    for (let index = 1; index < lines.length; index += 1) {
        if (lines[index] === '---') {
            return frontmatterLines.join('\n');
        }
        frontmatterLines.push(lines[index]);
    }
    return '';
}

function parseSimpleFrontmatter(rawFrontmatter) {
    const parsed = {};
    for (const line of String(rawFrontmatter || '').split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) {
            continue;
        }
        parsed[match[1]] = match[2].replace(/^"|"$/g, '').trim();
    }
    return parsed;
}

function readTaskFrontmatter(taskId) {
    const filePath = path.join(taskCardDir, `${taskId}.md`);
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const rawFrontmatter = extractFrontmatter(fs.readFileSync(filePath, 'utf8'));
    if (!rawFrontmatter) {
        return {};
    }
    if (yamlParser && typeof yamlParser.parse === 'function') {
        try {
            return yamlParser.parse(rawFrontmatter) || {};
        } catch (error) {
            return parseSimpleFrontmatter(rawFrontmatter);
        }
    }
    return parseSimpleFrontmatter(rawFrontmatter);
}

function normalizeRange(filePath, start, end) {
    const lineStart = Number(start);
    const lineEnd = Number(end);
    if (!Number.isFinite(lineStart) || !Number.isFinite(lineEnd) || lineStart <= 0 || lineEnd <= 0) {
        return null;
    }
    return {
        file: normalizeRel(filePath),
        start: Math.min(lineStart, lineEnd),
        end: Math.max(lineStart, lineEnd)
    };
}

function parseRangeString(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(.+?)(?:#L|:|\s+)(\d+)(?:-|:|\.\.|-L)(\d+)$/);
    if (!match) {
        return null;
    }
    return normalizeRange(match[1].trim(), match[2], match[3]);
}

function collectRangesFromValue(value, output) {
    if (!value) {
        return;
    }
    if (typeof value === 'string') {
        for (const segment of value.split(',')) {
            const parsed = parseRangeString(segment);
            if (parsed) {
                output.push(parsed);
            }
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((entry) => collectRangesFromValue(entry, output));
        return;
    }
    if (typeof value === 'object') {
        if (value.file && (value.start || value.from) && (value.end || value.to)) {
            const parsed = normalizeRange(value.file, value.start || value.from, value.end || value.to);
            if (parsed) {
                output.push(parsed);
            }
            return;
        }
        for (const [filePath, rangeValue] of Object.entries(value)) {
            if (typeof rangeValue === 'string') {
                const parsed = parseRangeString(`${filePath}:${rangeValue}`);
                if (parsed) {
                    output.push(parsed);
                }
            }
        }
    }
}

function getCoexistencePolicy(taskId) {
    const frontmatter = readTaskFrontmatter(taskId);
    const coexistence = frontmatter.coexistence;
    const mode = typeof coexistence === 'string'
        ? coexistence
        : coexistence && typeof coexistence === 'object'
            ? coexistence.mode || coexistence.type || ''
            : frontmatter.coexistence_mode || '';
    const ranges = [];
    if (coexistence && typeof coexistence === 'object') {
        collectRangesFromValue(coexistence.ranges || coexistence.files || coexistence.line_ranges, ranges);
    }
    collectRangesFromValue(frontmatter.coexistence_ranges || frontmatter.line_ranges, ranges);
    return {
        mode: String(mode || '').trim(),
        ranges
    };
}

function rangesForFile(policy, filePath) {
    return policy.ranges.filter((range) => range.file === filePath);
}

function rangesOverlap(left, right) {
    return left.start <= right.end && right.start <= left.end;
}

function coexistenceAllowsOverlap(requestingTaskId, existingTaskId, filePath) {
    const requestingPolicy = getCoexistencePolicy(requestingTaskId);
    const existingPolicy = getCoexistencePolicy(existingTaskId);
    if (requestingPolicy.mode !== 'parallel' || existingPolicy.mode !== 'parallel') {
        return false;
    }
    const requestingRanges = rangesForFile(requestingPolicy, filePath);
    const existingRanges = rangesForFile(existingPolicy, filePath);
    if (requestingRanges.length === 0 || existingRanges.length === 0) {
        return false;
    }
    return !requestingRanges.some((requestingRange) => existingRanges.some((existingRange) => rangesOverlap(requestingRange, existingRange)));
}

function checkCrossShard(taskId, files = []) {
    const normalizedFiles = Array.from(new Set((files || []).map(normalizeRel).filter(Boolean)));
    const conflicts = [];
    const errors = [];
    let locks = [];
    try {
        locks = readAllLocks();
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }

    for (const existing of locks) {
        if (!existing.taskId || existing.taskId === taskId) {
            continue;
        }
        for (const filePath of normalizedFiles) {
            if (!existing.files.includes(filePath)) {
                continue;
            }
            if (coexistenceAllowsOverlap(taskId, existing.taskId, filePath)) {
                continue;
            }
            conflicts.push({
                file: filePath,
                taskId: existing.taskId,
                agentName: existing.agentName,
                lockedAt: existing.lockedAt
            });
        }
    }

    return {
        ok: conflicts.length === 0 && errors.length === 0,
        taskId,
        files: normalizedFiles,
        conflicts,
        errors
    };
}

function assertNoCrossShardConflicts(taskId, files) {
    const result = checkCrossShard(taskId, files);
    if (result.ok) {
        return;
    }
    console.error(`❌ cross-shard 檔案鎖定衝突: "${taskId}"`);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
}

function lock(taskId, agentName, files = []) {
    ensureLockDir();
    const lp = lockPath(taskId);
    const normalizedFiles = Array.from(new Set((files || []).map(normalizeRel).filter(Boolean)));
    assertNoCrossShardConflicts(taskId, normalizedFiles);
    if (fs.existsSync(lp)) {
        const existing = readJson(lp);
        if (existing.agentName === agentName) {
            console.log(`🔒 "${taskId}" 已由你 (${agentName}) 鎖定，更新時間戳`);
            existing.lockedAt = new Date().toISOString();
            if (normalizedFiles.length > 0) {
                existing.files = normalizedFiles;
            }
            fs.writeFileSync(lp, JSON.stringify(existing, null, 2), 'utf8');
            return;
        }
        console.error(`❌ 鎖定失敗: "${taskId}" 已被 "${existing.agentName}" 於 ${existing.lockedAt} 鎖定`);
        process.exit(1);
    }
    const lockData = {
        taskId,
        agentName,
        lockedAt: new Date().toISOString(),
        files: normalizedFiles
    };
    fs.writeFileSync(lp, JSON.stringify(lockData, null, 2), 'utf8');
    console.log(`🔒 已鎖定 "${taskId}" → ${agentName}`);
    if (normalizedFiles.length > 0) {
        console.log(`   files: ${normalizedFiles.join(', ')}`);
    }
}

function unlock(taskId, agentName) {
    ensureLockDir();
    const lp = lockPath(taskId);
    if (!fs.existsSync(lp)) {
        console.log(`⚠️  "${taskId}" 未被鎖定，跳過`);
        return;
    }
    const existing = readJson(lp);
    if (existing.agentName !== agentName) {
        console.error(`❌ 解鎖失敗: "${taskId}" 由 "${existing.agentName}" 鎖定，你是 "${agentName}"`);
        process.exit(1);
    }
    fs.unlinkSync(lp);
    console.log(`🔓 已解鎖 "${taskId}"`);
}

function check(taskId) {
    ensureLockDir();
    const lp = lockPath(taskId);
    if (!fs.existsSync(lp)) {
        console.log(`✅ "${taskId}" 未被鎖定，可安全操作`);
        return;
    }
    const existing = readJson(lp);
    console.log(`🔒 "${taskId}" 已被 "${existing.agentName}" 鎖定`);
    console.log(`   鎖定時間: ${existing.lockedAt}`);
    if (existing.files && existing.files.length > 0) {
        console.log(`   修改檔案: ${existing.files.join(', ')}`);
    }
}

function listLocks() {
    ensureLockDir();
    const files = fs.readdirSync(lockDir).filter(f => f.endsWith('.lock.json'));
    if (files.length === 0) {
        console.log('✅ 目前無任何任務鎖定');
        return;
    }
    console.log(`🔒 ${files.length} 個任務被鎖定:\n`);
    for (const f of files) {
        const data = readJson(path.join(lockDir, f));
        console.log(`  ${data.taskId} → ${data.agentName} (${data.lockedAt})`);
    }
}

// CLI
const rawArgs = process.argv.slice(2);
const command = rawArgs[0];
const taskId = rawArgs[1];
const explicitAgentName = rawArgs[2] && !String(rawArgs[2]).startsWith('--') ? rawArgs[2] : '';
const agentName = explicitAgentName || getDefaultAgentName();
const filesFlagIndex = rawArgs.indexOf('--files');
const files = filesFlagIndex >= 0 ? rawArgs.slice(filesFlagIndex + 1).filter((arg) => !arg.startsWith('--')) : [];

switch (command) {
    case 'lock':
        if (!taskId || !agentName) { console.error('用法: task-lock.js lock <task-id> <agent-name>（或先設 AGENT_IDENTITY）'); process.exit(1); }
        lock(taskId, agentName, files);
        break;
    case 'unlock':
        if (!taskId || !agentName) { console.error('用法: task-lock.js unlock <task-id> <agent-name>（或先設 AGENT_IDENTITY）'); process.exit(1); }
        unlock(taskId, agentName);
        break;
    case 'check':
        if (!taskId) { console.error('用法: task-lock.js check <task-id>'); process.exit(1); }
        check(taskId);
        break;
    case 'check-cross-shard': {
        if (!taskId) { console.error('用法: task-lock.js check-cross-shard <task-id> --files <file...>'); process.exit(1); }
        const result = checkCrossShard(taskId, files);
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
        break;
    }
    case 'list':
        listLocks();
        break;
    default:
        console.log('用法: task-lock.js <lock|unlock|check|check-cross-shard|list> [task-id] [agent-name]（lock/unlock 可改用 AGENT_IDENTITY）');
        process.exit(1);
}
