/**
 * OneYearBondingLoop.test.ts — PROG-2-9174 新玩家結緣／培育一年循環卡關審查（無頭模擬回歸測試）
 *
 * 模擬新帳號初始資料（generals.json 六名將 + 紅顏貂蟬、STARTER_GACHA_WALLET），
 * 推進 4 季（1 遊戲年），記錄：結緣 → 懷孕 → 出生 → 開蒙培育 → 年度總結 每個節點的可達性、資源與卡點。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { STARTER_CORE_GENERAL_ID } from '../assets/scripts/core/services/StarterRosterService';
import { PREGNANCY_LOCK_SEASONS, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { chooseFate, UNVEILING_AGE, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import * as fs from 'fs';
import * as path from 'path';

function loadRealGenerals(): GeneralConfig[] {
    const filePath = path.resolve(__dirname, '../assets/resources/data/generals.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.generals ?? []);
}

export function createOneYearBondingLoopSuite(): TestSuite {
    const suite = new TestSuite('OneYearBondingLoop Audit (PROG-2-9174)');

    suite.test('新帳號第1年（4季）結緣→懷孕→出生→開蒙培育→年度總結全流程診斷', async () => {
        const generals = loadRealGenerals();
        const storage = new MemoryStorageAdapter();
        const save = new PlayerSaveService(storage);
        const roster = new InMemoryRosterStore();
        const session = new GameSession(777);
        session.setRosterStore(roster);
        session.setSaveService(save);
        session.setAutoSave(false);
        // 固定低隨機值確保結緣必定受孕，便於觀測後續出生與培育節點
        session.setRandomSource(() => 0.05);

        await session.startNewGameWithStarters(777, generals, {
            coreGeneralId: STARTER_CORE_GENERAL_ID,
            beautyGeneralId: 'diao-chan',
        });

        // 驗證初始資源與名冊（6 位初始名將 + 1 位開局紅顏貂蟬 + 1 位 4 歲宗室幼苗）
        const initialRoster = roster.getAll();
        assert.equals(8, initialRoster.length, '新帳號應含 6 位初始名將 + 1 位開局紅顏 + 1 位 4 歲宗室幼苗');
        const starterChild = initialRoster.find((g) => g.id === 'starter-royal-child');
        assert.isTrue(!!starterChild, '新帳號開局應含 4 歲宗室幼苗 starter-royal-child');
        assert.equals(4, starterChild!.age, '宗室幼苗開局年齡應為 4 歲');
        assert.equals(1000, STARTER_GACHA_WALLET.gold, '開局黃金應為 1000');
        assert.equals(5, STARTER_GACHA_WALLET.mentorTickets, '開局教官支援券應為 5');

        const graph = BloodlineGraph.getInstance();
        graph.clear();
        const breeding = new BreedingService(roster, graph, {
            random: () => 0.05,
            currentSeason: () => session.gameTime.totalSeasonsElapsed,
        });
        breeding.syncGraphFromRoster();

        const nurture = new NurtureService(roster, {
            random: () => 0.05,
            currentSeason: () => session.gameTime.totalSeasonsElapsed,
            currentMode: () => session.gameTime.currentMode,
        });

        const bondingUI = new BondingSetupController({
            breeding,
            roster,
            milestoneStage: () => session.displayStage,
        });

        // Step 1: 結緣步驟檢查
        bondingUI.selectFather(STARTER_CORE_GENERAL_ID);
        bondingUI.selectMother('diao-chan');
        const uiView = bondingUI.getView();
        assert.isTrue(uiView.enabled.btnConfirmBond, '開局張飛×貂蟬結緣確認按鈕 (btnConfirmBond) 應可點選');

        const eligibility = breeding.checkEligibility(STARTER_CORE_GENERAL_ID, 'diao-chan');
        assert.isTrue(eligibility.ok, `結緣資格應通過，實際 reasons=${eligibility.reasons.join(',')}`);

        const breedResult = breeding.breed(STARTER_CORE_GENERAL_ID, 'diao-chan');
        assert.equals('conceived', breedResult.outcome, '測試固定亂數 0.05 下應受孕成功');
        assert.isTrue(!!breedResult.child, '受孕後應產生 0 歲子嗣資料');
        const childId = breedResult.child!.id;
        assert.equals(0, breedResult.child!.age ?? 0, '剛出生子嗣初始年齡為 0 歲');

        const motherAfterBreed = roster.getAll().find((g) => g.id === 'diao-chan') as BreedingGeneral | undefined;
        assert.equals(PREGNANCY_LOCK_SEASONS, motherAfterBreed?.pregnancySeasonsLeft, '母方應進入 4 季（1年）待產凍結');

        // Step 2: 推進 4 季（滿 1 年：S1->S2->S3->S4->Year 2 S1）
        let unveiledInYear1 = false;
        let yearEndTriggered = false;
        let nurtureEligibleInYear1 = false;
        const seasonSnapshots: Array<{ season: number; mode: GameTimeMode; childAge: number; pregnancyLeft: number }> = [];

        for (let step = 0; step < 4; step++) {
            const adv = await session.advanceSeason();
            breeding.advanceSeason();
            if (adv.unveilings.length > 0) unveiledInYear1 = true;
            if (session.gameTime.currentYear > 1) yearEndTriggered = true;

            const currentChild = roster.getAll().find((g) => g.id === childId);
            const currentMother = roster.getAll().find((g) => g.id === 'diao-chan') as BreedingGeneral | undefined;
            const nurtureCheck = nurture.checkStart(childId, []);
            if (nurtureCheck.eligible) nurtureEligibleInYear1 = true;

            seasonSnapshots.push({
                season: session.gameTime.totalSeasonsElapsed,
                mode: session.gameTime.currentMode,
                childAge: currentChild?.age ?? -1,
                pregnancyLeft: currentMother?.pregnancySeasonsLeft ?? 0,
            });
        }

        // 關鍵診斷斷言：
        // 1) 結緣生出的新生兒（0→1歲）在第 1 年底仍未滿 5 歲，尚未開蒙
        // 2) 開局附贈的 4 歲宗室幼苗在跑滿 4 季（1年）後剛好滿 5 歲並觸發開蒙，選定宿命後即可進入培育
        assert.equals(4, seasonSnapshots.length);
        assert.isTrue(yearEndTriggered, '推進滿 4 季應觸發跨年 / 年度結算');
        assert.equals(0, seasonSnapshots[3].pregnancyLeft, '推進 4 季後母方待產期滿解除');
        assert.equals(1, seasonSnapshots[3].childAge, '第 1 年底新生子嗣年齡應為 1 歲');
        assert.equals(true, unveiledInYear1, '開局 4 歲宗室幼苗跑滿 1 年（4季）應觸發 5 歲開蒙');
        assert.equals(false, nurtureEligibleInYear1, '0 歲新生兒第 1 年內仍無法培育');
        assert.equals(5, UNVEILING_AGE);

        const unveiledStarterChild = roster.getAll().find((g) => g.id === 'starter-royal-child');
        assert.equals(5, unveiledStarterChild?.age, '跑滿 1 年後開局宗室幼苗應為 5 歲');
        assert.equals('Unveiled', unveiledStarterChild?.status, '開局宗室幼苗滿 5 歲應自動開獎為 Unveiled');

        // 選定宿命並進入下一個培育季後即可通過資格檢查並進入學府培育
        const withFate = chooseFate(unveiledStarterChild as UnveilingGeneral, 'accept', () => 0.5);
        roster.replaceAll(roster.getAll().map((g) => (g.id === 'starter-royal-child' ? withFate : g)));
        await session.advanceSeason(); // 進入第 2 年第 2 季（Nurture 培育季）
        assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode, '第 5 季應進入 Nurture 培育季');
        const starterNurtureCheck = nurture.checkStart('starter-royal-child', []);
        assert.isTrue(starterNurtureCheck.eligible, `滿一年開蒙並選完宿命後應可進入培育，reasons=${starterNurtureCheck.reasons.join(',')}`);
        const startedAcademy = nurture.start('starter-royal-child', []);
        assert.equals('starter-royal-child', startedAcademy.childId, '開局宗室幼苗應能正式開始學府培育');
    });

    suite.test('舊存檔不補送開局幼苗，且無開局紅顏時六名將全為男性', async () => {
        const generals = loadRealGenerals();
        const session = new GameSession(888);
        const roster = new InMemoryRosterStore();
        session.setRosterStore(roster);
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setAutoSave(false);

        await session.startNewGameWithStarters(888, generals, { includeStarterChild: false });
        const females = roster.getAll().filter((g) => g.gender === '女');
        assert.equals(0, females.length, '若未配置開局紅顏，初始 6 名將全為男性，無女方可供結緣');
        assert.equals(undefined, roster.getAll().find((g) => g.id === 'starter-royal-child'));
    });

    return suite;
}
