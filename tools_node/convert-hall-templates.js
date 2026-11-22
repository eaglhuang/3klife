#!/usr/bin/env node
/**
 * convert-hall-templates.js — 舊大廳任務模板 → 新 MissionDefinition（mission-def.v1）
 *
 * 讀 assets/resources/data/hall-mission-templates.json 與 hall-mission-balance.json，
 * 每筆模板產生一個 definition，寫到 assets/resources/data/missions/<theme>/<Template_ID>.json。
 * 每個轉出的定義都有三層情報分支（盲目 0–29、知情 30–69、洞悉 70+），
 * 低情報真的更危險、高情報目標與獎勵更好，大成功到大失敗各自有巢狀結果。
 *
 * 已被手寫定義取代的模板（手寫檔含 legacyTemplateId）會被略過，並清掉先前轉出的同名檔。
 * 手寫檔（meta.origin = authored）永遠不會被本腳本覆寫或刪除。
 * 最後重建 assets/resources/data/mission-index.json。
 *
 * 用法：
 *   node tools_node/convert-hall-templates.js            寫檔（冪等，輸出穩定）
 *   node tools_node/convert-hall-templates.js --check    只檢查輸出是否已是最新，過期則 exit 1
 *   node tools_node/convert-hall-templates.js --dry      只列出會寫什麼
 *   node tools_node/convert-hall-templates.js --root <專案根目錄>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assets', 'resources', 'data');
const MISSION_DIR = path.join(DATA, 'missions');

const DIFF_ORDER = ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'];
const WALL_KEY = { MILITARY: 'Military', DOMESTIC: 'Domestic', EXPEDITION: 'Expedition' };
const WALL_THEME = { MILITARY: 'military', DOMESTIC: 'domestic', EXPEDITION: 'expedition' };

/** 少數模板語意上屬於外交／諜報，改掛對應主題（牆別仍由主題決定，兩者都在遠征牆）。 */
const THEME_OVERRIDE = {
    EXP_NORMAL_01: 'diplomacy',
    EXP_ADV_01: 'diplomacy',
    EXP_HELL_02: 'espionage',
    EXP_EASY_01: 'espionage',
};

/** 各牆的措辭組：定性文字全部走這裡，避免千篇一律。 */
const FLAVOR = {
    Military: {
        factLabel: '敵情',
        detailLabel: '軍情背景',
        decoy: '傳聞敵人不成氣候，不過是些散兵游勇，不足為慮。',
        blindObjective: (t) => `依表面軍情出兵「${t}」`,
        blindHints: ['敵情不明，只能硬著頭皮上'],
        informedObjective: (t) => `「${t}」：依已知敵情布陣`,
        informedHints: ['已知敵人大致動向，可有所準備'],
        insightObjective: (t) => `「${t}」：先發制人，直取要害`,
        insightHints: ['敵人破綻已在掌握，可擇機一擊'],
        tiers: {
            critical: (t) => `「${t}」大獲全勝，士卒歡聲雷動，連敵人的馬匹糧草都截了下來。`,
            success: (t) => `「${t}」得手，部伍整肅而返。`,
            fail: (t) => `「${t}」無功而返，所幸根本未損，只是白跑一趟。`,
            disaster: {
                blind: (t) => `「${t}」不知對方底細，貿然進兵，中了埋伏，折損兵卒，主將帶傷而歸。`,
                informed: (t) => `「${t}」遇上意料之外的抵抗，折損兵卒。`,
                insight: (t) => `「${t}」雖有準備，仍被敵人搶先一步，損失輕微。`,
            },
        },
    },
    Domestic: {
        factLabel: '地方情狀',
        detailLabel: '內情',
        decoy: '地方官員回報一切妥當，無須多慮。',
        blindObjective: (t) => `照官府文書辦理「${t}」`,
        blindHints: ['只憑官府文書，不知實情'],
        informedObjective: (t) => `「${t}」：對照實情逐項辦理`,
        informedHints: ['已知幾處關節，可對症下藥'],
        insightObjective: (t) => `「${t}」：直指癥結，一次辦妥`,
        insightHints: ['癥結所在已了然，可以一次辦妥'],
        tiers: {
            critical: (t) => `「${t}」辦得漂亮，百姓夾道稱頌，連鄰郡都來打聽章程。`,
            success: (t) => `「${t}」順利辦妥，府庫與民心皆有所得。`,
            fail: (t) => `「${t}」雷聲大雨點小，錢糧花了，成效有限。`,
            disaster: {
                blind: (t) => `「${t}」只照文書行事，反而激起民怨，銀兩虧損，名聲受累。`,
                informed: (t) => `「${t}」辦到一半出了岔子，白白折了些銀兩。`,
                insight: (t) => `「${t}」仍有小小波折，所幸早有預備，損失不大。`,
            },
        },
    },
    Expedition: {
        factLabel: '行程情報',
        detailLabel: '行程背景',
        decoy: '聽說沿途太平，沒什麼好擔心的。',
        blindObjective: (t) => `照原定行程辦理「${t}」`,
        blindHints: ['路況與對方底細皆不明'],
        informedObjective: (t) => `「${t}」：依探得的情況調整行程`,
        informedHints: ['已探得部分路況，可避開幾處險處'],
        insightObjective: (t) => `「${t}」：掌握全局，擇最佳時機行事`,
        insightHints: ['路況與對方底細大致清楚，可從容佈置'],
        tiers: {
            critical: (t) => `「${t}」圓滿達成，還意外帶回了額外的見聞與人情。`,
            success: (t) => `「${t}」如期完成，不辱使命。`,
            fail: (t) => `「${t}」半途受阻，無功而返。`,
            disaster: {
                blind: (t) => `「${t}」誤入險地，遭人截擊，隨行人員折損，主事者帶傷脫身。`,
                informed: (t) => `「${t}」途中遇襲，折損部分隨從。`,
                insight: (t) => `「${t}」雖遭小挫，已有退路，人員無大礙。`,
            },
        },
    },
};

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sentences(text) {
    return String(text).split('。').map((s) => s.trim()).filter(Boolean).map((s) => `${s}。`);
}

