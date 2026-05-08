'use strict';

const fs = require('fs');
const path = require('path');
const handoffDiff = require('../../lib/handoff-diff-core');
const {
    formatTaskIdInspection,
    inspectTaskId,
    reserveNextTaskId,
} = require('../../lib/task-id-guard');
const { createLockAdapterConfig } = require('./lock-adapter-config');

let yamlParser = null;
try {
    yamlParser = require('yaml');
} catch (error) {
    yamlParser = null;
}

class LockAdapter {
    constructor(config = {}) {
        this.config = createLockAdapterConfig(config);
        this.projectRoot = this.config.projectRoot;
        this.lockDir = this.config.lockDir;
        this.taskCardDir = this.config.taskCardDir;
    }

    normalizeRel(filePath) {
        return path.relative(this.projectRoot, path.resolve(this.projectRoot, filePath)).replace(/\\/g, '/');
    }

    appendTrace(event) {
        return handoffDiff.appendTaskLockTrace(event, {
            repositoryRoot: this.projectRoot,
            taskLockDir: this.lockDir,
            tracePath: process.env[this.config.tracePathEnv || 'TASK_LOCK_TRACE_JSONL'] || '',
        });
    }

    lockFencePath() {
        return path.join(this.lockDir, '.task-lock-acquire.json');
    }

