import { luckSalvageMultiplierOf, scaleSalvageGain } from '../assets/scripts/battle/shared/StageSalvage';
import { TestSuite, assert } from './TestRunner';

export function createLuckSalvageSuite(): TestSuite {
    const suite = new TestSuite('LuckSalvage (運勢掠奪加成 PROG-2-1606)');

    suite.test('每點運勢 +0.2%，100 封頂 +20%，缺值不加成', () => {
        assert.equals(1, luckSalvageMultiplierOf(undefined));
        assert.equals(1.1, luckSalvageMultiplierOf(50));
        assert.equals(1.2, luckSalvageMultiplierOf(100));
        assert.equals(1.2, luckSalvageMultiplierOf(150));
    });

    suite.test('掉落依倍率放大並捨去，倍率 1 原樣', () => {
        const gain = { supply: 300, weaponMaterial: 10, instructorExp: 20 };
        assert.isTrue(scaleSalvageGain(gain, 1) === gain);
        const scaled = scaleSalvageGain(gain, 1.15);
        assert.equals(345, scaled.supply ?? 0);
        assert.equals(11, scaled.weaponMaterial ?? 0);
        assert.equals(23, scaled.instructorExp ?? 0);
    });

    return suite;
}
