#!/usr/bin/env node
/**
 * validate-mission-data.js — 通用任務資料檔驗證（PROG-2-9145）
 *
 * 1. 用 tools_node/mission-data.schema.json（JSON Schema draft-07）檢查所有任務定義與 mission-*.json。
 * 2. 再做 schema 表達不了的語意檢查：
 *    - 每個隱藏變體在情報 0～100 每一點都選得到分支（至少有 minIntel:0 的分支）
 *    - 低情報分支「實際更危險」：同變體內 minIntel 越高，successDelta 不降、riskMul 不升
 *    - 受傷只出現在大失敗路徑；被俘只在大失敗且難度 ADVANCED 以上
 *    - 效果種類在主題允許清單內；spawn／intel 引用的任務存在
 *    - 誤導文字（decoy）不含數字；全資料無佔位字樣
 *    - 手寫任務（authored）要有三層情報分支、不同目標、隱藏變體或 switch、巢狀結果、連鎖
 *    - 舊模板 39 筆皆有對應定義；索引與檔案一致；任務板覆寫的任務存在
 *
 * 用法：
 *   node tools_node/validate-mission-data.js            全部檢查，有錯 exit 1
 *   node tools_node/validate-mission-data.js --json     輸出 JSON 報告
 *   node tools_node/validate-mission-data.js --root <專案根目錄>
 *
 * 也可被 require：validateAll({ root }) → { errors, warnings, stats }
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const SCHEMA_ID = 'https://3klife.local/schemas/mission-data.schema.json';
const DIFF_ORDER = ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'];
const TIERS = ['critical', 'success', 'fail', 'disaster'];
const PLACEHOLDER = /TODO|TBD|FIXME|XXX|lorem|placeholder|待補|待填|佔位|占位|暫定文字|？？？|\?\?\?/i;

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listJsonFiles(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...listJsonFiles(p));
        else if (e.name.endsWith('.json')) out.push(p);
    }
    return out.sort();
}

/** 分支選擇規則（架構 2.3）：符合條件者取 minIntel 最高，同分取列表較前。flags／標籤條件在此不評估（資料檢查用）。 */
function selectBranch(def, variantId, intel, opts) {
    const flags = (opts && opts.flags) || null;
    const tags = (opts && opts.tags) || null;
    let best = null;
    for (const b of def.branches) {
        const w = b.when;
        if (w.variant && !w.variant.includes(variantId)) continue;
        if (intel < w.minIntel) continue;
        if (w.maxIntel !== undefined && intel > w.maxIntel) continue;
        if (w.flagsAll && flags && !w.flagsAll.every((k) => flags[k])) continue;
        if (w.flagsAll && !flags) continue;
        if (w.generalTagsAny && tags && !w.generalTagsAny.some((t) => tags.includes(t))) continue;
        if (w.generalTagsAny && !tags) continue;
        if (!best || w.minIntel > best.when.minIntel) best = b;
    }
    return best;
}

/** 走訪結果樹，回報每個節點與它所在的「大結果等級路徑」。 */
function walkNode(node, visit, ctx) {
    const c = ctx || { tier: null, depth: 0 };
    visit(node, c);
    switch (node.kind) {
        case 'roll':
            for (const t of TIERS) walkNode(node.tiers[t], visit, { tier: c.tier || t, depth: c.depth + 1 });
            break;
        case 'chance':
            walkNode(node.hit, visit, { tier: c.tier, depth: c.depth + 1 });
            walkNode(node.miss, visit, { tier: c.tier, depth: c.depth + 1 });
            break;
        case 'switch':
            for (const k of node.cases) walkNode(k.then, visit, { tier: c.tier, depth: c.depth + 1 });
            walkNode(node.else, visit, { tier: c.tier, depth: c.depth + 1 });
            break;
        case 'seq':
            for (const n of node.nodes) walkNode(n, visit, { tier: c.tier, depth: c.depth + 1 });
            break;
        default:
            break;
    }
}

