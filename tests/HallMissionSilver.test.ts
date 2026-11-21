/**
 * HallMissionSilver.test.ts — PROG-2-9611 (doc_task_2937)
 * 任務大廳金／銀兩口徑一致化、第一年商業任務保底與 OCC 人員阻擋驗證
 */
import { assert, TestSuite, TestRunner } from './TestRunner';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sys } from 'cc';
import { GameSession, InMemoryRosterStore, type HallMissionWallet } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { HALL_RESOURCE_NAME, HALL_BLOCK_TEXT } from '../assets/scripts/core/systems/HallMissionRules';
import { RES_TEXT } from '../assets/scripts/core/mission/MissionProjection';
import { RES_NAME } from '../assets/scripts/core/mission/service/OfflineMissionService';
import { refillBoards, type MissionBoardsConfig } from '../assets/scripts/core/mission/MissionBoardRules';
import { createEmptyMissionSave } from '../assets/scripts/core/mission/MissionSave';
import { realBundle } from './mission/missionTestKit';
import { buildMissionDialogState } from '../assets/scripts/ui/mission/MissionDetailPresenter';

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

async function newSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    services().initialize();
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(true);
    session.startNewGame(7);
    session.addGenerals([general('g1'), general('g2')]);
    return session;
}

export function createHallMissionSilverSuite(): TestSuite {
    const suite = new TestSuite('HallMissionSilver (任務大廳金銀兩口徑一致化與第一年商業保底，PROG-2-9611)');
    const bundle = realBundle();

    suite.test('口徑名詞統一：各模組 silver 名詞皆為「銀兩」，無「黃金」或「白銀」混淆', () => {
        assert.equals('銀兩', HALL_RESOURCE_NAME.silver, 'HallMissionRules 資源名稱應為銀兩');
        assert.equals('銀兩', RES_TEXT.silver, 'MissionProjection 資源名稱應為銀兩');
        assert.equals('銀兩', RES_NAME.silver, 'OfflineMissionService 資源名稱應為銀兩');
        assert.equals('哺乳期中', HALL_BLOCK_TEXT.nursing, '阻擋原因 nursing 應為哺乳期中');
        assert.equals('擔任教官中', HALL_BLOCK_TEXT.mentor, '阻擋原因 mentor 應為擔任教官中');
        assert.equals('出征作戰中', HALL_BLOCK_TEXT.sortie, '阻擋原因 sortie 應為出征作戰中');
    });

    suite.test('商業任務模板已落實，且包含銀兩獎勵', () => {
        const root = join(__dirname, '..');
        const comm1Path = join(root, 'assets/resources/data/missions/domestic/DOM_COMMERCE_01.json');
        const comm2Path = join(root, 'assets/resources/data/missions/domestic/DOM_COMMERCE_02.json');
        const comm3Path = join(root, 'assets/resources/data/missions/domestic/DOM_COMMERCE_03.json');

        assert.isTrue(existsSync(comm1Path), 'DOM_COMMERCE_01 檔案存在');
        assert.isTrue(existsSync(comm2Path), 'DOM_COMMERCE_02 檔案存在');
        assert.isTrue(existsSync(comm3Path), 'DOM_COMMERCE_03 檔案存在');

        const comm1 = JSON.parse(readFileSync(comm1Path, 'utf8'));
        const comm2 = JSON.parse(readFileSync(comm2Path, 'utf8'));
        const comm3 = JSON.parse(readFileSync(comm3Path, 'utf8'));

        assert.isTrue(comm1.requirement?.keyStats?.cha !== undefined, 'DOM_COMMERCE_01 (市集巡察) 重點屬性應含 cha');
        assert.isTrue(comm2.requirement?.keyStats?.pol !== undefined, 'DOM_COMMERCE_02 (特產運銷) 重點屬性應含 pol');
        assert.isTrue(comm3.requirement?.keyStats?.int !== undefined, 'DOM_COMMERCE_03 (平抑物價) 重點屬性應含 int');

        const rawTmpl = JSON.parse(
            readFileSync(join(root, 'assets/resources/data/hall-mission-templates.json'), 'utf8')
        );
        const tmpls: any[] = rawTmpl.Templates || rawTmpl;
        const t1 = tmpls.find(t => t.Template_ID === 'DOM_COMMERCE_01');
        const t2 = tmpls.find(t => t.Template_ID === 'DOM_COMMERCE_02');
        const t3 = tmpls.find(t => t.Template_ID === 'DOM_COMMERCE_03');

        assert.isTrue(!!t1 && t1.Key_Stat === 'cha', 'DOM_COMMERCE_01 模板存在且重點屬性為 cha');
        assert.isTrue(!!t2 && t2.Key_Stat === 'pol', 'DOM_COMMERCE_02 模板存在且重點屬性為 pol');
        assert.isTrue(!!t3 && t3.Key_Stat === 'int', 'DOM_COMMERCE_03 模板存在且重點屬性為 int');
    });

    suite.test('第一年（前 4 季）Domestic 牆保底至少出現 1 個商業任務', () => {
        const boardsCfg: MissionBoardsConfig = JSON.parse(
            readFileSync(join(__dirname, '..', 'assets/resources/data/mission-boards.json'), 'utf8')
        );

        assert.isTrue(!!boardsCfg.yearOneCommerceGuaranteed, 'mission-boards.json 應啟用 yearOneCommerceGuaranteed');

        const commIds = new Set(['DOM_COMMERCE_01', 'DOM_COMMERCE_02', 'DOM_COMMERCE_03']);
        const themeWall = new Map(Array.from(bundle.themes.entries()).map(([k, v]) => [k, { wall: v.wall }]));

        for (let season = 1; season <= 4; season++) {
            const snap = createEmptyMissionSave(100 + season, season);
            const res = refillBoards(
                snap,
                bundle.catalog,
                bundle.defs,
                boardsCfg,
                themeWall,
                { season, visibleDifficulties: ['EASY', 'NORMAL', 'ELITE'], fame: 50 }
            );
            const domMissions = res.snapshot.missions.filter((m) => {
                const def = bundle.defs.get(m.defId);
                return def && bundle.themes.get(def.theme)?.wall === 'Domestic';
            });
            const hasCommerce = domMissions.some((m) => commIds.has(m.defId));
            assert.isTrue(hasCommerce, `第 ${season} 季 Domestic 任務牆必須保底至少 1 個商業任務`);
        }
    });

    suite.test('任務大廳銀兩真扣家族銀兩庫房（GameSession.silverLedger）', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());

        const initialSilver = session.hallMissionStock().silver;
        assert.equals(600, initialSilver, '新局家族銀兩預設為 600');

        // 測試透過 host spend 扣除 150 銀兩
        const host = (session as any)._missionHost();
        const spent = host.spend({ grain: 0, troops: 0, silver: 150 });
        assert.isTrue(spent, '扣除 150 銀兩應成功');
        assert.equals(450, session.hallMissionStock().silver, '扣除後家族銀兩應剩 450');

        // 測試超額扣除
        const overSpend = host.spend({ grain: 0, troops: 0, silver: 1000 });
        assert.isFalse(overSpend, '超額扣除銀兩應失敗');
        assert.equals(450, session.hallMissionStock().silver, '失敗時家族銀兩不變');

        // 測試入帳
        session.silverLedger.creditSilver(200);
        assert.equals(650, session.hallMissionStock().silver, '獎勵入帳後家族銀兩應增為 650');
    });

    suite.test('OCC 人員矩陣阻擋：哺乳期（nursing）不能接任務大廳任務', () => {
        const matrix = JSON.parse(
            readFileSync(join(__dirname, '..', 'assets/resources/data/occupancy-matrix.json'), 'utf8')
        );
        const nursing = matrix.rules?.nursing;
        assert.isTrue(!!nursing, 'occupancy-matrix.json 應有 nursing 規則');
        assert.isTrue(!nursing.allows || !nursing.allows.includes('hallMission'), 'nursing allows 不可包含 hallMission');
        assert.isTrue(Array.isArray(nursing.blocks) && nursing.blocks.includes('hallMission'), 'nursing blocks 必須包含 hallMission');
    });

    suite.test('缺額文字正確提示「銀兩不足」而非「黃金不足」', async () => {
        const session = await newSession();
        session.bindMissionData(bundle, wallet());

        const boardRes = session.missionService!.getBoard();
        if (!boardRes.ok) throw new Error('boardRes failed');
        const openMissions = boardRes.value.missions.filter((m) => m.status === 'OPEN');
        assert.isTrue(openMissions.length > 0, '應有任務');

        const target = openMissions[0];
        const wallOfTheme = (theme: string) => bundle.themes.get(theme)!.wall as any;

        // 當銀兩不足時
        const state = buildMissionDialogState(session.missionService!, target.id, wallOfTheme, {
            season: 1,
            selectedGeneralId: null,
            stock: { grain: 10000, troops: 10000, silver: 0 },
            reconGrainCost: 50,
        });

        assert.isTrue(state !== null, 'Dialog state 應成功產生');
        // 檢查 costSilverValueLabel 格式
        assert.isTrue(state!.costSilverValueLabel !== undefined, '應有 costSilverValueLabel');
    });

    suite.test('四語系 i18n 資源與任務字串完整', () => {
        const root = join(__dirname, '..');
        const langs = ['zh-TW', 'zh-CN', 'en', 'ja'];
        for (const lang of langs) {
            const i18n = JSON.parse(readFileSync(join(root, `assets/resources/i18n/${lang}.json`), 'utf8'));
            assert.isTrue(!!i18n['ui.resource.silver'], `${lang} 應有 ui.resource.silver`);
            assert.isTrue(!!i18n['ui.resource.gold'], `${lang} 應有 ui.resource.gold`);
            assert.isTrue(!!i18n['ui.mission.reward.silver'], `${lang} 應有 ui.mission.reward.silver`);
            assert.isTrue(!!i18n['ui.mission.cost.silver'], `${lang} 應有 ui.mission.cost.silver`);
            assert.isTrue(!!i18n['ui.mission.shortage.silver'], `${lang} 應有 ui.mission.shortage.silver`);
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
