#!/usr/bin/env node
// validate-loading-tips.js
// LT-05：血脈命鏡 Loading Tips 內容的 schema 與權重檢核
// @spec-source → 血脈命鏡LoadingTips補遺_2026-04-04（LT-01 四池與持有／未持有權重）
//
// 由 validate-ui-specs.js 呼叫，不單獨接閘門。
//
// 檢查項目：
//   1. categories 必須正好是 system／history／bloodline／tease 四池，每池為非空字串陣列
//   2. 每條文案非空、不含 '???' 佔位字、不重複
//   3. weights.owned 與 weights.unowned 的鍵必須與四池一致，權重為非負數，且各自至少一池大於 0

'use strict';

const LOADING_TIP_CATEGORIES = ['system', 'history', 'bloodline', 'tease'];
const WEIGHT_SETS = ['owned', 'unowned'];
const PLACEHOLDER = '???';

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameKeys(actual, expected) {
    const a = Object.keys(actual).sort().join(',');
    const e = [...expected].sort().join(',');
    return a === e;
}

/** 回傳問題清單；空陣列代表通過。不改輸入。 */
function checkLoadingTips(content) {
    const issues = [];
    if (!isRecord(content)) return ['內容必須為物件'];

    if (!isRecord(content.categories)) {
        issues.push('categories 必須為物件');
    } else {
        if (!sameKeys(content.categories, LOADING_TIP_CATEGORIES)) {
            issues.push(`categories 必須正好包含四池：${LOADING_TIP_CATEGORIES.join('、')}`);
        }
        for (const category of LOADING_TIP_CATEGORIES) {
            const tips = content.categories[category];
            if (!Array.isArray(tips) || tips.length === 0) {
                issues.push(`categories.${category} 必須為非空陣列`);
                continue;
            }
            const seen = new Set();
            tips.forEach((tip, index) => {
                const where = `categories.${category}[${index}]`;
                if (typeof tip !== 'string' || tip.trim() === '') {
                    issues.push(`${where} 必須為非空字串`);
                    return;
                }
                if (tip.includes(PLACEHOLDER)) issues.push(`${where} 含佔位字 ${PLACEHOLDER}`);
                if (seen.has(tip)) issues.push(`${where} 與同池文案重複`);
                seen.add(tip);
            });
        }
    }

    if (!isRecord(content.weights)) {
        issues.push('weights 必須為物件');
        return issues;
    }
    for (const set of WEIGHT_SETS) {
        const weights = content.weights[set];
        if (!isRecord(weights)) {
            issues.push(`weights.${set} 必須為物件`);
            continue;
        }
        if (!sameKeys(weights, LOADING_TIP_CATEGORIES)) {
            issues.push(`weights.${set} 的鍵必須與四池一致`);
        }
        let total = 0;
        for (const category of LOADING_TIP_CATEGORIES) {
            const value = weights[category];
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
                issues.push(`weights.${set}.${category} 必須為非負數`);
            } else {
                total += value;
            }
        }
        if (total <= 0) issues.push(`weights.${set} 至少要有一池權重大於 0`);
    }
    return issues;
}

module.exports = { checkLoadingTips, LOADING_TIP_CATEGORIES };