function firstClause(text) {
    const first = String(text).split(/[，、；。]/)[0].trim();
    return first ? `${first}。` : String(text);
}

function pad2(n) {
    return Math.round(n * 100) / 100;
}

function mul(base, key) {
    return { base, mulKey: key };
}

/** 依牆別與難度算出一筆「全額」獎勵（沿用舊系統：難度表 × 牆別比例）。 */
function rewardFor(balance, wall, diff) {
    const d = balance.difficulties[diff];
    const r = balance.wallRewards[wall];
    return {
        grain: Math.round(d.reward.grain * r.grain),
        // 公務牆（軍務／政務／外交）的錢一律走金（國家公庫）；銀兩（家族）只給手寫的商業、民生任務
        gold: Math.round(d.reward.gold * r.gold),
        exp: Math.round(d.reward.generalExp * r.generalExp),
        fame: d.fame,
    };
}

function rewardEffects(rw, factor) {
    const list = [];
    if (rw.grain > 0) list.push({ kind: 'resource', res: 'grain', amount: mul(Math.round(rw.grain * factor), 'reward') });
    if (rw.gold > 0) list.push({ kind: 'resource', res: 'gold', amount: mul(Math.round(rw.gold * factor), 'reward') });
    if (rw.exp > 0) list.push({ kind: 'generalExp', amount: mul(Math.round(rw.exp * factor), 'reward') });
    list.push({ kind: 'fame', amount: mul(Math.max(1, Math.round(rw.fame * factor)), 'reward') });
    return list;
}

/** 大失敗的損失：軍事與遠征折兵，內政虧銀（金額取難度表的 riskLoss）。 */
function lossEffects(balance, wall, diff, scale) {
    const loss = Math.round(balance.difficulties[diff].riskLoss * scale);
    return [{ kind: 'resource', res: wall === 'Domestic' ? 'gold' : 'troops', amount: mul(-loss, 'risk') }];
}

/**
 * 大失敗節點。使用者裁決：只有大失敗才可能受傷（休養 1～2 季）；被俘只在高難度（ADVANCED 以上）。
 * 內政任務受傷改成名聲受損（HELL 的大疫例外會讓主事者染病休養）。
 */
function disasterNode(f, balance, wall, diff, title, band) {
    const text = f.tiers.disaster[band](title);
    const diffIdx = DIFF_ORDER.indexOf(diff);
    const highDiff = diffIdx >= DIFF_ORDER.indexOf('ADVANCED');
    const lossScale = { blind: 1, informed: 0.6, insight: 0.3 }[band];
    const base = lossEffects(balance, wall, diff, lossScale).concat([{ kind: 'fame', amount: -Math.max(1, balance.difficulties[diff].fame - (band === 'insight' ? 2 : 0) - (band === 'informed' ? 1 : 0)) }]);
    if (band === 'insight') return { kind: 'effects', narrative: text, effects: base };
    const injury = { kind: 'generalState', state: 'injured', seasons: diffIdx >= 2 ? 2 : 1 };
    if (wall === 'Domestic' && diff !== 'HELL') return { kind: 'effects', narrative: text, effects: base };
    if (band === 'informed') {
        return {
            kind: 'chance', p: 0.5,
            hit: { kind: 'effects', narrative: text, effects: base.concat([injury]) },
            miss: { kind: 'effects', narrative: text, effects: base },
        };
    }
    if (!highDiff || wall === 'Domestic') return { kind: 'effects', narrative: text, effects: base.concat([injury]) };
    return {
        kind: 'chance', p: 0.25,
        hit: {
            kind: 'effects',
            narrative: `「${title}」兵敗，主事者被敵人擒獲，需設法營救。`,
            effects: base.concat([{ kind: 'generalState', state: 'captured', seasons: 2 }]),
        },
        miss: { kind: 'effects', narrative: text, effects: base.concat([injury]) },
    };
}

