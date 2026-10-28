#!/usr/bin/env node
// validate-story-layers.js
// STORY-05：角色雙故事層檢核（歷史趣聞／血脈傳聞／六格故事帶）
// @spec-source → 角色雙故事層補遺_2026-04-04（doc_spec_0013）§第一波規則
//
// 用法：node tools_node/validate-story-layers.js [--file <path>]
//   - 預設驗證 assets/resources/data/generals.json
//   - 有問題時 exit 1；compute-gate 以 warn 方式接入（缺值不擋既有資料）
//
// 檢查項目：
//   1. storyStripCells 必須是六格，依序為 origin／faction／role／awakening／bloodline／future
//   2. 每格文字非空，且不含 '???' 佔位字
//   3. historicalAnecdote、bloodlineRumor 非空，且不含 '???'
//
// 未檢查（需要人工判斷）：歷史趣聞偏前段、血脈傳聞偏後段、中段命運介入。

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_FILE = path.join(ROOT, 'assets', 'resources', 'data', 'generals.json');
const PLACEHOLDER = '???';
const STRIP_SLOTS = ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'];
const TEXT_FIELDS = ['historicalAnecdote', 'bloodlineRumor'];

function isBlank(value) {
    return typeof value !== 'string' || value.trim() === '';
}

function checkStoryLayers(generals) {
    const issues = [];
    for (const general of generals) {
        const id = general && general.id ? general.id : '(無 id)';
        const cells = general ? general.storyStripCells : undefined;

        if (!Array.isArray(cells)) {
            issues.push({ id, message: '缺少 storyStripCells' });
        } else {
            const slots = cells.map((cell) => (cell && cell.slot) || '(無 slot)');
            if (slots.join(',') !== STRIP_SLOTS.join(',')) {
                issues.push({ id, message: `六格順序錯誤：${slots.join(',')}` });
            }
            for (const cell of cells) {
                const slot = (cell && cell.slot) || '(無 slot)';
                const text = cell ? cell.text : undefined;
                if (isBlank(text)) issues.push({ id, message: `${slot} 格文字為空` });
                else if (text.includes(PLACEHOLDER)) issues.push({ id, message: `${slot} 格含佔位字 ${PLACEHOLDER}` });
            }
        }

        for (const field of TEXT_FIELDS) {
            const value = general ? general[field] : undefined;
            if (isBlank(value)) issues.push({ id, message: `${field} 為空` });
            else if (value.includes(PLACEHOLDER)) issues.push({ id, message: `${field} 含佔位字 ${PLACEHOLDER}` });
        }
    }
    return issues;
}

function main() {
    const argIndex = process.argv.indexOf('--file');
    const file = argIndex >= 0 && process.argv[argIndex + 1] ? path.resolve(process.argv[argIndex + 1]) : DEFAULT_FILE;
    const generals = JSON.parse(fs.readFileSync(file, 'utf8'));
    const issues = checkStoryLayers(generals);

    console.log(`[story-layers] 檢查 ${generals.length} 位武將，問題 ${issues.length} 筆`);
    for (const issue of issues) console.log(`  - ${issue.id}: ${issue.message}`);
    process.exit(issues.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { checkStoryLayers, STRIP_SLOTS };
