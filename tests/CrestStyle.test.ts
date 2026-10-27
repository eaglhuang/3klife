/**
 * CrestStyle.test.ts — 祖紋命篆視覺樣式解析（BUI-08 / PROG-2-1211）headless 測試
 *
 * 鎖住：六色各自對應色碼、徽記 key 與紋樣 id；null、undefined、未知字串一律退回中性樣式；
 * 傳入自訂色碼表時以該表為準。
 *
 * Unity 對照：Editor 測試確認樣式表每一列都有對應的 Material 與 Sprite，缺列時走預設值。
 */
import { assert, TestSuite } from './TestRunner';
import { CREST_NEUTRAL_GLYPH_ID, CREST_NEUTRAL_TINT, resolveCrestStyle } from '../assets/scripts/core/systems/CrestStyle';
import { FACTOR_TAG_COLORS, FACTOR_TAG_I18N_KEYS } from '../assets/scripts/core/systems/FactorTagTokens';
import type { FactorColor } from '../assets/scripts/core/systems/FactorInheritance';

export function createCrestStyleSuite(): TestSuite {
    const suite = new TestSuite('CrestStyle (祖紋命篆樣式 BUI-08)');

    suite.test('六色各自取得與標籤相同的色碼、徽記 key 與紋樣 id', () => {
        const colors: FactorColor[] = ['blue', 'pink', 'green', 'purple', 'white', 'red'];
        for (const color of colors) {
            const style = resolveCrestStyle(color);
            assert.isFalse(style.neutral);
            assert.equals(FACTOR_TAG_COLORS[color], style.tint, color);
            assert.equals(FACTOR_TAG_I18N_KEYS[color], style.badgeKey, color);
            assert.equals(`crest_${color}`, style.glyphId, color);
        }
    });

    suite.test('六色的色調彼此不同，避免連線顏色混在一起', () => {
        const tints = (['blue', 'pink', 'green', 'purple', 'white', 'red'] as FactorColor[]).map((c) => resolveCrestStyle(c).tint);
        assert.equals(6, new Set(tints).size);
    });

    suite.test('null、undefined 與未知字串退回中性樣式', () => {
        const samples: Array<FactorColor | null | undefined> = [null, undefined];
        for (const sample of samples) {
            const style = resolveCrestStyle(sample);
            assert.isTrue(style.neutral);
            assert.equals(CREST_NEUTRAL_TINT, style.tint);
            assert.isTrue(style.badgeKey === null);
            assert.equals(CREST_NEUTRAL_GLYPH_ID, style.glyphId);
        }
        const unknown = resolveCrestStyle('gold' as unknown as FactorColor);
        assert.isTrue(unknown.neutral);
        assert.equals(CREST_NEUTRAL_TINT, unknown.tint);
    });

    suite.test('傳入自訂色碼表時以該表為準', () => {
        const custom = { ...FACTOR_TAG_COLORS, red: '#123456' };
        assert.equals('#123456', resolveCrestStyle('red', custom).tint);
        assert.equals(FACTOR_TAG_COLORS.blue, resolveCrestStyle('blue', custom).tint);
    });

    return suite;
}
