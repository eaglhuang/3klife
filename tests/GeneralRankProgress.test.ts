/**
 * GeneralRankProgress — 武將名聲與將階晉升（官職系統覆寫裁定，PROG-2-1898）
 *
 * Unity 對照：EditMode Test 直接驗證等級表與 AddExp。
 */
import { assert, TestSuite } from './TestRunner';
import {
    battleFameGain,
    gainGeneralFame,
    generalRankForFame,
    generalRankTitle,
    GENERAL_RANK_FAME_THRESHOLDS,
    hallMissionFameGain,
    nextGeneralRankFame,
} from '../assets/scripts/core/systems/GeneralRankProgress';
import { COMMAND_CAPACITY_RANK_BASE } from '../assets/scripts/core/systems/SortieDeploy';

export function createGeneralRankProgressSuite(): TestSuite {
    const suite = new TestSuite('GeneralRankProgress (名聲→將階 PROG-2-1898)');

    suite.test('門檻與帶兵基礎值同樣是 6 階', () => {
        assert.equals(COMMAND_CAPACITY_RANK_BASE.length, GENERAL_RANK_FAME_THRESHOLDS.length);
        assert.equals('0,100,300,600,1000,1500', GENERAL_RANK_FAME_THRESHOLDS.join(','));
    });

    suite.test('名聲對應將階：剛好達門檻就升', () => {
        assert.equals(0, generalRankForFame(99));
        assert.equals(1, generalRankForFame(100));
        assert.equals(3, generalRankForFame(999));
        assert.equals(5, generalRankForFame(99999));
        assert.equals(0, generalRankForFame(NaN));
    });

    suite.test('入帳後一次跨多階會列出每一階', () => {
        const result = gainGeneralFame({ id: 'a', generalFame: 90, generalRank: 0 }, 220);
        assert.equals(310, result.general.generalFame);
        assert.equals(2, result.general.generalRank);
        assert.equals('1,2', result.promotedRanks.join(','));
    });

    suite.test('將階只升不降；缺欄位視為 0；gain 0 原樣回傳', () => {
        assert.equals(4, gainGeneralFame({ generalFame: 10, generalRank: 4 }, 5).general.generalRank);
        assert.equals(15, gainGeneralFame({} as { generalFame?: number }, 15).general.generalFame);
        const same = { generalFame: 5 };
        assert.equals(true, gainGeneralFame(same, 0).general === same);
    });

    suite.test('出征勝 15、敗 5、平手 0', () => {
        assert.equals(15, battleFameGain('player-win'));
        assert.equals(5, battleFameGain('enemy-win'));
        assert.equals(0, battleFameGain('draw'));
    });

    suite.test('軍事任務：完成才給，高難／地獄 25、其餘 10', () => {
        assert.equals(10, hallMissionFameGain({ difficulty: 'NORMAL', success: true }));
        assert.equals(25, hallMissionFameGain({ difficulty: 'HELL', success: true }));
        assert.equals(0, hallMissionFameGain({ difficulty: 'HELL', success: false }));
    });

    suite.test('稱號與下一階門檻', () => {
        assert.equals('偏將軍', generalRankTitle(2));
        assert.equals(600, nextGeneralRankFame(2));
        assert.equals(null, nextGeneralRankFame(5));
    });

    return suite;
}
