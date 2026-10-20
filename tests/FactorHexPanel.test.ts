/**
 * FactorHexPanel.test.ts — 六色因子六角圖與解鎖特效資料（OPEN-08 / PROG-2-0717）headless 測試
 *
 * Unity 對照：像 EditMode 測試，驗 Presenter 的頂點數值、亮起判定與座標。
 */
import { assert, TestSuite } from './TestRunner';
import { buildFactorHexView, factorHexInputsFromGenes, hexVertexPoint, newlyLitFactorColors, FACTOR_COLOR_LABELS } from '../assets/scripts/core/systems/FactorHexPanel';

export function createFactorHexPanelSuite(): TestSuite {
    const suite = new TestSuite('FactorHexPanel (六色六角圖與解鎖特效 OPEN-08)');

    suite.test('六個頂點依藍粉綠紫白紅順序；未覺醒的色為 0 且不亮', () => {
        const view = buildFactorHexView([]);
        assert.equals(JSON.stringify(['blue', 'pink', 'green', 'purple', 'white', 'red']), JSON.stringify(view.map((v) => v.color)));
        assert.isTrue(view.every((v) => v.value === 0 && !v.lit));
        assert.equals('紫', FACTOR_COLOR_LABELS.purple);
    });

    suite.test('數值 = 已覺醒數 ÷ 5，夾在 0..1；未覺醒的因子不計入', () => {
        const factors = [
            { color: 'red' as const, awakened: true },
            { color: 'red' as const, awakened: true },
            { color: 'red' as const, awakened: false },
            ...Array.from({ length: 7 }, () => ({ color: 'blue' as const, awakened: true })),
        ];
        const view = buildFactorHexView(factors);
        const red = view.find((v) => v.color === 'red')!;
        const blue = view.find((v) => v.color === 'blue')!;
        assert.equals(0.4, red.value);
        assert.isTrue(red.lit);
        assert.equals(1, blue.value);
    });

    suite.test('解鎖特效：只回報前後比較中新亮起的色，已亮的不重播', () => {
        const before = [{ color: 'blue' as const, awakened: true }];
        const after = [
            { color: 'blue' as const, awakened: true },
            { color: 'green' as const, awakened: true },
            { color: 'green' as const, awakened: true },
            { color: 'white' as const, awakened: false },
        ];
        assert.equals(JSON.stringify(['green']), JSON.stringify(newlyLitFactorColors(before, after)));
        assert.equals(0, newlyLitFactorColors(after, after).length);
    });

    suite.test('頂點座標：第 0 個在正上方，半徑按數值縮放，數值 0 在中心', () => {
        const top = hexVertexPoint(0, 1, 100);
        assert.equals(0, top.x);
        assert.equals(-100, top.y);
        const center = hexVertexPoint(3, 0, 100);
        assert.equals(0, center.x);
        assert.equals(0, center.y);
    });

    suite.test('基因轉輸入：isLocked === false 才算覺醒；判不出色系的基因略過', () => {
        const inputs = factorHexInputsFromGenes([
            { id: 'f1', type: 'red', isLocked: false },
            { id: 'f2', type: 'blue', isLocked: true },
            { id: 'f3', type: 'NOT_A_COLOR' },
        ]);
        assert.equals(2, inputs.length);
        assert.equals('red', inputs[0].color);
        assert.isTrue(inputs[0].awakened);
        assert.equals('blue', inputs[1].color);
        assert.isFalse(inputs[1].awakened);
    });

    return suite;
}
