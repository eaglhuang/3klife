/**
 * LongevityRules — 延壽次數、韶光符、歲寒禮包、不老傳說（doc_spec_0316；PROG-2-1942）
 */
import { assert, TestSuite } from './TestRunner';
import {
    advanceSeasonByTimeWarp, checkLongevityUse, effectiveLifespanSeasons, emptyLongevityRecord, endImmortalEvent,
    isVitalityDecayFrozen, recordLongevityUse, seasonEndCarePackage, tickImmortalGrace,
} from '../assets/scripts/core/systems/LongevityRules';

export function createLongevityRulesSuite(): TestSuite {
    const suite = new TestSuite('LongevityRules (延壽仙丹 doc_spec_0316 PROG-2-1942)');

    suite.test('TC-TIME-01 延壽丹每顆 +3 歲、滿 3 顆拒絕；九轉金丹 +5 歲限 1 顆；陣亡拒絕', () => {
        let rec = emptyLongevityRecord('g1');
        for (let i = 0; i < 3; i++) {
            const c = checkLongevityUse(rec, 'pill', false);
            assert.isTrue(c.ok);
            if (c.ok) rec = recordLongevityUse(rec, 'pill', c.years);
        }
        assert.equals(9, rec.totalYearsExtended);
        assert.isFalse(checkLongevityUse(rec, 'pill', false).ok);
        const nine = checkLongevityUse(rec, 'nineTurn', false);
        assert.isTrue(nine.ok && nine.years === 5);
        rec = recordLongevityUse(rec, 'nineTurn', 5);
        assert.equals(14, rec.totalYearsExtended);
        assert.isFalse(checkLongevityUse(rec, 'nineTurn', false).ok);
        const dead = checkLongevityUse(emptyLongevityRecord('g2'), 'pill', true);
        assert.isTrue(!dead.ok && dead.reason === 'dead');
    });

    suite.test('TC-TIME-02/03 韶光符推進 1 季並換年；第 4 季末發禮包與宗族歲賜', () => {
        assert.equals(3, advanceSeasonByTimeWarp({ year: 200, season: 2 }).season);
        const wrap = advanceSeasonByTimeWarp({ year: 200, season: 4 });
        assert.equals(201, wrap.year);
        assert.equals(1, wrap.season);
        assert.equals(null, seasonEndCarePackage(3, 5));
        const pkg = seasonEndCarePackage(4, 2)!;
        assert.equals(2, pkg.items.ITEM_ELIXIR);
        assert.equals(1, pkg.items.ITEM_ORACLE);
        assert.isTrue(pkg.ancestorBlessing);
        assert.isFalse(seasonEndCarePackage(4, 1)!.ancestorBlessing);
    });

    suite.test('TC-TIME-04 不老傳說 161 季鎖定、活力不衰、結束 2 季恩典', () => {
        const on = { isActive: true, blessedGeneralId: 'g1', gracePeriodRemainingSeasons: 0 };
        assert.equals(161, effectiveLifespanSeasons(on, 'g1', 120));
        assert.equals(120, effectiveLifespanSeasons(on, 'g2', 120));
        assert.isTrue(isVitalityDecayFrozen(on, 'g1'));
        assert.isFalse(isVitalityDecayFrozen(on, 'g2'));
        const over = endImmortalEvent(on, 130, 120);
        assert.isFalse(over.state.isActive);
        assert.equals(2, over.state.gracePeriodRemainingSeasons);
        assert.equals(10, over.retireShrineBonus);
        assert.equals(1, tickImmortalGrace(over.state).gracePeriodRemainingSeasons);
        const young = endImmortalEvent(on, 100, 120);
        assert.equals(0, young.state.gracePeriodRemainingSeasons);
        assert.equals(0, young.retireShrineBonus);
    });

    return suite;
}
