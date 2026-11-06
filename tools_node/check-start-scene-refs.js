#!/usr/bin/env node
/**
 * check-start-scene-refs.js — 啟動場景靜態參照審計（HOT-09；PROG-2-1924）
 *
 * 熱更新與版本控制規格書 §Asset Bundle：啟動場景不得靜態拖曳參照後期核心戰鬥資源，
 * 否則該資源會被綁進 Main Bundle。本工具讀建置設定的 startScene，收集場景 JSON 內所有
 * __uuid__ 參照，對照 assets 下 .meta 反查資產路徑，命中設定檔禁止清單就失敗（exit 1）。
 *
 * 禁止清單在 tools_node/start-scene-refs-config.json（資料驅動，不寫死在程式）。
 *
 * 用法：
 *   node tools_node/check-start-scene-refs.js
 *   node tools_node/check-start-scene-refs.js --json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'start-scene-refs-config.json');

/** 場景 JSON 文字 → 去重的頂層 uuid（去掉 @子資源後綴） */
function collectSceneUuids(sceneText) {
    const out = new Set();
    const re = /"__uuid__"\s*:\s*"([^"@]+)(?:@[^"]*)?"/g;
    let m;
    while ((m = re.exec(sceneText)) !== null) out.add(m[1]);
    return [...out];
}

/** 依禁止清單（路徑前綴或子字串，皆以 / 分隔）回傳違規項目 */
function findViolations(refs, forbidden) {
    const violations = [];
    for (const ref of refs) {
        const p = ref.path.replace(/\\/g, '/');
        const rule = forbidden.find((f) => p.includes(f));
        if (rule) violations.push({ uuid: ref.uuid, path: p, rule });
    }
    return violations;
}

function walkMeta(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkMeta(full, out);
        else if (entry.name.endsWith('.meta')) out.push(full);
    }
    return out;
}

/** assets 下所有 .meta 的頂層 uuid → 資產相對路徑 */
function buildUuidIndex(assetsDir) {
    const index = new Map();
    for (const metaFile of walkMeta(assetsDir, [])) {
        const m = /"uuid"\s*:\s*"([^"]+)"/.exec(fs.readFileSync(metaFile, 'utf8'));
        if (m) index.set(m[1], path.relative(ROOT, metaFile.slice(0, -'.meta'.length)).replace(/\\/g, '/'));
    }
    return index;
}

function readStartSceneUuid(builderFiles) {
    for (const rel of builderFiles) {
        const file = path.join(ROOT, rel);
        if (!fs.existsSync(file)) continue;
        const m = /"startScene"\s*:\s*"([^"]+)"/.exec(fs.readFileSync(file, 'utf8'));
        if (m) return m[1];
    }
    return null;
}

function main() {
    const json = process.argv.includes('--json');
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const index = buildUuidIndex(path.join(ROOT, 'assets'));
    const startUuid = readStartSceneUuid(config.builderFiles);
    const scenes = new Set(config.extraScenes || []);
    if (startUuid && index.has(startUuid)) scenes.add(index.get(startUuid));
    else if (config.fallbackStartScene) scenes.add(config.fallbackStartScene);
    if (scenes.size === 0) {
        console.error('❌ 找不到啟動場景（builderFiles 未設 startScene，fallbackStartScene 與 extraScenes 也為空）');
        process.exit(1);
    }
    const report = [];
    for (const scene of scenes) {
        const text = fs.readFileSync(path.join(ROOT, scene), 'utf8');
        const refs = collectSceneUuids(text).map((uuid) => ({ uuid, path: index.get(uuid) || '' })).filter((r) => r.path);
        report.push({ scene, refCount: refs.length, violations: findViolations(refs, config.forbidden) });
    }
    const bad = report.filter((r) => r.violations.length > 0);
    if (json) console.log(JSON.stringify({ ok: bad.length === 0, report }, null, 2));
    else if (bad.length === 0) console.log(`✅ 啟動場景靜態參照通過：${report.map((r) => `${r.scene}（${r.refCount} 項）`).join('、')}`);
    else for (const r of bad) for (const v of r.violations) console.error(`❌ ${r.scene} 靜態參照禁止資源 ${v.path}（規則 ${v.rule}）→ 改用 assetManager.loadBundle 動態載入`);
    process.exit(bad.length === 0 ? 0 : 1);
}

if (require.main === module) main();

module.exports = { collectSceneUuids, findViolations };
