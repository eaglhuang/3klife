/**
 * MercenaryIllustration.test.ts — 傭兵插畫五階段（MERC-08 / PROG-2-0968）
 *
 * 鎖住：好感度分段（含規格範例 Bond 30 → 階段 3）、邊界與異常值、插畫階段只進不退。
 *
 * Unity 對照：Animator 狀態機的 EditMode 測試，只驗階段切換條件。
 */
import { assert, TestSuite } from './TestRunner';
import {
    advanceIllustrationStage,
    illustrationStageOf,
    ILLUSTRATION_BOND_MAX,
} from '../assets/scripts/core/systems/MercenaryIllustration';

export function createMercenaryIllustrationSuite(): TestSuite {
    const suite = new TestSuite('MercenaryIllustration (傭兵插畫 MERC-08)');

    suite.test('規格範例：好感度 30 → 插畫階段 3', () => {
        assert.equals(3, illustrationStageOf(30));
    });

    suite.test('分段邊界：0、11、12、59、60 分別落在 1、1、2、5、5', () => {
        assert.equals(1, illustrationStageOf(0));
        assert.equals(1, illustrationStageOf(11));
        assert.equals(2, illustrationStageOf(12));
        assert.equals(5, illustrationStageOf(59));
        assert.equals(5, illustrationStageOf(ILLUSTRATION_BOND_MAX));
    });

    suite.test('異常值：負數與非有限視為階段 1，超過滿值視為階段 5', () => {
        assert.equals(1, illustrationStageOf(-5));
        assert.equals(1, illustrationStageOf(Number.NaN));
        assert.equals(5, illustrationStageOf(999));
    });

    suite.test('插畫階段只進不退：好感度下降時保留較大的已解鎖階段', () => {
        assert.equals(4, advanceIllustrationStage(4, 10));
        assert.equals(3, advanceIllustrationStage(1, 30));
        assert.equals(1, advanceIllustrationStage(Number.NaN, 0));
    });

    return suite;
}
