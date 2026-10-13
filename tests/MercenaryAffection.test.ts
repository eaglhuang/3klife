import { assert, TestSuite } from './TestRunner';
import { AFFECTION_CAP, AFFECTION_PER_DAY, applyDailyAffection } from '../assets/scripts/core/systems/MercenaryAffection';

export function createMercenaryAffectionSuite(): TestSuite {
    const suite = new TestSuite('MercenaryAffection (MERC-03 每日好感)');

    suite.test('每日好感 +10，上限 60', () => {
        assert.equals(10, AFFECTION_PER_DAY);
        assert.equals(60, AFFECTION_CAP);
        const result = applyDailyAffection(0);
        assert.equals(10, result.affection);
        assert.equals(10, result.gained);
        assert.isFalse(result.capped);
    });

    suite.test('六天累積剛好到上限 60，第六天 capped = true', () => {
        let value = 0;
        for (let day = 1; day <= 5; day++) {
            const result = applyDailyAffection(value);
            assert.isFalse(result.capped);
            value = result.affection;
        }
        assert.equals(50, value);
        const last = applyDailyAffection(value);
        assert.equals(60, last.affection);
        assert.equals(10, last.gained);
        assert.isTrue(last.capped);
    });

    suite.test('接近上限時只加到 60，gained 只計實際增加量', () => {
        const result = applyDailyAffection(55);
        assert.equals(60, result.affection);
        assert.equals(5, result.gained);
        assert.isTrue(result.capped);
    });

    suite.test('已達上限後不再增加，gained = 0', () => {
        const result = applyDailyAffection(60);
        assert.equals(60, result.affection);
        assert.equals(0, result.gained);
        assert.isTrue(result.capped);
    });

    suite.test('非法好感值拋出 RangeError', () => {
        assert.throws(() => applyDailyAffection(-1));
        assert.throws(() => applyDailyAffection(61));
        assert.throws(() => applyDailyAffection(NaN));
    });

    return suite;
}
