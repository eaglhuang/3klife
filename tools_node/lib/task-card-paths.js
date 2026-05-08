'use strict';

const fs = require('fs');
const path = require('path');

const TASK_CARD_DIR_REL = 'docs/agent-briefs/tasks';

function normalizeTaskId(taskId) {
    return String(taskId || '').trim();
}

function toPosix(filePath) {
    return String(filePath || '').replace(/\\/g, '/');
}

function inferTaskCardGroup(taskId) {
    const normalizedTaskId = normalizeTaskId(taskId);
    const match = normalizedTaskId.match(/^([A-Za-z0-9]+)/);
    return match ? match[1].toUpperCase() : '';
}

function getTaskCardRelativePath(taskId, taskCardDirRel = TASK_CARD_DIR_REL) {
    const normalizedTaskId = normalizeTaskId(taskId);
    if (!normalizedTaskId) {
        return '';
    }
    const group = inferTaskCardGroup(normalizedTaskId) || 'MISC';
    return toPosix(path.join(taskCardDirRel, group, `${normalizedTaskId}.md`));
}

function listFilesRecursive(baseDir) {
    if (!fs.existsSync(baseDir)) {
        return [];
    }
    const files = [];
    const stack = [baseDir];
    while (stack.length > 0) {
        const currentDir = stack.pop();
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const nextPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(nextPath);
            } else {
                files.push(nextPath);
            }
        }
    }
    return files;
}

function listTaskCardFiles(projectRoot, taskCardDirRel = TASK_CARD_DIR_REL) {
    const taskCardDir = path.join(projectRoot, taskCardDirRel);
    return listFilesRecursive(taskCardDir)
        .filter((filePath) => filePath.endsWith('.md'));
}

function findTaskCardPath(projectRoot, taskId, taskCardDirRel = TASK_CARD_DIR_REL) {
    const normalizedTaskId = normalizeTaskId(taskId);
    if (!normalizedTaskId) {
        return '';
    }

    const expectedPath = path.join(projectRoot, getTaskCardRelativePath(normalizedTaskId, taskCardDirRel));
    if (fs.existsSync(expectedPath)) {
        return expectedPath;
    }

    const suffix = `${normalizedTaskId}.md`;
    const matches = listTaskCardFiles(projectRoot, taskCardDirRel)
        .filter((filePath) => path.basename(filePath) === suffix)
        .sort((left, right) => left.localeCompare(right));
    return matches[0] || '';
}

module.exports = {
    TASK_CARD_DIR_REL,
    findTaskCardPath,
    getTaskCardRelativePath,
    inferTaskCardGroup,
    listTaskCardFiles,
    normalizeTaskId,
    toPosix,
};