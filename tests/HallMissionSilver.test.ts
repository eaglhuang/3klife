/**
 * HallMissionSilver.test.ts — PROG-2-9611 (doc_task_2937)
 * 任務大廳金／銀兩分流（金＝國家公庫、銀兩＝家族）、第一年商業任務保底、第一年銀兩收支與 OCC 人員阻擋驗證
 */
import { assert, TestSuite, TestRunner } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sys } from 'cc';
import { GameSession, InMemoryRosterStore, type HallMissionWallet } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { HALL_RESOURCE_NAME } from '../assets/scripts/core/systems/HallMissionRules';
import { RES_TEXT } from '../assets/scripts/core/mission/MissionProjection';
import { RES_NAME } from '../assets/scripts/core/mission/service/OfflineMissionService';
import { refillBoards, type MissionBoardsConfig } from '../assets/scripts/core/mission/MissionBoardRules';
import { createEmptyMissionSave } from '../assets/scripts/core/mission/MissionSave';
import { computeCost } from '../assets/scripts/core/mission/MissionFitness';
import { MISSION_BLOCK_TEXT, type MissionLedgerEntry } from '../assets/scripts/core/mission/MissionTypes';
import { realBundle } from './mission/missionTestKit';
import { buildMissionDialogState, candidateOptions } from '../assets/scripts/ui/mission/MissionDetailPresenter';
import { hallCostBarStateOf } from '../assets/scripts/core/systems/HallMissionActions';

const COMMERCE_IDS = ['DOM_COMMERCE_01', 'DOM_COMMERCE_02', 'DOM_COMMERCE_03'] as const;
const DATA_DIR = join(__dirname, '..', 'assets/resources/data');
const readData = (name: string): any => JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));

function wallet(initial = 5000): HallMissionWallet {
    let gold = initial;
    return {
        gold: () => gold,
        spend: (n: number) => { if (gold < n) return false; gold -= n; return true; },
        grant: (n: number) => { gold += n; },
    };
}

function general(id: string, over: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 85, int: 80, lea: 85, pol: 80, cha: 80, luk: 40, ...over,
    } as unknown as GeneralConfig;
}

async function newSession(w: HallMissionWallet = wallet()): Promise<{ session: GameSession; w: HallMissionWallet }> {
    services().initialize();
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(true);
    session.startNewGame(7);
    session.configureFamily(readData('family-config.json'));
    session.configureOccupancyMatrix(readData('occupancy-matrix.json'));
    session.addGenerals([general('g1'), general('g2')]);
    session.bindMissionData(realBundle(), w);
    return { session, w };
}

/** 走遍一份任務定義裡所有資源效果 */
function resourceEffects(def: unknown): Array<{ res: string; base: number; mulKey: string }> {
    const out: Array<{ res: string; base: number; mulKey: string }> = [];
    const walk = (o: any): void => {
        if (!o || typeof o !== 'object') return;
        if (o.kind === 'resource') out.push({ res: o.res, base: typeof o.amount === 'number' ? o.amount : o.amount.base, mulKey: typeof o.amount === 'number' ? 'reward' : o.amount.mulKey });
        for (const k of Object.keys(o)) walk(o[k]);
    };
    walk(def);
    return out;
}

const entry = (res: 'gold' | 'silver', amount: number): MissionLedgerEntry => ({ missionId: 'M-T', generalId: 'g1', tier: 'success', kind: 'resource', res, amount } as MissionLedgerEntry);

