#!/usr/bin/env node
/**
 * gen-mission-text-i18n.js — 任務內容資料（標題、簡介、事實、目標、提示）的語系鍵同步（PROG-2-10166）
 *
 * 讀 assets/resources/data/mission-index.json 列的所有任務定義，依 MissionTextKeys.ts 的命名
 * 產生 mission.def.* 鍵：
 *   - 把繁中原文寫進 zh-TW.json（內容資料的真相仍在任務 JSON，zh-TW 只是同步副本）
 *   - 回報 zh-CN／en／ja 缺哪些鍵（新增任務後跑一次，照缺的鍵補譯文）
 *   - --export <檔>：把「不重複的繁中原文」輸出成 JSON，給翻譯用
 * 用法：node tools_node/gen-mission-text-i18n.js [--check] [--export out.json]
 *   --check：只檢查不寫檔，有缺或 zh-TW 不同步就 exit 1
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];

// 命名與 assets/scripts/core/mission/MissionTextKeys.ts 一致（單測會比對）
const base = (d) => `mission.def.${d}`;
/** FNV-1a 32 位元，與 MissionTextKeys.ts 的 textHash 一致（鍵不含分支／誤導資訊，避免洩漏真相） */
function textHash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
}
const K = {
    title: (d) => `${base(d)}.title`,
    brief: (d) => `${base(d)}.brief`,
    factLabel: (d, f) => `${base(d)}.fact.${f}.label`,
    text: (d, zh) => `${base(d)}.s.${textHash(zh)}`,
};

/** 全部任務的 鍵 → 繁中原文 */
function collectSource() {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mission-index.json'), 'utf8'));
    const out = {};
    for (const entry of idx.defs) {
        const def = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data', entry.path), 'utf8'));
        const id = def.id;
        out[K.title(id)] = def.text.title;
        out[K.brief(id)] = def.text.brief;
        const put = (key, zh) => {
            if (out[key] !== undefined && out[key] !== zh) throw new Error(`鍵雜湊衝突：${key}`);
            out[key] = zh;
        };
        for (const f of def.facts || []) {
            out[K.factLabel(id, f.key)] = f.label;
            for (const lv of f.levels) put(K.text(id, lv.text), lv.text);
            if (f.decoy) put(K.text(id, f.decoy), f.decoy);
        }
        for (const b of def.branches || []) {
            put(K.text(id, b.objective.text), b.objective.text);
            if (b.presented && b.presented.objectiveText) put(K.text(id, b.presented.objectiveText), b.presented.objectiveText);
            ((b.presented && b.presented.hints) || []).forEach((h) => put(K.text(id, h), h));
        }
    }
    return out;
}

function main() {
    const args = process.argv.slice(2);
    const check = args.includes('--check');
    const exportAt = args.indexOf('--export');
    const source = collectSource();
    if (exportAt >= 0) {
        const uniq = [...new Set(Object.values(source))];
        fs.writeFileSync(args[exportAt + 1], JSON.stringify(uniq, null, 1), 'utf8');
        console.log(`[mission-text-i18n] 匯出 ${uniq.length} 句不重複原文 → ${args[exportAt + 1]}`);
        return;
    }
    let bad = false;
    for (const lang of LANGS) {
        const file = path.join(ROOT, 'assets/resources/i18n', `${lang}.json`);
        const dict = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (lang === 'zh-TW') {
            let changed = 0;
            for (const [k, v] of Object.entries(source)) if (dict[k] !== v) { dict[k] = v; changed++; }
            if (changed > 0) {
                if (check) { console.log(`[mission-text-i18n] zh-TW 有 ${changed} 句不同步`); bad = true; } else {
                    fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n', 'utf8');
                    console.log(`[mission-text-i18n] zh-TW 同步 ${changed} 句`);
                }
            }
        } else {
            const missing = Object.keys(source).filter((k) => dict[k] === undefined);
            if (missing.length > 0) { bad = true; console.log(`[mission-text-i18n] ${lang} 缺 ${missing.length} 鍵，例：${missing.slice(0, 3).join(', ')}`); }
        }
    }
    if (bad && check) process.exit(1);
    console.log(`[mission-text-i18n] ${Object.keys(source).length} 鍵，完成`);
}

main();