function collectStrings(value, out) {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
}

function validateAll(options) {
    const root = (options && options.root) || path.resolve(__dirname, '..');
    const dataDir = path.join(root, 'assets', 'resources', 'data');
    const missionDir = path.join(dataDir, 'missions');
    const errors = [];
    const warnings = [];
    const err = (where, msg) => errors.push(`${where}: ${msg}`);
    const rel = (f) => path.relative(root, f).replace(/\\/g, '/');

    const ajv = new Ajv({ strict: false, allErrors: true });
    ajv.addSchema(readJson(path.join(__dirname, 'mission-data.schema.json')));
    const compile = (name) => ajv.getSchema(`${SCHEMA_ID}#/definitions/${name}`);
    const schemaCheck = (name, file, data) => {
        const validate = compile(name);
        if (!validate(data)) {
            const seen = new Set();
            for (const e of validate.errors) {
                const line = `${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`;
                if (seen.has(line)) continue;
                seen.add(line);
                if (seen.size > 8) break;
                err(rel(file), `schema ${line}`);
            }
            return false;
        }
        return true;
    };

    // ---- 根層檔案 ----
    const rootFiles = {
        themes: ['mission-themes.json', 'themes'],
        balance: ['mission-balance.json', 'balance'],
        display: ['mission-intel-display.json', 'display'],
        boards: ['mission-boards.json', 'boards'],
        index: ['mission-index.json', 'index'],
    };
    const loaded = {};
    for (const [key, [fileName, schemaName]] of Object.entries(rootFiles)) {
        const file = path.join(dataDir, fileName);
        if (!fs.existsSync(file)) { err(fileName, '檔案不存在'); continue; }
        let data;
        try { data = readJson(file); } catch (e) { err(fileName, `JSON 解析失敗：${e.message}`); continue; }
        if (schemaCheck(schemaName, file, data)) loaded[key] = data;
        if (key !== 'display') {
            const strs = [];
            collectStrings(data, strs);
            const bad = strs.find((s) => PLACEHOLDER.test(s));
            if (bad) err(fileName, `含佔位字樣：${bad}`);
        }
    }

    const themes = new Map(((loaded.themes && loaded.themes.themes) || []).map((t) => [t.id, t]));
    const balance = loaded.balance;
    if (balance) {
        const inc = balance.recon.steps;
        if (inc.join(',') !== '35,25,15') err('mission-balance.json', `再探增量應為 35,25,15（使用者裁決），目前 ${inc.join(',')}`);
        if (balance.recon.cap !== 90) err('mission-balance.json', `再探上限應為 90，目前 ${balance.recon.cap}`);
        if (balance.penalty.captureMinDifficulty !== 'ADVANCED') err('mission-balance.json', '被俘只在 ADVANCED 以上');
        if (balance.penalty.harmTiers.join(',') !== 'disaster') err('mission-balance.json', '只有大失敗（disaster）可能受傷／被俘');
    }
    if (loaded.display) {
        const bands = loaded.display.bands.slice().sort((a, b) => a.min - b.min);
        let next = 0;
        for (const b of bands) {
            if (b.min !== next) err('mission-intel-display.json', `情報區間不連續：期望從 ${next} 開始，實際 ${b.min}`);
            next = b.max + 1;
        }
        if (next !== 101) err('mission-intel-display.json', '情報區間需涵蓋 0～100');
    }
    if (loaded.boards) {
        for (const [wall, w] of Object.entries(loaded.boards.walls)) {
            for (const t of w.themes) if (!themes.has(t)) err('mission-boards.json', `${wall} 牆引用不存在的主題 ${t}`);
        }
        for (const t of themes.values()) {
            if (!(t.id in loaded.boards.themeWeights)) err('mission-boards.json', `themeWeights 缺主題 ${t.id}`);
            const wallCfg = loaded.boards.walls[t.wall];
            if (!wallCfg || !wallCfg.themes.includes(t.id)) err('mission-boards.json', `主題 ${t.id} 沒有掛在 ${t.wall} 牆`);
        }
    }

    // ---- 任務定義 ----
    const files = listJsonFiles(missionDir);
    const defs = new Map();
    for (const file of files) {
        let def;
        try { def = readJson(file); } catch (e) { err(rel(file), `JSON 解析失敗：${e.message}`); continue; }
        if (!schemaCheck('def', file, def)) continue;
        if (defs.has(def.id)) err(rel(file), `任務 id 重複：${def.id}`);
        defs.set(def.id, { def, file });
    }

    const stats = { defs: defs.size, authored: 0, converted: 0, themes: {}, branches: 0, nodes: 0 };

    for (const { def, file } of defs.values()) {
        const where = rel(file);
        const origin = def.meta.origin;
        stats[origin] += 1;
        stats.themes[def.theme] = (stats.themes[def.theme] || 0) + 1;

        // 檔案位置
        if (path.basename(file) !== `${def.id}.json`) err(where, `檔名應為 ${def.id}.json`);
        if (path.basename(path.dirname(file)) !== def.theme) err(where, `應放在 missions/${def.theme}/ 目錄`);
        const theme = themes.get(def.theme);
        if (!theme) { err(where, `主題 ${def.theme} 不在 mission-themes.json`); continue; }

        // 全部字串：無佔位
        const strs = [];
        collectStrings(def, strs);
        for (const s of strs) if (PLACEHOLDER.test(s)) err(where, `含佔位字樣：${s}`);

        // 變體與分支
        const variantIds = def.variants.map((v) => v.id);
        if (new Set(variantIds).size !== variantIds.length) err(where, '變體 id 重複');
        const branchIds = def.branches.map((b) => b.id);
        if (new Set(branchIds).size !== branchIds.length) err(where, '分支 id 重複');
        stats.branches += def.branches.length;
        for (const b of def.branches) {
            for (const v of b.when.variant || []) if (!variantIds.includes(v)) err(where, `分支 ${b.id} 引用不存在的變體 ${v}`);
            if (b.when.maxIntel !== undefined && b.when.maxIntel < b.when.minIntel) err(where, `分支 ${b.id} maxIntel 小於 minIntel`);
        }
        for (const v of variantIds) {
            for (let intel = 0; intel <= 100; intel += 1) {
                // flagsAll／generalTagsAny 條件分支不計入覆蓋；覆蓋必須靠無額外條件的分支
                const plain = def.branches.filter((b) => !b.when.flagsAll && !b.when.generalTagsAny);
                const covered = selectBranch({ branches: plain }, v, intel);
                if (!covered) { err(where, `變體 ${v} 在情報 ${intel} 選不到分支（每個變體至少要有 minIntel:0 的分支且區間不得有洞）`); break; }
            }
            // 低情報更危險：同變體內，minIntel 越高，successDelta 不降、riskMul 不升
            const chain = def.branches
                .filter((b) => !b.when.flagsAll && !b.when.generalTagsAny && (!b.when.variant || b.when.variant.includes(v)))
                .sort((a, b) => a.when.minIntel - b.when.minIntel);
            for (let i = 1; i < chain.length; i += 1) {
                const lo = chain[i - 1];
                const hi = chain[i];
                if (hi.modifiers.successDelta < lo.modifiers.successDelta) err(where, `變體 ${v}：高情報分支 ${hi.id} 的 successDelta 低於 ${lo.id}（低情報應更危險）`);
                if (hi.modifiers.riskMul > lo.modifiers.riskMul) err(where, `變體 ${v}：高情報分支 ${hi.id} 的 riskMul 高於 ${lo.id}（低情報應更危險）`);
                if (lo.outcome.kind === 'roll' && hi.outcome.kind === 'roll' && hi.outcome.disasterRatio > lo.outcome.disasterRatio) {
                    err(where, `變體 ${v}：高情報分支 ${hi.id} 的大失敗比例高於 ${lo.id}`);
                }
            }
        }

        // 事實
        for (const fact of def.facts) {
            const mins = fact.levels.map((l) => l.minIntel);
            if (mins.some((m, i) => i > 0 && m <= mins[i - 1])) err(where, `fact ${fact.key} 的 levels 需依 minIntel 嚴格遞增`);
            if (mins[0] < 1) err(where, `fact ${fact.key} 第一層 minIntel 需 >= 1（情報 0 以「？？？」顯示）`);
            if (fact.decoy && /[0-9０-９%％]|成功率/.test(fact.decoy)) err(where, `fact ${fact.key} 的誤導文字不得含數字或成功率（數字不誤導）`);
        }
        const factKeys = new Set(def.facts.map((f) => f.key));

        // 結果樹
        let hasNested = false;
        let hasSwitch = false;
        let hasChain = false;
        const objectiveIds = new Set();
        const rewardMuls = [];
        for (const b of def.branches) {
            objectiveIds.add(b.objective.id);
            rewardMuls.push(b.modifiers.rewardMul);
            walkNode(b.outcome, (node, ctx) => {
                stats.nodes += 1;
                if (node.kind === 'switch') {
                    hasSwitch = true;
                    const m = /^fact:(.+)$/.exec(node.on);
                    if (m && !factKeys.has(m[1])) err(where, `分支 ${b.id} 的 switch 引用不存在的 fact ${m[1]}`);
                    if (node.on === 'variant') {
                        for (const k of node.cases) if (k.eq !== undefined && !variantIds.includes(String(k.eq))) err(where, `分支 ${b.id} 的 switch 引用不存在的變體 ${k.eq}`);
                    }
                }
                if (ctx.depth >= 1 && node.kind !== 'effects') hasNested = true;
                if (node.kind !== 'effects') return;
                for (const e of node.effects) {
                    if (!theme.allowedEffects.includes(e.kind)) err(where, `主題 ${def.theme} 不允許效果 ${e.kind}（分支 ${b.id}）`);
                    if (e.kind === 'spawn' || e.kind === 'flag' || e.kind === 'unlock' || (e.kind === 'intel')) hasChain = true;
                    if (e.kind === 'spawn' && !defs.has(e.defId)) err(where, `spawn 引用不存在的任務 ${e.defId}`);
                    if (e.kind === 'intel' && e.target.defId && !defs.has(e.target.defId)) err(where, `intel 引用不存在的任務 ${e.target.defId}`);
                    if (e.kind === 'generalState' && e.state !== 'exhausted') {
                        if (ctx.tier !== 'disaster') err(where, `分支 ${b.id}：${e.state} 只能出現在大失敗路徑（使用者裁決）`);
                        if (e.state === 'injured' && e.seasons > 2) err(where, `分支 ${b.id}：受傷休養最多 2 季`);
                        if (e.state === 'captured' && DIFF_ORDER.indexOf(def.difficulty) < DIFF_ORDER.indexOf('ADVANCED')) {
                            err(where, `分支 ${b.id}：被俘只在 ADVANCED 以上難度（目前 ${def.difficulty}）`);
                        }
                    }
                }
            });
        }

        // 手寫任務品質門檻（商業／民生小任務 tag=commerce 為單純的銀兩收益任務，免連鎖與變體門檻）
        if (origin === 'authored' && !def.tags.includes('commerce')) {
            const mins = new Set(def.branches.map((b) => b.when.minIntel));
            if (!mins.has(0)) err(where, '手寫任務需有 minIntel:0 的分支');
            if (mins.size < 3) err(where, `手寫任務需至少三層情報分支（不同 minIntel），目前 ${mins.size} 層`);
            if (objectiveIds.size < 2) err(where, '手寫任務的目標需隨情報度而不同（至少 2 種 objective.id）');
            if (Math.max(...rewardMuls) <= Math.min(...rewardMuls)) err(where, '手寫任務的獎勵倍率需隨情報度而不同');
            if (def.variants.length < 2 && !hasSwitch) err(where, '手寫任務需有隱藏變體（>=2）或 switch 分流');
            if (!hasNested) err(where, '手寫任務需有巢狀結果（chance／seq／switch／roll 套在大結果底下）');
            if (!hasChain) err(where, '手寫任務需有連鎖（spawn／flag／intel／unlock 效果）');
            if (def.facts.length === 0) err(where, '手寫任務需有依情報揭露的 facts');
            if (!def.facts.some((f) => f.decoy)) warnings.push(`${where}: 沒有誤導文字（decoy）`);
            if (def.text.brief.length < 12) err(where, 'brief 過短');
        }
    }

    // spawn 引用 helper 需要完整 defs，上面已用閉包；以下檢查孤兒鏈任務與任務板
    if (loaded.boards) {
        const chainOnly = new Set();
        for (const o of loaded.boards.overrides) {
            if (!defs.has(o.defId)) err('mission-boards.json', `覆寫的任務不存在：${o.defId}`);
            if (o.chainOnly) chainOnly.add(o.defId);
        }
        const spawned = new Set();
        for (const { def } of defs.values()) {
            for (const b of def.branches) {
                walkNode(b.outcome, (node) => {
                    if (node.kind === 'effects') for (const e of node.effects) if (e.kind === 'spawn') spawned.add(e.defId);
                });
            }
        }
        for (const id of chainOnly) if (!spawned.has(id)) err('mission-boards.json', `${id} 標為 chainOnly 但沒有任何任務會 spawn 它`);
    }

    // 舊模板覆蓋
    const tplFile = path.join(dataDir, 'hall-mission-templates.json');
    if (fs.existsSync(tplFile)) {
        const covered = new Set();
        for (const { def } of defs.values()) {
            covered.add(def.id);
            if (def.legacyTemplateId) covered.add(def.legacyTemplateId);
        }
        for (const t of readJson(tplFile).Templates) {
            if (!covered.has(t.Template_ID)) err('hall-mission-templates.json', `舊模板 ${t.Template_ID}「${t.Task_Title}」沒有對應的新任務定義`);
        }
    }

    // 索引
    if (loaded.index) {
        const indexed = new Map(loaded.index.defs.map((d) => [d.id, d]));
        for (const { def } of defs.values()) {
            const entry = indexed.get(def.id);
            if (!entry) { err('mission-index.json', `缺少 ${def.id}`); continue; }
            if (entry.path !== `missions/${def.theme}/${def.id}.json`) err('mission-index.json', `${def.id} 路徑不符：${entry.path}`);
            if (entry.theme !== def.theme || entry.difficulty !== def.difficulty || entry.origin !== def.meta.origin) err('mission-index.json', `${def.id} 的主題／難度／來源與定義不符`);
        }
        for (const id of indexed.keys()) if (!defs.has(id)) err('mission-index.json', `索引多出不存在的任務 ${id}`);
    }

    return { errors, warnings, stats };
}

function main() {
    const argv = process.argv.slice(2);
    const rootIdx = argv.indexOf('--root');
    const root = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : path.resolve(__dirname, '..');
    const result = validateAll({ root });
    if (argv.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        for (const w of result.warnings) console.log(`[警告] ${w}`);
        for (const e of result.errors) console.log(`[錯誤] ${e}`);
        const s = result.stats;
        console.log(`任務 ${s.defs} 件（手寫 ${s.authored}、轉出 ${s.converted}），分支 ${s.branches}，結果節點 ${s.nodes}；主題：${Object.entries(s.themes).map(([k, v]) => `${k}=${v}`).join(' ')}`);
        console.log(result.errors.length === 0 ? 'mission-data 驗證通過' : `mission-data 驗證失敗：${result.errors.length} 個錯誤`);
    }
    process.exit(result.errors.length === 0 ? 0 : 1);
}

if (require.main === module) main();

module.exports = { validateAll, selectBranch, walkNode };
