// @spec-source → 遊戲系統：結緣與送禮（好感 0~100，PROG-2-0562）
/**
 * GiftAffection — 送禮好感度與轉化機率加成 headless 測試（PROG-2-0562）
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyGiftAffection,
    conversionBonusOf,
    conversionChanceOf,
} from '../assets/scripts/core/systems/GiftAffection';

export function createGiftAffectionSuite(): TestSuite {
    const suite = new TestSuite('GiftAffection (送禮好感 FEM-08)');

    suite.test('好感夾在 0~100：送禮超過上限封頂 100，負向送禮不低於 0', () => {
        assert.equals(100, applyGiftAffection(90, 50));
        assert.equals(0, applyGiftAffection(10, -50));
        assert.equals(35, applyGiftAffection(20, 15));
    });

    suite.test('非有限數字的禮物視為 0 增量', () => {
        assert.equals(40, applyGiftAffection(40, Number.NaN));
        assert.equals(40, applyGiftAffection(40, Number.POSITIVE_INFINITY));
    });

    suite.test('轉化加成：好感 0 無加成，好感 100 為 +30%，線性', () => {
        assert.equals(0, conversionBonusOf(0));
        assert.isTrue(Math.abs(conversionBonusOf(50) - 0.15) < 1e-9);
        assert.isTrue(Math.abs(conversionBonusOf(100) - 0.3) < 1e-9);
    });

    suite.test('轉化機率封頂 1', () => {
        assert.isTrue(Math.abs(conversionChanceOf(0.5, 100) - 0.8) < 1e-9);
        assert.equals(1, conversionChanceOf(0.9, 100));
    });

    return suite;
}
