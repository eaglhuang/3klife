/**
 * MissionData.test.ts — 通用任務資料檔驗證測試（PROG-2-9145 / 卡 B）
 *
 * 鎖住：全部任務資料通過 schema 與語意檢查；舊大廳模板 39 筆皆有新定義；
 * 手寫任務有三層情報分支、不同目標、巢狀結果與連鎖；使用者裁決（再探遞增、受傷／被俘限制、
 * 低情報更危險、誤導文字不含數字）真的寫進資料；驗證腳本對壞資料會報錯；轉換腳本輸出是最新的。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate 加上 CI 資料檢查，壞資料進不了主線。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const validator = require('../tools_node/validate-mission-data.js') as {
    validateAll(options: { root: string }): { errors: string[]; warnings: string[]; stats: { defs: number; authored: number; converted: number; themes: Record<string, number> } };
    selectBranch(def: AnyJson, variantId: string, intel: number): { id: string } | null;
};

type AnyJson = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assets', 'resources', 'data');

function readJson(file: string): AnyJson {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as AnyJson;
}

function loadDefs(dataDir: string): Array<{ file: string; def: AnyJson }> {
    const out: Array<{ file: string; def: AnyJson }> = [];
    const walk = (dir: string): void => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.json')) out.push({ file: p, def: readJson(p) });
        }
    };
    walk(path.join(dataDir, 'missions'));
    return out;
}

/** 複製一份資料目錄到暫存區，讓測試能安全地改壞資料。 */
function withTempData(mutate: (dataDir: string) => void): { errors: string[]; cleanup: () => void } {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-data-'));
    const dataDir = path.join(tmp, 'assets', 'resources', 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.cpSync(path.join(DATA, 'missions'), path.join(dataDir, 'missions'), { recursive: true });
    for (const f of ['mission-themes.json', 'mission-balance.json', 'mission-intel-display.json', 'mission-boards.json', 'mission-index.json', 'hall-mission-templates.json']) {
        fs.copyFileSync(path.join(DATA, f), path.join(dataDir, f));
    }
    mutate(dataDir);
    const result = validator.validateAll({ root: tmp });
    return { errors: result.errors, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

function editDef(dataDir: string, theme: string, id: string, edit: (def: AnyJson) => void): void {
    const file = path.join(dataDir, 'missions', theme, `${id}.json`);
    const def = readJson(file);
    edit(def);
    fs.writeFileSync(file, JSON.stringify(def, null, 2), 'utf8');
}

function expectError(errors: string[], needle: string): void {
    assert.isTrue(errors.some((e) => e.includes(needle)), `預期錯誤含「${needle}」，實際：${errors.slice(0, 3).join(' | ')}`);
}

export function createMissionDataSuite(): TestSuite {
    const suite = new TestSuite('MissionData (通用任務資料檔 PROG-2-9145)');

    suite.test('全部任務資料通過 schema 與語意檢查', () => {
        const result = validator.validateAll({ root: ROOT });
        assert.equals(0, result.errors.length, result.errors.slice(0, 5).join('\n'));
        assert.greaterOrEqual(44, result.stats.defs);
    });

    suite.test('舊大廳模板 39 筆全數有對應的新定義', () => {
        const templates = readJson(path.join(DATA, 'hall-mission-templates.json')).Templates as AnyJson[];
        assert.equals(39, templates.length);
        const covered = new Set<string>();
        for (const { def } of loadDefs(DATA)) {
            covered.add(def.id as string);
            if (def.legacyTemplateId) covered.add(def.legacyTemplateId as string);
        }
        for (const t of templates) assert.isTrue(covered.has(t.Template_ID as string), `${t.Template_ID} 未轉換`);
    });

    suite.test('手寫任務至少 8 件且涵蓋軍事、內政、外交、諜報、結緣', () => {
        const authored = loadDefs(DATA).filter((d) => d.def.meta.origin === 'authored');
        assert.greaterOrEqual(8, authored.length);
        const themes = new Set(authored.map((d) => d.def.theme as string));
        for (const t of ['military', 'domestic', 'diplomacy', 'espionage', 'romance']) assert.isTrue(themes.has(t), `缺主題 ${t}`);
    });

    suite.test('手寫任務：三層情報分支、不同目標、獎勵隨情報而變、有連鎖', () => {
        for (const { def } of loadDefs(DATA).filter((d) => d.def.meta.origin === 'authored')) {
            const branches = def.branches as AnyJson[];
            const mins = new Set(branches.map((b) => b.when.minIntel as number));
            assert.greaterOrEqual(3, mins.size, `${def.id} 情報層數不足`);
            const objectives = new Set(branches.map((b) => (b.objective as AnyJson).id as string));
            assert.greaterOrEqual(2, objectives.size, `${def.id} 目標沒有隨情報變化`);
            const muls = branches.map((b) => (b.modifiers as AnyJson).rewardMul as number);
            assert.isTrue(Math.max(...muls) > Math.min(...muls), `${def.id} 獎勵倍率沒有差異`);
            assert.isTrue(JSON.stringify(def).includes('"kind":"spawn"') || JSON.stringify(def).includes('"kind":"flag"'), `${def.id} 沒有連鎖`);
        }
    });

    suite.test('巡查烽燧：同一任務在不同情報與變體選到不同分支', () => {
        const def = readJson(path.join(DATA, 'missions', 'military', 'MIL_BEACON_PATROL.json'));
        const pick = (variant: string, intel: number): string => validator.selectBranch(def, variant, intel)!.id;
        assert.equals('B_TRAITOR_BLIND', pick('TRAITOR', 10));
        assert.equals('B_TRAITOR_SUSPECT', pick('TRAITOR', 50));
        assert.equals('B_TRAITOR_EXPOSED', pick('TRAITOR', 80));
        assert.equals('B_TRAITOR_NET', pick('TRAITOR', 100));
        assert.equals('B_ROUTINE', pick('ROUTINE', 10));
        assert.equals('B_ROUTINE_SHARP', pick('ROUTINE', 80));
        // 低情報看不到內奸：真相是內奸時，情報 10 與一般巡查的呈現相同
        const blind = def.branches.find((b: AnyJson) => b.id === 'B_TRAITOR_BLIND') as AnyJson;
        const routine = def.branches.find((b: AnyJson) => b.id === 'B_ROUTINE') as AnyJson;
        assert.equals(routine.objective.text, blind.objective.text);
        assert.equals(routine.presented.hints[0], blind.presented.hints[0]);
    });

    suite.test('每個任務每個變體在情報 0～100 都選得到分支', () => {
        for (const { def } of loadDefs(DATA)) {
            for (const v of def.variants as AnyJson[]) {
                for (let intel = 0; intel <= 100; intel += 1) {
                    const hit = validator.selectBranch(def, v.id as string, intel);
                    assert.isTrue(hit !== null, `${def.id}/${v.id} 情報 ${intel} 選不到分支`);
                }
            }
        }
    });

    suite.test('使用者裁決寫進數值表：再探 35/25/15、上限 90、等待一次、被俘 ADVANCED 以上', () => {
        const balance = readJson(path.join(DATA, 'mission-balance.json'));
        assert.equals('35,25,15', (balance.intel.reconIncrements as number[]).join(','));
        assert.equals(90, balance.intel.reconCap);
        assert.equals(1, balance.intel.wait.maxPerMission);
        assert.equals('ADVANCED', balance.risk.capture.minDifficulty);
        assert.equals('disaster', balance.risk.injury.tier);
        assert.equals(2, balance.risk.injury.maxSeasons);
    });

    suite.test('情報顯示表涵蓋 0～100 且低情報一律悲觀、高情報才給確切數字', () => {
        const display = readJson(path.join(DATA, 'mission-intel-display.json'));
        const bands = (display.bands as AnyJson[]).slice().sort((a, b) => (a.min as number) - (b.min as number));
        assert.equals(0, bands[0].min);
        assert.equals(100, bands[bands.length - 1].max);
        assert.equals('hidden', bands[0].successRate.state);
        assert.isTrue(bands[0].risk.pessimistic === true);
        assert.equals('exact', bands[bands.length - 1].successRate.state);
        for (const k of ['cost', 'energy', 'timing']) assert.isTrue((display.alwaysExact as string[]).includes(k));
    });

    suite.test('任務板規則：連鎖專用任務不進一般任務板，覆寫的任務都存在', () => {
        const boards = readJson(path.join(DATA, 'mission-boards.json'));
        const ids = new Set(loadDefs(DATA).map((d) => d.def.id as string));
        const chainOnly = (boards.overrides as AnyJson[]).filter((o) => o.chainOnly === true).map((o) => o.defId as string);
        assert.greaterOrEqual(3, chainOnly.length);
        for (const o of boards.overrides as AnyJson[]) assert.isTrue(ids.has(o.defId as string), `${o.defId} 不存在`);
    });

    suite.test('索引與檔案一致，每個任務都能由索引路徑讀到', () => {
        const index = readJson(path.join(DATA, 'mission-index.json'));
        const files = loadDefs(DATA);
        assert.equals(files.length, (index.defs as AnyJson[]).length);
        for (const entry of index.defs as AnyJson[]) {
            assert.isTrue(fs.existsSync(path.join(DATA, entry.path as string)), `${entry.id} 路徑不存在`);
        }
    });

    suite.test('轉換腳本輸出為最新（--check 不報過期）', () => {
        const script = path.join(ROOT, 'tools_node', 'convert-hall-templates.js');
        const out = execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
        assert.contains(out, '過期 0 個檔案');
    });

    // ───── 反向：壞資料一定被抓到 ─────

    suite.test('壞資料：缺 minIntel:0 的分支會報錯', () => {
        const r = withTempData((d) => editDef(d, 'military', 'MIL_EASY_01', (def) => {
            def.branches = (def.branches as AnyJson[]).filter((b) => b.when.minIntel !== 0);
        }));
        try { expectError(r.errors, '選不到分支'); } finally { r.cleanup(); }
    });

    suite.test('壞資料：低情報分支比高情報安全會報錯', () => {
        const r = withTempData((d) => editDef(d, 'military', 'MIL_EASY_01', (def) => {
            (def.branches as AnyJson[])[0].modifiers.riskMul = 0.1;
        }));
        try { expectError(r.errors, '低情報應更危險'); } finally { r.cleanup(); }
    });

    suite.test('壞資料：成功路徑出現受傷、或 EASY 任務出現被俘都會報錯', () => {
        const r = withTempData((d) => editDef(d, 'military', 'MIL_EASY_01', (def) => {
            const outcome = (def.branches as AnyJson[])[1].outcome as AnyJson;
            outcome.tiers.success = { kind: 'effects', effects: [{ kind: 'generalState', state: 'injured', seasons: 1 }] };
            outcome.tiers.disaster = { kind: 'effects', effects: [{ kind: 'generalState', state: 'captured', seasons: 2 }] };
        }));
        try {
            expectError(r.errors, '只能出現在大失敗路徑');
            expectError(r.errors, '被俘只在 ADVANCED 以上');
        } finally { r.cleanup(); }
    });

    suite.test('壞資料：誤導文字含數字、佔位字樣、引用不存在的任務都會報錯', () => {
        const r = withTempData((d) => editDef(d, 'domestic', 'DOM_EASY_02', (def) => {
            (def.facts as AnyJson[])[0].decoy = '一切順利，成功率九成。';
            def.text.brief = '待補的簡介文字';
            (def.branches as AnyJson[])[2].outcome.tiers.critical = { kind: 'effects', effects: [{ kind: 'spawn', defId: 'NO_SUCH_MISSION' }] };
        }));
        try {
            expectError(r.errors, '誤導文字不得含數字');
            expectError(r.errors, '佔位字樣');
            expectError(r.errors, '不存在的任務');
        } finally { r.cleanup(); }
    });

    suite.test('壞資料：格式錯誤（缺欄位、未知效果）由 schema 擋下', () => {
        const r = withTempData((d) => editDef(d, 'expedition', 'EXP_EASY_02', (def) => {
            delete def.requirement;
            (def.branches as AnyJson[])[0].outcome.tiers.success = { kind: 'effects', effects: [{ kind: 'teleport' }] };
        }));
        try { expectError(r.errors, 'schema'); } finally { r.cleanup(); }
    });

    suite.test('壞資料：手寫任務退化成單層分支會被品質門檻擋下', () => {
        const r = withTempData((d) => editDef(d, 'diplomacy', 'DIP_ENVOY_ESCORT', (def) => {
            def.branches = (def.branches as AnyJson[]).filter((b) => b.when.minIntel === 0);
            def.variants = [{ id: 'PLAIN', weight: 1 }, { id: 'SEALED', weight: 1 }, { id: 'TARGETED', weight: 1 }];
        }));
        try { expectError(r.errors, '至少三層情報分支'); } finally { r.cleanup(); }
    });

    return suite;
}
