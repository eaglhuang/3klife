/**
 * UltimateDamage — 奧義傷害公式與 base_power 查表（PROG-2-0925，NUM-09）
 *
 * 規格：ult_damage = base_power × (1 + ult_level × 0.15) × stat_modifier；
 * base_power：奧義 1~5 = 200、300、400、500、700。stat_modifier 由呼叫端傳入（規格未定）。
 */
import { ultBasePowerOf, ultDamage } from '../assets/scripts/core/systems/UltimateDamage';
import { TestSuite, assert } from './TestRunner';

const SPEC_BASE_POWER: Readonly<Record<string, number>> = { '1': 200, '2': 300, '3': 400, '4': 500, '5': 700 };

function nearly(expected: number, actual: number, message: string): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `${message}：預期 ${expected}，實際 ${actual}`);
}

export function createUltimateDamageSuite(): TestSuite {
    const suite = new TestSuite('UltimateDamage (奧義傷害公式 NUM-09)');

    suite.test('base_power 查表：奧義 1~5 與規格一致', () => {
        for (const level of [1, 2, 3, 4, 5]) {
            assert.equals(SPEC_BASE_POWER[String(level)], ultBasePowerOf(level, SPEC_BASE_POWER), `奧義 ${level}`);
        }
    });

    suite.test('base_power 查表：超界、非整數或表內缺值回 null', () => {
        assert.equals(null, ultBasePowerOf(0, SPEC_BASE_POWER));
        assert.equals(null, ultBasePowerOf(6, SPEC_BASE_POWER));
        assert.equals(null, ultBasePowerOf(1.5, SPEC_BASE_POWER));
        assert.equals(null, ultBasePowerOf(3, {}));
    });

    suite.test('奧義傷害：base × (1 + lv × 0.15) × stat_modifier', () => {
        nearly(230, ultDamage(200, 1, 1), '奧義 1 基礎');
        nearly(585, ultDamage(300, 2, 1.5), '奧義 2 含主屬性係數');
        nearly(1225, ultDamage(700, 5, 1), '奧義 5 究極');
    });

    suite.test('奧義傷害：等級越高、同基礎下傷害不降（每級 +15%）', () => {
        const base = 400;
        for (let level = 2; level <= 5; level += 1) {
            assert.isTrue(ultDamage(base, level, 1) > ultDamage(base, level - 1, 1), `等級 ${level} 應高於 ${level - 1}`);
        }
    });

    suite.test('奧義傷害：無效輸入回 0，不猜測', () => {
        assert.equals(0, ultDamage(Number.NaN, 1, 1));
        assert.equals(0, ultDamage(200, 0, 1));
        assert.equals(0, ultDamage(200, 6, 1));
        assert.equals(0, ultDamage(200, 1, -0.5));
        assert.equals(0, ultDamage(200, 1, Number.POSITIVE_INFINITY));
    });

    return suite;
}
