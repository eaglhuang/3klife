/**
 * SurnameAffiliation — 姓氏零和、人頭分權重、家傳絕學弱化（SPI-09；PROG-2-1929）
 */
import { assert, TestSuite } from './TestRunner';
import {
    chooseChildSurname, clanScoreTargets, headScoreOf, inheritedTechniqueMultiplier,
} from '../assets/scripts/core/systems/SurnameAffiliation';

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createSurnameAffiliationSuite(): TestSuite {
    const suite = new TestSuite('SurnameAffiliation (姓氏零和 SPI-09 PROG-2-1929)');

    suite.test('擇一姓後鎖定，積分只計入一姓；缺姓拒絕', () => {
        const first = chooseChildSurname(null, 'mother', 'ZHAO', 'MA');
        assert.isTrue(first.ok);
        if (!first.ok) return;
        assert.equals('MA', first.choice.clanKey);
        assert.equals('MA', clanScoreTargets(first.choice).join(','));
        const again = chooseChildSurname(first.choice, 'father', 'ZHAO', 'MA');
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('ALREADY_CHOSEN', again.reason);
        const missing = chooseChildSurname(null, 'father', null, 'MA');
        if (!missing.ok) assert.equals('MISSING_CLAN', missing.reason);
        assert.equals(0, clanScoreTargets(null).length);
    });

    suite.test('人頭分權重 100/80/120%；非本姓絕學弱化', () => {
        near(3.0, headScoreOf(['NATIVE', 'CONVERTED_CAPTIVE', 'MATERNAL_SURNAME']));
        near(0.8, headScoreOf(['CONVERTED_CAPTIVE']));
        assert.equals(1, inheritedTechniqueMultiplier('ZHAO', 'ZHAO', 0.5));
        assert.equals(0.5, inheritedTechniqueMultiplier('MA', 'ZHAO', 0.5));
        assert.equals(1, inheritedTechniqueMultiplier(null, 'ZHAO', 3));
        assert.equals(0, inheritedTechniqueMultiplier(null, 'ZHAO', Number.NaN));
    });

    return suite;
}