function successTiers(f, rw, title, band, themeTag) {
    const factor = { blind: 1, informed: 1, insight: 1 }[band];
    const critical = {
        kind: 'seq',
        nodes: [
            { kind: 'effects', narrative: f.tiers.critical(title), effects: rewardEffects(rw, 1.5 * factor) },
            {
                kind: 'chance', p: band === 'insight' ? 0.45 : 0.25,
                hit: {
                    kind: 'effects',
                    narrative: '此役打通了門路，同類任務的消息也跟著靈通起來。',
                    effects: [{ kind: 'intel', target: { tag: themeTag }, delta: band === 'insight' ? 25 : 15 }],
                },
                miss: { kind: 'effects', effects: [] },
            },
        ],
    };
    const success = { kind: 'effects', narrative: f.tiers.success(title), effects: rewardEffects(rw, 1 * factor) };
    const failEffects = [{ kind: 'generalExp', amount: mul(Math.max(5, Math.round(rw.exp * 0.25)), 'reward') }];
    if (band === 'blind') failEffects.push({ kind: 'fame', amount: -1 });
    const fail = { kind: 'effects', narrative: f.tiers.fail(title), effects: failEffects };
    return { critical, success, fail };
}

function buildBranch(f, balance, tpl, wall, diff, themeTag, band) {
    const title = tpl.Task_Title;
    const rw = rewardFor(balance, wall, diff);
    const cfg = {
        blind: {
            suffix: 'BLIND', when: { minIntel: 0, maxIntel: 29 },
            objective: { id: 'handle_blind', text: f.blindObjective(title) },
            presented: { hints: f.blindHints },
            modifiers: { successDelta: -0.12, rewardMul: 0.85, riskMul: 1.5 },
            crit: 0.05, dis: 0.35,
        },
        informed: {
            suffix: 'INFORMED', when: { minIntel: 30, maxIntel: 69 },
            objective: { id: 'handle_informed', text: f.informedObjective(title) },
            presented: { hints: f.informedHints },
            modifiers: { successDelta: 0, rewardMul: 1, riskMul: 1 },
            crit: 0.15, dis: 0.2,
        },
        insight: {
            suffix: 'INSIGHT', when: { minIntel: 70 },
            objective: { id: 'handle_insight', text: f.insightObjective(title) },
            presented: { hints: f.insightHints },
            modifiers: { successDelta: 0.1, rewardMul: 1.25, riskMul: 0.6 },
            crit: 0.3, dis: 0.08,
        },
    }[band];
    const st = successTiers(f, rw, title, band, themeTag);
    return {
        id: `B_${cfg.suffix}`,
        when: cfg.when,
        objective: cfg.objective,
        presented: cfg.presented,
        modifiers: cfg.modifiers,
        outcome: {
            kind: 'roll',
            critRatio: cfg.crit,
            disasterRatio: cfg.dis,
            tiers: { critical: st.critical, success: st.success, fail: st.fail, disaster: disasterNode(f, balance, wall, diff, title, band) },
        },
    };
}

function buildFacts(f, tpl) {
    const facts = [];
    const detail = sentences(tpl.Task_Detail || '');
    if (detail.length > 0) {
        const levels = [{ minIntel: 30, text: detail[0] }];
        if (detail.length > 1) levels.push({ minIntel: 60, text: detail.join('') });
        facts.push({ key: 'detail', label: f.detailLabel, levels, decoy: f.decoy });
    }
    if (tpl.Enemy_Hint) {
        facts.push({
            key: 'enemy', label: f.factLabel,
            levels: [{ minIntel: 40, text: firstClause(tpl.Enemy_Hint) }, { minIntel: 70, text: tpl.Enemy_Hint }],
            decoy: f.decoy,
        });
    }
    return facts;
}

