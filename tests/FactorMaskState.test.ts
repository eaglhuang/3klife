import { assert, TestSuite } from './TestRunner';
import { buildFactorMaskView } from '../assets/scripts/core/systems/FactorMaskState';
import { factorMaskView } from '../assets/scripts/core/systems/FactorMask';

export function createFactorMaskStateSuite(): TestSuite {
    const suite = new TestSuite('FactorMaskState');
    suite.test('鎖定文字與覆寫門檻委派既有模組', () => {
        const gene = { id: 'green', type: 'green', discoveryLevel: 8 };
        assert.equals('??? (Lv9 解鎖)', buildFactorMaskView(gene, 8).label);
        assert.isTrue(buildFactorMaskView(gene, 8).locked);
        assert.equals('green', buildFactorMaskView(gene, 9).label);
    });
    suite.test('首次解鎖亮一次；重讀不亮且不修改輸入', () => {
        const gene = Object.freeze({ id: 'purple', type: 'purple', displayName: '天命', isLocked: true });
        const previous = Object.freeze(buildFactorMaskView(gene, 45));
        const current = buildFactorMaskView(gene, 46, previous);
        assert.equals('天命', current.label);
        assert.isFalse(current.locked);
        assert.isTrue(current.playAnimation);
        assert.isFalse(buildFactorMaskView(gene, 46, current).playAnimation);
        assert.isFalse(buildFactorMaskView(gene, 46).playAnimation);
        assert.isTrue(previous.locked);
        assert.isTrue(gene.isLocked);
    });
    suite.test('未知色系、負等級與缺名稱完整沿用既有語意', () => {
        for (const type of ['unknown', undefined, 'blue']) {
            for (const level of [-1, 0, 1, 20]) {
                const gene = { id: 'fallback', type };
                const expected = factorMaskView(gene, level);
                const actual = buildFactorMaskView(gene, level);
                assert.equals(expected.label, actual.label);
                assert.equals(!expected.revealed, actual.locked);
                assert.isFalse(actual.playAnimation);
            }
        }
    });
    suite.test('持續鎖定與降級不亮；再次解鎖是新轉換', () => {
        const gene = { id: 'white', type: 'white' };
        const visible = buildFactorMaskView(gene, 21);
        const locked = buildFactorMaskView(gene, 20, visible);
        assert.isFalse(locked.playAnimation);
        assert.isFalse(buildFactorMaskView(gene, 20, locked).playAnimation);
        assert.isTrue(buildFactorMaskView(gene, 21, locked).playAnimation);
    });
    return suite;
}
