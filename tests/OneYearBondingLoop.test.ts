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
import { getStarterYouthConfig, isYouthGeneral, youthCanEnroll } from '../assets/scripts/core/services/StarterYouthService';
import { PREGNANCY_LOCK_SEASONS, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { UNVEILING_AGE } from '../assets/scripts/core/systems/Unveiling';
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

        // 驗證初始資源與名冊（6 位初始名將 + 1 位開局紅顏貂蟬 + 1 位 14 歲少年名將；PROG-2-9194 取代 4 歲幼苗）
        const initialRoster = roster.getAll();
        assert.equals(9, initialRoster.length, '新帳號應含 6 位初始名將 + 1 位開局紅顏 + 1 位 14 歲少年名將 + 1 位 7 歲幼苗');
        assert.equals(undefined, initialRoster.find((g) => g.id === 'starter-royal-child'), '新開局不再送 4 歲宗室幼苗');
        const youthId = getStarterYouthConfig().defaultPickId;
        const starterYouth = initialRoster.find((g) => g.id === youthId);
        assert.isTrue(isYouthGeneral(starterYouth), '新帳號開局應含少年名將');
        assert.equals(14, starterYouth!.age, '少年名將開局年齡應為 14 歲');
        assert.isTrue(!youthCanEnroll(starterYouth!), '開局當下未滿 15 歲不可入學');
        assert.equals(1000, STARTER_GACHA_WALLET.gold, '開局黃金應為 1000');
        assert.equals(10, STARTER_GACHA_WALLET.mentorTickets, '開局連線券應為 10');

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
        // 2) 開局的 14 歲少年名將跑滿 4 季（第 1 年年末）剛好滿 15 歲，可入學
        assert.equals(4, seasonSnapshots.length);
        assert.isTrue(yearEndTriggered, '推進滿 4 季應觸發跨年 / 年度結算');
        assert.equals(0, seasonSnapshots[3].pregnancyLeft, '推進 4 季後母方待產期滿解除');
        assert.equals(1, seasonSnapshots[3].childAge, '第 1 年底新生子嗣年齡應為 1 歲');
        assert.equals(false, unveiledInYear1, '少年名將不走抓周開獎，也不應有 5 歲開蒙事件');
        assert.equals(false, nurtureEligibleInYear1, '0 歲新生兒第 1 年內仍無法培育');
        assert.equals(5, UNVEILING_AGE);

        const grownYouth = roster.getAll().find((g) => g.id === youthId);
        assert.equals(15, grownYouth?.age, '第 1 年年末少年名將滿 15 歲');
        assert.isTrue(youthCanEnroll(grownYouth!), '第 1 年年末滿 15 歲可入學');
        assert.equals(undefined, (grownYouth as BreedingGeneral | undefined)?.fatherId, '少年名將不是自家子嗣，沒有父母欄位（syncGraphFromRoster 只收有父母欄位者，所以不入血統樹）');

        await session.advanceSeason(); // 進入第 2 年第 2 季（Nurture 培育季）
        assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode, '第 5 季應進入 Nurture 培育季');
        const youthCheck = nurture.checkStart(youthId, []);
        assert.isTrue(youthCheck.eligible, `滿 15 歲少年名將在培育季可入學，reasons=${youthCheck.reasons.join(',')}`);
    });

    suite.test('舊存檔不補送少年名將與幼苗，且無開局紅顏時六名將全為男性', async () => {
        const generals = loadRealGenerals();
        const session = new GameSession(888);
        const roster = new InMemoryRosterStore();
        session.setRosterStore(roster);
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setAutoSave(false);

        await session.startNewGameWithStarters(888, generals, { includeStarterYouth: false, includeStarterSeedling: false });
        const females = roster.getAll().filter((g) => g.gender === '女');
        assert.equals(0, females.length, '若未配置開局紅顏，初始 6 名將全為男性，無女方可供結緣');
        assert.equals(undefined, roster.getAll().find((g) => g.id === 'starter-royal-child'));
    });

    return suite;
}
