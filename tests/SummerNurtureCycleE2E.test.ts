/**
 * SummerNurtureCycleE2E — 夏季訓練體力 × 季節循環 × 存讀檔端到端（QA，PROG-2-0628）
 *
 * Unity 對照：像 PlayMode 測試，用真正的 ServiceLoader 接線（培育服務讀 session 的季節），
 * 一路推進四季，看同一場培育在不同季節訓練扣多少體力，並在夏季存檔後回讀確認狀態一致。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerRosterService } from '../assets/scripts/core/services/PlayerRosterService';
import { DEFAULT_SEASON_MODIFIERS, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function readyChild(id: string): GeneralConfig {
    const child = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(child).general, 'accept') as unknown as GeneralConfig;
}

export function createSummerNurtureCycleE2ESuite(): TestSuite {
    const suite = new TestSuite('SummerNurtureCycleE2E (夏季訓練體力 × 季節循環)');

    suite.test('同一場培育跨季訓練：秋季扣 25、夏季扣 31（×1.25）；夏季存檔回讀後再訓練仍扣 31', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        services().initialize();
        const original = PlayerRosterService.getAll();
        try {
            const { session, nurture } = services();
            PlayerRosterService.replaceAll([readyChild('kid')]);
            session.startNewGame(20261020);
            // 亂數固定 0.99：消耗取上限 25，且不觸發受傷／跳過回合
            session.setRandomSource(() => 0.99);

            // 第 1 年春（治理）→ 夏（作戰）→ 秋（培育）：推進兩季到培育季才能入學
            await session.advanceSeason();
            await session.advanceSeason();
            assert.equals(3, session.gameTime.currentSeason);
            assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode);

            nurture.start('kid', []);
            const autumnBefore = nurture.getSession('kid')!.vigor;
            const autumn = nurture.train('kid', 'str');
            assert.equals(25, autumnBefore - autumn.session.vigor, '秋季訓練消耗上限 25');

            // 冬 → 春 → 夏（第 2 年夏，培育季）：同一場培育續練
            for (let i = 0; i < 3; i++) await session.advanceSeason();
            assert.equals(2, session.gameTime.currentSeason);
            assert.equals(GameTimeMode.Nurture, session.gameTime.currentMode);

            await session.save();
            const summerBefore = nurture.getSession('kid')!.vigor;
            const summer = nurture.train('kid', 'str');
            assert.equals(31, summerBefore - summer.session.vigor, '夏季訓練消耗 round(25×1.25)=31');

            // 回讀夏季存檔：精力回到訓練前，季節不變，再訓練一次仍扣 19
            assert.isTrue(await session.load());
            assert.equals(2, session.gameTime.currentSeason);
            assert.equals(summerBefore, nurture.getSession('kid')!.vigor, '回讀後精力回到存檔時的值');
            const again = nurture.train('kid', 'str');
            assert.equals(31, summerBefore - again.session.vigor, '回讀後夏季訓練仍扣 31');
        } finally {
            PlayerRosterService.replaceAll(original);
        }
    });

    return suite;
}