export function createHallMissionSilverSuite(): TestSuite {
    const suite = new TestSuite('HallMissionSilver (任務大廳金／銀兩分流與第一年商業保底，PROG-2-9611)');
    const bundle = realBundle();

    suite.test('口徑名詞：金＝國家公庫、銀兩＝家族，不寫「黃金」「白銀」', () => {
        assert.equals('金', RES_TEXT.gold);
        assert.equals('銀兩', RES_TEXT.silver);
        assert.equals('金', RES_NAME.gold);
        assert.equals('銀兩', RES_NAME.silver);
        assert.equals('金', HALL_RESOURCE_NAME.silver, '舊制 silver 欄位實為入金庫的金，顯示「金」');
    });

    suite.test('公務任務走金：非商業任務的獎懲與缺省耗費都不碰家族銀兩', () => {
        const defs = Array.from(bundle.defs.values());
        assert.isTrue(defs.length > 30, '真實任務定義已載入');
        let goldDefs = 0;
        for (const def of defs) {
            if ((COMMERCE_IDS as readonly string[]).includes(def.id)) continue;
            const eff = resourceEffects(def);
            assert.isFalse(eff.some((e) => e.res === 'silver'), `${def.id} 是公務任務，不可有銀兩效果`);
            assert.isTrue((def.cost?.silver ?? 0) === 0, `${def.id} 不可耗銀兩`);
            if (eff.some((e) => e.res === 'gold')) goldDefs += 1;
            assert.equals(0, computeCost(def, null).silver, `${def.id} 缺省耗費不含銀兩`);
        }
        assert.isTrue(goldDefs > 10, `有金獎懲的公務任務 ${goldDefs} 個`);
        for (const d of ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'] as const) {
            const cost = bundle.balance.difficulties[d].cost;
            assert.isTrue(cost.gold > 0, `${d} 缺省耗費走金`);
            assert.equals(0, cost.silver, `${d} 缺省不耗銀兩`);
        }
    });

    suite.test('商業任務走銀兩：獎勵只入銀兩、不耗金，單筆在 30～80（含最高情報 ×1.25）', () => {
        for (const id of COMMERCE_IDS) {
            const def = bundle.defs.get(id)!;
            assert.isTrue(!!def, `${id} 已登錄`);
            const eff = resourceEffects(def);
            assert.isFalse(eff.some((e) => e.res === 'gold'), `${id} 不可有金效果`);
            const cost = computeCost(def, null);
            assert.equals(0, cost.gold, `${id} 不耗金`);
            assert.equals(0, cost.silver, `${id} 不耗銀兩`);
            const rewards = eff.filter((e) => e.res === 'silver' && e.base > 0).map((e) => e.base);
            assert.isTrue(rewards.length > 0, `${id} 有銀兩獎勵`);
            const mulMax = Math.max(...def.branches.map((b) => b.modifiers.rewardMul));
            for (const base of rewards) assert.isTrue(Math.round(base * mulMax) <= 80, `${id} 獎勵 ${base}×${mulMax} 不超過 80`);
            assert.isTrue(Math.min(...rewards) >= 30, `${id} 最低獎勵不低於 30`);
        }
    });

    suite.test('入帳：金入國家公庫（錢包）、銀兩入家族帳本，兩邊互不影響', async () => {
        const { session, w } = await newSession();
        const silver0 = session.hallMissionStock().silver;
        assert.equals(600, silver0, '開局家族銀兩 600（family-config.json）');
        const apply = (entries: MissionLedgerEntry[]): void => (session as any)._applyMissionLedger(entries, { missionId: 'M-T' });
        apply([entry('gold', 80)]);
        assert.equals(5080, w.gold(), '金入公庫');
        assert.equals(silver0, session.hallMissionStock().silver, '公務獎勵不動家族銀兩');
        apply([entry('silver', 50)]);
        assert.equals(silver0 + 50, session.hallMissionStock().silver, '商業獎勵入家族銀兩');
        assert.equals(5080, w.gold(), '商業獎勵不動公庫');
        // 結算回報：金與銀兩分開計
        const gains = (session as any)._missionSettleGains;
        assert.equals(80, gains.gold);
        assert.equals(50, gains.silver);
    });

    suite.test('耗費：金耗費扣公庫、銀兩耗費扣家族，不足不扣、不留半套', async () => {
        const { session, w } = await newSession();
        const host = (session as any)._missionHost();
        assert.isTrue(host.spend({ grain: 0, troops: 0, gold: 120, silver: 0 }));
        assert.equals(4880, w.gold());
        assert.equals(600, session.hallMissionStock().silver, '花金不動家族銀兩（新玩家派公務任務不會把家族銀兩花光）');
        assert.isTrue(host.spend({ grain: 0, troops: 0, gold: 0, silver: 150 }));
        assert.equals(450, session.hallMissionStock().silver);
        assert.equals(4880, w.gold());
        assert.isFalse(host.spend({ grain: 0, troops: 0, gold: 10, silver: 1000 }), '銀兩不足整筆失敗');
        assert.equals(4880, w.gold(), '失敗時金也沒被扣');
        assert.equals(450, session.hallMissionStock().silver);
    });

    suite.test('實際派遣公務任務：只扣金（公庫），家族銀兩不動', async () => {
        const { session, w } = await newSession();
        const service = session.missionService!;
        const board = service.getBoard();
        if (!board.ok) throw new Error('board failed');
        const target = board.value.missions.find((m) => m.status === 'OPEN' && !(COMMERCE_IDS as readonly string[]).includes(m.defId));
        assert.isTrue(!!target, '板上有公務任務');
        const detail = service.getDetail(target!.id);
        if (!detail.ok) throw new Error('detail failed');
        assert.isTrue(detail.value.cost.gold > 0 && detail.value.cost.silver === 0, '公務任務耗金、不耗銀兩');
        const before = { gold: w.gold(), silver: session.hallMissionStock().silver };
        const r = await service.dispatch({ requestId: 'rq-1', missionId: target!.id, generalIds: 'delegate' });
        if (r.ok === false) throw new Error(`dispatch failed ${r.text}`);
        assert.equals(before.gold - detail.value.cost.gold, w.gold(), '金從公庫扣');
        assert.equals(before.silver, session.hallMissionStock().silver, '家族銀兩不動');
    });

    suite.test('第一年（前 4 季）Domestic 牆保底至少出現 1 個商業任務', () => {
        const boardsCfg: MissionBoardsConfig = readData('mission-boards.json');
        assert.isTrue(!!boardsCfg.yearOneCommerceGuaranteed, 'mission-boards.json 應啟用 yearOneCommerceGuaranteed');
        const themeWall = new Map(Array.from(bundle.themes.entries()).map(([k, v]) => [k, { wall: v.wall }]));
        for (let season = 1; season <= 4; season++) {
            const snap = createEmptyMissionSave(100 + season, season);
            const res = refillBoards(snap, bundle.catalog, bundle.defs, boardsCfg, themeWall, { season, visibleDifficulties: ['EASY', 'NORMAL', 'ELITE'], fame: 50 });
            const hasCommerce = res.snapshot.missions.some((m) => (COMMERCE_IDS as readonly string[]).includes(m.defId) && m.status === 'OPEN');
            assert.isTrue(hasCommerce, `第 ${season} 季 Domestic 任務牆必須保底至少 1 個商業任務`);
        }
    });

    suite.test('第一年家族銀兩收支：只靠俸祿也夠「說親一次＋養一個孩子」，商業任務只是額外進帳', () => {
        const cfg = readData('family-config.json');
        const quarters = 4;
        const income = cfg.startingSilver + cfg.clanStipendBase * quarters;
        const spend = cfg.matchmakerPrice * cfg.matchmakerPerYear + cfg.wetNurseSilverPerQuarter * quarters;
        assert.isTrue(income - spend >= 0, `最壞情況（媒人用滿 ${cfg.matchmakerPerYear} 次、乳母全年）收入 ${income} 應 ≥ 支出 ${spend}`);
        const minCommerce = Math.min(...COMMERCE_IDS.flatMap((id) => resourceEffects(bundle.defs.get(id)).filter((e) => e.res === 'silver' && e.base > 0).map((e) => Math.round(e.base * 0.85))));
        assert.isTrue(minCommerce >= 30, `商業任務單筆最低（盲辦 ×0.85）${minCommerce} 銀兩`);
    });

    suite.test('OCC：哺乳期、教官擋大廳任務，原因分開顯示；候選清單文字可走 i18n', async () => {
        const { session } = await newSession();
        (session as any)._occupancy.acquire({ personId: 'g1', kind: 'nursing', refId: 'nurse:b1', since: 0, until: null });
        (session as any)._occupancy.acquire({ personId: 'g2', kind: 'mentorAssign', refId: 'mentor:1', since: 0, until: null });
        const facts = session.missionGeneralFacts();
        assert.isTrue(facts.find((f) => f.id === 'g1')!.block.includes('nursing'), '哺乳期武將被擋');
        assert.isTrue(facts.find((f) => f.id === 'g2')!.block.includes('mentor'), '教官武將被擋');
        assert.equals('哺乳期中', MISSION_BLOCK_TEXT.nursing);
        assert.equals('擔任教官中', MISSION_BLOCK_TEXT.mentor);
        const board = session.missionService!.getBoard();
        if (!board.ok) throw new Error('board failed');
        const cands = session.missionService!.getCandidates(board.value.missions[0].id);
        if (!cands.ok) throw new Error('cands failed');
        const opts = candidateOptions(cands.value, (b) => `i18n:${b}`);
        assert.equals('i18n:nursing', opts.find((o) => o.id === 'g1')!.blockedText, '提示文字走傳入的 i18n 轉換');
    });

    suite.test('哺乳期武將不能被派任務（派遣當下被擋）', async () => {
        const { session } = await newSession();
        (session as any)._occupancy.acquire({ personId: 'g1', kind: 'nursing', refId: 'nurse:b1', since: 0, until: null });
        const service = session.missionService!;
        const board = service.getBoard();
        if (!board.ok) throw new Error('board failed');
        const r = await service.dispatch({ requestId: 'rq-occ', missionId: board.value.missions[0].id, generalIds: ['g1'] });
        assert.isFalse(r.ok, '哺乳期武將派遣被擋');
    });

    suite.test('OCC 矩陣：nursing 擋 hallMission', () => {
        const nursing = readData('occupancy-matrix.json').rules.nursing;
        assert.isFalse(nursing.allows.includes('hallMission'));
        assert.isTrue(nursing.blocks.includes('hallMission'));
    });

    suite.test('詳情視窗：耗金顯示「金」、缺金提示「金不足」；耗費列依幣別切換名稱', async () => {
        const { session } = await newSession();
        const wallOfTheme = (theme: string) => bundle.themes.get(theme)!.wall as any;
        const board = session.missionService!.getBoard();
        if (!board.ok) throw new Error('board failed');
        const gov = board.value.missions.find((m) => m.status === 'OPEN' && !(COMMERCE_IDS as readonly string[]).includes(m.defId))!;
        const poor = buildMissionDialogState(session.missionService!, gov.id, wallOfTheme, {
            season: 1, selectedGeneralId: null, stock: { grain: 10000, troops: 10000, gold: 0, silver: 9999 }, reconGrainCost: 50,
        })!;
        assert.equals('金', poor.costFundNameLabel);
        assert.contains(poor.costFundValueLabel, '不足');
        assert.isTrue(!!poor.actionBlockedText.execute && poor.actionBlockedText.execute.includes('金不足'), '缺金時擋派遣並寫「金不足」');
        assert.equals('銀兩', hallCostBarStateOf({ GRAIN: 0, TROOPS: 0, GOLD: 0, SILVER: 30, TIME_MINUTES: 0 }).costFundNameLabel);
        assert.equals('金／銀兩', hallCostBarStateOf({ GRAIN: 0, TROOPS: 0, GOLD: 10, SILVER: 30, TIME_MINUTES: 0 }).costFundNameLabel);
    });

    suite.test('四語系：金／銀兩、獎勵、耗費、缺額、阻擋原因文字齊全', () => {
        const keys = ['ui.resource.silver', 'ui.resource.gold', 'ui.mission.reward.silver', 'ui.mission.reward.gold', 'ui.mission.cost.silver', 'ui.mission.cost.gold',
            'ui.mission.shortage.silver', 'ui.mission.shortage.gold', 'ui.mission.block.nursing', 'ui.mission.block.mentor', 'ui.mission.block.on-sortie', 'ui.mission.block.occupied'];
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const i18n = JSON.parse(readFileSync(join(__dirname, '..', `assets/resources/i18n/${lang}.json`), 'utf8'));
            for (const k of keys) assert.isTrue(!!i18n[k], `${lang} 應有 ${k}`);
        }
    });

    return suite;
}

if (require.main === module) {
    const runner = new TestRunner();
    runner.register(createHallMissionSilverSuite());
    runner.runAll().then((summary) => {
        process.exit(summary.failed > 0 ? 1 : 0);
    });
}