    acquireLockFence(taskId, agentName, files = []) {
        this.ensureLockDir();
        const fencePath = this.lockFencePath();
        const fenceData = {
            taskId,
            agentName,
            files: Array.from(new Set((files || []).map((filePath) => this.normalizeRel(filePath)).filter(Boolean))),
            acquiredAt: new Date().toISOString(),
            pid: process.pid,
        };

        try {
            fs.writeFileSync(fencePath, `${JSON.stringify(fenceData, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
            return fenceData;
        } catch (error) {
            if (error && error.code === 'EEXIST') {
                let existing = null;
                try {
                    existing = this.readJson(fencePath);
                } catch {
                    existing = null;
                }
                const busyError = new Error(existing
                    ? `task-lock acquisition busy: ${existing.taskId || 'unknown'} / ${existing.agentName || 'unknown'} 正在變更 task scope`
                    : 'task-lock acquisition busy: 另一個 agent 正在變更 task scope');
                busyError.code = 'TASK_LOCK_BUSY';
                busyError.fence = existing;
                throw busyError;
            }
            throw error;
        }
    }

    releaseLockFence() {
        const fencePath = this.lockFencePath();
        try {
            if (fs.existsSync(fencePath)) {
                fs.unlinkSync(fencePath);
            }
        } catch {
            // best-effort cleanup only
        }
    }

    buildScopeFingerprint(files) {
        return handoffDiff.buildScopeFingerprint(this.projectRoot, files);
    }

    getDefaultAgentName() {
        return String(process.env.AGENT_IDENTITY || '').trim();
    }

    ensureLockDir() {
        if (!fs.existsSync(this.lockDir)) {
            fs.mkdirSync(this.lockDir, { recursive: true });
            const gitignorePath = path.join(this.projectRoot, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                if (!content.includes('.task-locks')) {
                    fs.appendFileSync(gitignorePath, '\n# Agent task locks\n.task-locks/\n');
                }
            }
        }
    }

    lockPath(taskId) {
        return path.join(this.lockDir, `${taskId}.lock.json`);
    }

    reserve(prefix, agentName) {
        const reservation = reserveNextTaskId(this.projectRoot, prefix, agentName);
        const lockPath = this.lockPath(reservation.taskId);
        this.appendTrace({
            command: 'reserve',
            outcome: 'success',
            taskId: reservation.taskId,
            agentName,
            lockPath: this.normalizeRel(lockPath),
            files: [],
            scopeFingerprint: '',
            scopeFingerprintVersion: 'scope-fingerprint/v1',
            conflictCount: 0,
        });
        console.log(`🆔 已保留新卡號 "${reservation.taskId}" → ${agentName}`);
        return reservation;
    }

    readJson(filePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    readAllLocks() {
        this.ensureLockDir();
        return fs.readdirSync(this.lockDir)
            .filter((entryName) => entryName.endsWith('.lock.json'))
            .sort((left, right) => left.localeCompare(right))
            .map((entryName) => {
                const filePath = path.join(this.lockDir, entryName);
                const parsed = this.readJson(filePath);
                return {
                    taskId: String(parsed.taskId || '').trim(),
                    agentName: String(parsed.agentName || '').trim(),
                    lockedAt: String(parsed.lockedAt || '').trim(),
                    scopeFingerprint: String(parsed.scopeFingerprint || '').trim(),
                    scopeFingerprintVersion: String(parsed.scopeFingerprintVersion || '').trim(),
                    files: Array.from(new Set((Array.isArray(parsed.files) ? parsed.files : []).map((filePath) => this.normalizeRel(filePath)).filter(Boolean))),
                    path: filePath,
                };
            });
    }

    extractFrontmatter(text) {
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

    parseSimpleFrontmatter(rawFrontmatter) {
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

    readTaskFrontmatter(taskId) {
        const filePath = path.join(this.taskCardDir, `${taskId}.md`);
        if (!fs.existsSync(filePath)) {
            return {};
        }
        const rawFrontmatter = this.extractFrontmatter(fs.readFileSync(filePath, 'utf8'));
        if (!rawFrontmatter) {
            return {};
        }
        if (yamlParser && typeof yamlParser.parse === 'function') {
            try {
                return yamlParser.parse(rawFrontmatter) || {};
            } catch (error) {
                return this.parseSimpleFrontmatter(rawFrontmatter);
            }
        }
        return this.parseSimpleFrontmatter(rawFrontmatter);
    }

    normalizeRange(filePath, start, end) {
        const lineStart = Number(start);
        const lineEnd = Number(end);
        if (!Number.isFinite(lineStart) || !Number.isFinite(lineEnd) || lineStart <= 0 || lineEnd <= 0) {
            return null;
        }
        return {
            file: this.normalizeRel(filePath),
            start: Math.min(lineStart, lineEnd),
            end: Math.max(lineStart, lineEnd),
        };
    }

    parseRangeString(value) {
        const text = String(value || '').trim();
        const match = text.match(/^(.+?)(?:#L|:|\s+)(\d+)(?:-|:|\.\.|-L)(\d+)$/);
        if (!match) {
            return null;
        }
        return this.normalizeRange(match[1].trim(), match[2], match[3]);
    }

    collectRangesFromValue(value, output) {
        if (!value) {
            return;
        }
        if (typeof value === 'string') {
            for (const segment of value.split(',')) {
                const parsed = this.parseRangeString(segment);
                if (parsed) {
                    output.push(parsed);
                }
            }
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((entry) => this.collectRangesFromValue(entry, output));
            return;
        }
        if (typeof value === 'object') {
            if (value.file && (value.start || value.from) && (value.end || value.to)) {
                const parsed = this.normalizeRange(value.file, value.start || value.from, value.end || value.to);
                if (parsed) {
                    output.push(parsed);
                }
                return;
            }
            for (const [filePath, rangeValue] of Object.entries(value)) {
                if (typeof rangeValue === 'string') {
                    const parsed = this.parseRangeString(`${filePath}:${rangeValue}`);
                    if (parsed) {
                        output.push(parsed);
                    }
                }
            }
        }
    }

    getCoexistencePolicy(taskId) {
        const frontmatter = this.readTaskFrontmatter(taskId);
        const coexistence = frontmatter.coexistence;
        const mode = typeof coexistence === 'string'
            ? coexistence
            : coexistence && typeof coexistence === 'object'
                ? coexistence.mode || coexistence.type || ''
                : frontmatter.coexistence_mode || '';
        const ranges = [];
        if (coexistence && typeof coexistence === 'object') {
            this.collectRangesFromValue(coexistence.ranges || coexistence.files || coexistence.line_ranges, ranges);
        }
        this.collectRangesFromValue(frontmatter.coexistence_ranges || frontmatter.line_ranges, ranges);
        return {
            mode: String(mode || '').trim(),
            ranges,
        };
    }

    rangesForFile(policy, filePath) {
        return policy.ranges.filter((range) => range.file === filePath);
    }

    rangesOverlap(left, right) {
        return left.start <= right.end && right.start <= left.end;
    }

    coexistenceAllowsOverlap(requestingTaskId, existingTaskId, filePath) {
        const requestingPolicy = this.getCoexistencePolicy(requestingTaskId);
        const existingPolicy = this.getCoexistencePolicy(existingTaskId);
        if (requestingPolicy.mode !== 'parallel' || existingPolicy.mode !== 'parallel') {
            return false;
        }
        const requestingRanges = this.rangesForFile(requestingPolicy, filePath);
        const existingRanges = this.rangesForFile(existingPolicy, filePath);
        if (requestingRanges.length === 0 || existingRanges.length === 0) {
            return false;
        }
        return !requestingRanges.some((requestingRange) => existingRanges.some((existingRange) => this.rangesOverlap(requestingRange, existingRange)));
    }

    checkCrossShard(taskId, files = []) {
        const normalizedFiles = Array.from(new Set((files || []).map((filePath) => this.normalizeRel(filePath)).filter(Boolean)));
        const conflicts = [];
        const errors = [];
        let locks = [];
        try {
            locks = this.readAllLocks();
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
                if (this.coexistenceAllowsOverlap(taskId, existing.taskId, filePath)) {
                    continue;
                }
                conflicts.push({
                    file: filePath,
                    taskId: existing.taskId,
                    agentName: existing.agentName,
                    lockedAt: existing.lockedAt,
                });
            }
        }

        return {
            ok: conflicts.length === 0 && errors.length === 0,
            taskId,
            files: normalizedFiles,
            conflicts,
            errors,
        };
    }

    validateScope(taskId, files = []) {
        return this.checkCrossShard(taskId, files);
    }

    assertNoCrossShardConflicts(taskId, files) {
        const result = this.checkCrossShard(taskId, files);
        if (result.ok) {
            return result;
        }
        const error = new Error(`cross-shard 檔案鎖定衝突: "${taskId}"`);
        error.result = result;
        throw error;
    }

    lock(taskId, agentName, files = []) {
        this.ensureLockDir();
        const lp = this.lockPath(taskId);
        const normalizedFiles = Array.from(new Set((files || []).map((filePath) => this.normalizeRel(filePath)).filter(Boolean)));
        const fence = this.acquireLockFence(taskId, agentName, normalizedFiles);
        try {
            const conflictResult = this.assertNoCrossShardConflicts(taskId, normalizedFiles);
            if (fs.existsSync(lp)) {
                const existing = this.readJson(lp);
                if (existing.agentName === agentName) {
                    const nextFiles = normalizedFiles.length > 0 ? normalizedFiles : Array.from(new Set((Array.isArray(existing.files) ? existing.files : []).map((filePath) => this.normalizeRel(filePath)).filter(Boolean)));
                    const currentFingerprint = this.buildScopeFingerprint(nextFiles);
                    const updated = {
                        ...existing,
                        lockedAt: new Date().toISOString(),
                        files: nextFiles,
                        scopeFingerprint: currentFingerprint.fingerprint,
                        scopeFingerprintVersion: currentFingerprint.version,
                        scopeSnapshotAt: new Date().toISOString(),
                    };
                    fs.writeFileSync(lp, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
                    this.appendTrace({
                        command: 'lock',
                        outcome: 'success',
                        taskId,
                        agentName,
                        lockPath: this.normalizeRel(lp),
                        files: updated.files,
                        scopeFingerprint: updated.scopeFingerprint,
                        scopeFingerprintVersion: updated.scopeFingerprintVersion,
                        conflictCount: conflictResult.conflicts.length,
                    });
                    console.log(`🔒 "${taskId}" 已由你 (${agentName}) 鎖定，更新時間戳`);
                    return;
                }
                const lockError = new Error(`鎖定失敗: "${taskId}" 已被 "${existing.agentName}" 於 ${existing.lockedAt} 鎖定`);
                lockError.result = {
                    ok: false,
                    taskId,
                    files: normalizedFiles,
                    conflicts: [{ taskId: existing.taskId, agentName: existing.agentName, lockedAt: existing.lockedAt }],
                    errors: [],
                };
                throw lockError;
            }
            const currentFingerprint = this.buildScopeFingerprint(normalizedFiles);
            const lockData = {
                taskId,
                agentName,
                lockedAt: new Date().toISOString(),
                files: normalizedFiles,
                scopeFingerprint: currentFingerprint.fingerprint,
                scopeFingerprintVersion: currentFingerprint.version,
                scopeSnapshotAt: new Date().toISOString(),
            };
            fs.writeFileSync(lp, `${JSON.stringify(lockData, null, 2)}\n`, 'utf8');
            this.appendTrace({
                command: 'lock',
                outcome: 'success',
                taskId,
                agentName,
                lockPath: this.normalizeRel(lp),
                files: normalizedFiles,
                scopeFingerprint: lockData.scopeFingerprint,
                scopeFingerprintVersion: lockData.scopeFingerprintVersion,
                conflictCount: conflictResult.conflicts.length,
            });
            console.log(`🔒 已鎖定 "${taskId}" → ${agentName}`);
            if (normalizedFiles.length > 0) {
                console.log(`   files: ${normalizedFiles.join(', ')}`);
            }
            if (lockData.scopeFingerprint) {
                console.log(`   scopeFingerprint: ${lockData.scopeFingerprint}`);
            }
        } catch (error) {
            this.appendTrace({
                command: 'lock',
                outcome: 'fail',
                taskId,
                agentName,
                lockPath: this.normalizeRel(lp),
                files: normalizedFiles,
                error: error instanceof Error ? error.message : String(error),
                conflicts: error && error.result && Array.isArray(error.result.conflicts) ? error.result.conflicts : [],
            });
            throw error;
        } finally {
            this.releaseLockFence(fence);
        }
    }

    unlock(taskId, agentName) {
        this.ensureLockDir();
        const lp = this.lockPath(taskId);
        if (!fs.existsSync(lp)) {
            console.log(`⚠️  "${taskId}" 未被鎖定，跳過`);
            return;
        }
        const existing = this.readJson(lp);
        const humanOverride = existing.agentName !== agentName && this.config.isHumanOverrideAgentName(agentName);
        if (existing.agentName !== agentName && !humanOverride) {
            console.error(`❌ 解鎖失敗: "${taskId}" 由 "${existing.agentName}" 鎖定，你是 "${agentName}"`);
            process.exitCode = 1;
            return;
        }
        fs.unlinkSync(lp);
        this.appendTrace({
            command: 'unlock',
            outcome: 'success',
            taskId,
            agentName,
            lockPath: this.normalizeRel(lp),
            files: Array.isArray(existing.files) ? existing.files : [],
            scopeFingerprint: String(existing.scopeFingerprint || '').trim(),
            humanOverride,
        });
        if (humanOverride) {
            console.log(`🔓 已由人類 "${agentName}" 覆寫解鎖 "${taskId}"（原鎖定者: "${existing.agentName}"）`);
            return;
        }
        console.log(`🔓 已解鎖 "${taskId}"`);
    }

    check(taskId) {
        this.ensureLockDir();
        const lp = this.lockPath(taskId);
        if (!fs.existsSync(lp)) {
            const inspection = inspectTaskId(this.projectRoot, taskId);
            if (!inspection.occupied) {
                console.log(`✅ "${taskId}" 未被鎖定，且尚未被任務卡 / task store 佔用，可作為新卡號`);
                return;
            }
            console.log(`⚠️  "${taskId}" 未被鎖定，但已被佔用`);
            console.log(`   ${formatTaskIdInspection(inspection)}`);
            return;
        }
        const existing = this.readJson(lp);
        console.log(`🔒 "${taskId}" 已被 "${existing.agentName}" 鎖定`);
        console.log(`   鎖定時間: ${existing.lockedAt}`);
        if (existing.files && existing.files.length > 0) {
            console.log(`   修改檔案: ${existing.files.join(', ')}`);
        }
        if (existing.scopeFingerprint) {
            const currentFingerprint = this.buildScopeFingerprint(existing.files || []);
            const fingerprintMatch = currentFingerprint.fingerprint === existing.scopeFingerprint;
            console.log(`   scopeFingerprint: ${existing.scopeFingerprint}${fingerprintMatch ? '' : ' (stale)'}`);
            if (!fingerprintMatch) {
                console.log(`   currentFingerprint: ${currentFingerprint.fingerprint}`);
            }
            this.appendTrace({
                command: 'check',
                outcome: fingerprintMatch ? 'success' : 'fail',
                taskId,
                agentName: existing.agentName,
                lockPath: this.normalizeRel(lp),
                files: Array.isArray(existing.files) ? existing.files : [],
                scopeFingerprint: String(existing.scopeFingerprint || '').trim(),
                currentFingerprint: currentFingerprint.fingerprint,
                fingerprintMatch,
            });
        } else {
            this.appendTrace({
                command: 'check',
                outcome: 'success',
                taskId,
                agentName: existing.agentName,
                lockPath: this.normalizeRel(lp),
                files: Array.isArray(existing.files) ? existing.files : [],
                scopeFingerprint: '',
                currentFingerprint: '',
                fingerprintMatch: null,
            });
        }
    }

    list() {
        this.ensureLockDir();
        const locks = this.readAllLocks();
        if (locks.length === 0) {
            console.log('✅ 目前無任何任務鎖定');
            return locks;
        }
        console.log(`🔒 ${locks.length} 個任務被鎖定:\n`);
        for (const lock of locks) {
            console.log(`  ${lock.taskId} → ${lock.agentName} (${lock.lockedAt})`);
        }
        return locks;
    }
}

function createLockAdapter(config = {}) {
    return new LockAdapter(config);
}

module.exports = {
    LockAdapter,
    createLockAdapter,
};