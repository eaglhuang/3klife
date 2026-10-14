/**
 * TigerTallyStar — 虎符 1~3★ 戰鬥經驗升星（TRP-10，PROG-2-0568）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyBattleExp,
    battleExpGain,
    starStatMultiplier,
    type TallyStarState,
} from '../assets/scripts/core/systems/TigerTallyStar';

function tally(over: Partial<TallyStarState> = {}): TallyStarState {
    return { quality: 'SSR', star: 1, exp: 0, ...over };
}

export function createTigerTallyStarSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyStar (虎符 1~3★ 戰鬥經驗 TRP-10)');

    suite.test('星級倍率 1★~5★ 為 1.08~1.40', () => {
        assert.equals(1.08, Number(starStatMultiplier(1).toFixed(2)));
        assert.equals(1.4, Number(starStatMultiplier(5).toFixed(2)));
    });

    suite.test('戰鬥經驗：勝 +15、敗 +8、平 +10', () => {
        assert.equals(15, battleExpGain('win'));
        assert.equals(8, battleExpGain('lose'));
        assert.equals(10, battleExpGain('draw'));
    });

    suite.test('累積 100 經驗升 2★，350 經驗升 3★', () => {
        const at2 = applyBattleExp(tally({ exp: 90 }), 'win');
        assert.equals(2, at2.star);
        assert.equals(105, at2.exp);
        const at3 = applyBattleExp(tally({ star: 2, exp: 340 }), 'win');
        assert.equals(3, at3.star);
    });

    suite.test('SSR 戰鬥經驗最多升到 3★，不因品質上限 5★ 而自動升到 4★', () => {
        const capped = applyBattleExp(tally({ star: 3, exp: 5000 }), 'win');
        assert.equals(3, capped.star);
    });

    suite.test('R 虎符最多 3★', () => {
        const r = applyBattleExp(tally({ quality: 'R', star: 1, exp: 9000 }), 'win');
        assert.equals(3, r.star);
    });

    suite.test('經驗一次跨過多個門檻時直接升到能到達的最高星', () => {
        const jump = applyBattleExp(tally({ star: 1, exp: 340 }), 'win');
        assert.equals(3, jump.star);
        assert.equals(355, jump.exp);
    });

    return suite;
}
