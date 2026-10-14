/**
 * TigerTallySetBonus — 虎符陣容 Set 羈絆判定與攻防加成（TRP-14，PROG-2-0570）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { getActiveTallySets, tallySetMultipliers } from '../assets/scripts/core/systems/TigerTallySetBonus';

const FIVE_TIGERS = ['TROOP_CHANGSHAN_DRAGON', 'TROOP_LOYAL_IRON_GUARD', 'TROOP_THUNDER_SQUAD', 'TROOP_GOD_SNIPER', 'TROOP_DIVINE_CAVALRY'];
const JIANGDONG = ['TROOP_WU_NAVY', 'TROOP_BROCADE_RAIDERS', 'TROOP_FEARLESS_GUARD', 'TROOP_JIANGDONG_GUARD'];

function round(value: number): number {
    return Number(value.toFixed(4));
}

export function createTigerTallySetBonusSuite(): TestSuite {
    const suite = new TestSuite('TigerTallySetBonus (虎符 Set 羈絆 TRP-14)');

    suite.test('五虎將 3 個成員在場觸發，2 個不觸發', () => {
        assert.equals('五虎將', getActiveTallySets(FIVE_TIGERS.slice(0, 3))[0].name);
        assert.equals(0, getActiveTallySets(FIVE_TIGERS.slice(0, 2)).length);
    });

    suite.test('江東十二虎臣與曹魏五謀門檻與加成正確', () => {
        const jiangdong = tallySetMultipliers(JIANGDONG.slice(0, 3));
        assert.equals(1.1, round(jiangdong.atkMod));
        assert.equals(1.05, round(jiangdong.defMod));
        const advisors = tallySetMultipliers(['TROOP_GHOST_STRATEGISTS', 'TROOP_SHADOW_GUARD', 'TROOP_SWIFT_CAVALRY']);
        assert.equals(1.08, round(advisors.atkMod));
        assert.equals(1.08, round(advisors.defMod));
    });

    suite.test('同一 Set 重複出現的成員只計一次，不疊加', () => {
        const dupes = [FIVE_TIGERS[0], FIVE_TIGERS[0], FIVE_TIGERS[0], FIVE_TIGERS[0]];
        assert.equals(0, getActiveTallySets(dupes).length);
        const mult = tallySetMultipliers(dupes.concat(FIVE_TIGERS[1]));
        assert.equals(1, round(mult.atkMod));
    });

    suite.test('兩個不同 Set 同時成立時攻防加成加法疊加（PM 裁定，不相乘）', () => {
        const mult = tallySetMultipliers([...FIVE_TIGERS.slice(0, 3), ...JIANGDONG.slice(0, 3)]);
        // 攻：1 + 0.10（五虎將）+ 0.10（江東）= 1.20；防：1 + 0.10 + 0.05 = 1.15
        assert.equals(1.2, round(mult.atkMod));
        assert.equals(1.15, round(mult.defMod));
    });

    suite.test('沒有任何 Set 成立時倍率為 1', () => {
        const mult = tallySetMultipliers([]);
        assert.equals(1, mult.atkMod);
        assert.equals(1, mult.defMod);
    });

    return suite;
}