function convertTemplate(tpl, balance, themes) {
    const wall = WALL_KEY[tpl.Wall];
    const diff = tpl.Difficulty;
    const themeId = THEME_OVERRIDE[tpl.Template_ID] || WALL_THEME[tpl.Wall];
    const theme = themes.find((t) => t.id === themeId);
    if (!wall || !theme) throw new Error(`${tpl.Template_ID}: 未知牆別或主題 ${tpl.Wall}/${themeId}`);
    const d = balance.difficulties[diff];
    const f = FLAVOR[wall];
    const keyStats = { [tpl.Key_Stat]: 1 };
    for (const [s, w] of Object.entries(theme.defaultKeyStats)) {
        if (!(s in keyStats)) { keyStats[s] = pad2(w); break; }
    }
    const themeTag = theme.defaultTags[0];
    const def = {
        schema: 'mission-def.v1',
        id: tpl.Template_ID,
        version: 1,
        legacyTemplateId: tpl.Template_ID,
        theme: themeId,
        difficulty: diff,
        tags: [themeTag, 'legacy'],
        meta: { origin: 'converted', note: '由 tools_node/convert-hall-templates.js 從舊大廳模板機械轉出，可日後手寫補強。' },
        text: { title: tpl.Task_Title, brief: tpl.Task_Brief },
        facts: buildFacts(f, tpl),
        requirement: { slots: 1, keyStats, preferTags: [], avoidTags: [] },
        timing: { durationSeasons: d.durationSeasons, expireSeasons: balance.defaults.expireSeasons },
        variants: [{ id: 'ONE', weight: 1 }],
        intel: { initial: d.initialIntel, jitter: balance.defaults.intelJitter, sources: {} },
        branches: ['blind', 'informed', 'insight'].map((band) => buildBranch(f, balance, tpl, wall, diff, themeTag, band)),
    };
    if (tpl.Task_Detail) def.text.detail = tpl.Task_Detail;
    if (tpl.Scene_Gambit) def.sceneGambit = tpl.Scene_Gambit;
    return def;
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

function stableJson(obj) {
    return `${JSON.stringify(obj, null, 2)}\n`;
}

function main() {
    const templates = readJson(path.join(DATA, 'hall-mission-templates.json')).Templates;
    const oldBalance = readJson(path.join(DATA, 'hall-mission-balance.json'));
    const balance = readJson(path.join(DATA, 'mission-balance.json'));
    const themes = readJson(path.join(DATA, 'mission-themes.json')).themes;
    void oldBalance;

    // 先找出手寫定義與它們取代的舊模板
    const existing = listJsonFiles(MISSION_DIR).map((file) => ({ file, def: readJson(file) }));
    const authored = existing.filter((e) => e.def.meta && e.def.meta.origin === 'authored');
    const replaced = new Set(authored.map((e) => e.def.legacyTemplateId).filter(Boolean));

    const wanted = new Map(); // file -> content
    let skipped = 0;
    for (const tpl of templates) {
        if (replaced.has(tpl.Template_ID)) { skipped += 1; continue; }
        const def = convertTemplate(tpl, balance, themes);
        wanted.set(path.join(MISSION_DIR, def.theme, `${def.id}.json`), stableJson(def));
    }

    // 過期的轉出檔（模板被手寫取代或改了主題）要清掉
    const stale = existing.filter((e) => e.def.meta && e.def.meta.origin === 'converted' && !wanted.has(e.file));

    // 重建索引
    const defs = [];
    for (const e of authored) defs.push(e.def);
    for (const content of wanted.values()) defs.push(JSON.parse(content));
    const rank = (d) => DIFF_ORDER.indexOf(d.difficulty);
    defs.sort((a, b) => a.theme.localeCompare(b.theme) || rank(a) - rank(b) || a.id.localeCompare(b.id));
    const index = {
        schema: 'mission-index.v1',
        version: 1,
        defs: defs.map((d) => {
            const entry = { id: d.id, theme: d.theme, difficulty: d.difficulty, path: `missions/${d.theme}/${d.id}.json`, origin: d.meta.origin };
            if (d.legacyTemplateId) entry.legacyTemplateId = d.legacyTemplateId;
            return entry;
        }),
    };
    wanted.set(path.join(DATA, 'mission-index.json'), stableJson(index));

    let outdated = 0;
    for (const [file, content] of wanted) {
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        if (current === content) continue;
        outdated += 1;
        if (flag('--check')) { console.log(`[過期] ${path.relative(ROOT, file)}`); continue; }
        if (flag('--dry')) { console.log(`[將寫入] ${path.relative(ROOT, file)}`); continue; }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, 'utf8');
    }
    for (const e of stale) {
        outdated += 1;
        if (flag('--check')) { console.log(`[多餘] ${path.relative(ROOT, e.file)}`); continue; }
        if (flag('--dry')) { console.log(`[將刪除] ${path.relative(ROOT, e.file)}`); continue; }
        fs.unlinkSync(e.file);
    }
    console.log(`模板 ${templates.length} 筆：轉出 ${templates.length - skipped}，由手寫取代 ${skipped}；索引共 ${defs.length} 筆；${flag('--check') ? '過期' : '變動'} ${outdated} 個檔案。`);
    if (flag('--check') && outdated > 0) process.exit(1);
}

main();
