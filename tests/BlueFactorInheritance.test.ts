/**
 * BlueFactorInheritance.test.ts — 藍色 3 星因子繼承機率（FORM-08，PROG-2-1275）headless 測試
 *
 * 鎖住：< 600 為 0；600 與 1099 為 6%；1100 為 10%（邊界歸較高段）；非有限值為 0。
 */
import { assert, TestSuite } from './TestRunner';
import { blueFactorInheritChance } from '../assets/scripts/core/systems/BlueFactorInheritance';
import { inheritFactors, type AncestorFactorSource } from '../assets/scripts/core/systems/FactorInheritance';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

function sequence(values: number[]): () => number {
    const queue = [...values];
    return () => (queue.length > 0 ? queue.shift()! : 0.99);
}

function gen2Source(factorId: string, type: string): AncestorFactorSource {
    return { uid: 'anc-2', generation: 2, factorIds: [factorId], genes: [{ id: factorId, type, displayName: factorId, isLocked: false } as never] };
}

function gen1Source(factorId: string, type: string): AncestorFactorSource {
    return { ...gen2Source(factorId, type), uid: 'anc-1', generation: 1 };
}

export function createBlueFactorInheritanceSuite(): TestSuite {
    const suite = new TestSuite('BlueFactorInheritance (藍色因子繼承機率 FORM-08 PROG-2-1275)');

    suite.test('數值低於 600 時機率為 0', () => {
        assert.isTrue(near(blueFactorInheritChance(599), 0));
        assert.isTrue(near(blueFactorInheritChance(0), 0));
    });

    suite.test('600 與 1099 的機率為 6%（600 歸中段）', () => {
        assert.isTrue(near(blueFactorInheritChance(600), 0.06));
        assert.isTrue(near(blueFactorInheritChance(1099), 0.06));
    });

    suite.test('1100 以上的機率為 10%（1100 歸高段）', () => {
        assert.isTrue(near(blueFactorInheritChance(1100), 0.1));
        assert.isTrue(near(blueFactorInheritChance(2000), 0.1));
    });

    suite.test('非有限值視為 0', () => {
        assert.isTrue(near(blueFactorInheritChance(Number.NaN), 0));
        assert.isTrue(near(blueFactorInheritChance(Number.POSITIVE_INFINITY), 0));
    });

    suite.test('藍色 3 星：未啟用（缺省）時星等照舊，不多擲亂數', () => {
        const result = inheritFactors([gen2Source('f_blue', 'blue')], { random: sequence([0.1, 0.9]) });
        assert.equals(2, result[0].level);
    });

    suite.test('藍色 3 星：機率擲中時至少升到 3 星', () => {
        const result = inheritFactors([gen2Source('f_blue', 'blue')], { random: sequence([0.1, 0.9, 0]), blueFactorChance: 1 });
        assert.equals(3, result[0].level);
    });

    suite.test('藍色 3 星：機率沒擲中時星等不變', () => {
        const result = inheritFactors([gen2Source('f_blue', 'blue')], { random: sequence([0.1, 0.9, 0.99]), blueFactorChance: 0.1 });
        assert.equals(2, result[0].level);
    });

    suite.test('藍色 3 星：只抬升不降星，非藍色因子不受影響', () => {
        const red = inheritFactors([gen2Source('f_red', 'red')], { random: sequence([0.1, 0.9, 0]), blueFactorChance: 1 });
        assert.equals(2, red[0].level);
        const highBlue = inheritFactors([gen1Source('f_blue', 'blue')], { random: sequence([0.1, 0.1, 0]), blueFactorChance: 1 });
        assert.equals(4, highBlue[0].level);
    });

    return suite;
}
