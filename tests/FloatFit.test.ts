/**
 * FloatFit.test.ts — 戰場飄字打磨（PROG-2-10045）
 *
 * 1. 長字縮放：短字原樣、長句縮到不超過寬度上限、不低於字級下限、不放大。
 * 2. 格子錨點：同格連發的地形／buff 字會被錯開，不同格互不影響。
 * 3. 接線：UnitRenderer 的 buff／毒飄字帶格子錨點；FloatTextSystem 套用縮放；自動代打時不跳部署橫幅。
 *
 * Unity 對照：EditMode 測試 DamagePopup 的字級自適應與生成位置錯開。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    FLOAT_MAX_WIDTH, FLOAT_MIN_FONT_SIZE, FLOAT_TEXT_STYLES, FloatStaggerTracker, cellFloatAnchor, floatFitFontSize, floatHalfWidth,
} from '../assets/scripts/core/systems/FloatTextStyle';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createFloatFitSuite(): TestSuite {
    const suite = new TestSuite('FloatFit (戰場飄字打磨 PROG-2-10045)');

    suite.test('短字與傷害數字不縮', () => {
        assert.equals(FLOAT_TEXT_STYLES.dmg_player.fontSize, floatFitFontSize('-76', FLOAT_TEXT_STYLES.dmg_player.fontSize));
        assert.equals(42, floatFitFontSize('水域攻擊', 42));
    });

    suite.test('長句縮到寬度上限內，且不低於字級下限', () => {
        const text = '攻擊 +40 生命 -96';
        const size = floatFitFontSize(text, 42);
        assert.isTrue(size < 42, '長句要縮小');
        assert.isTrue(size >= FLOAT_MIN_FONT_SIZE, '不低於下限');
        assert.isTrue(floatHalfWidth(text, { fontSize: size }) * 2 <= FLOAT_MAX_WIDTH + 1, '縮完不超過寬度上限');
    });

    suite.test('超長字只縮到下限；字級本來就小於下限時不放大', () => {
        assert.equals(FLOAT_MIN_FONT_SIZE, floatFitFontSize('這是一段非常非常長的狀態提示文字內容', 42));
        assert.equals(20, floatFitFontSize('這是一段非常非常長的狀態提示文字內容', 20));
    });

    suite.test('格子錨點：同格連發錯開、不同格不互相影響', () => {
        const t = new FloatStaggerTracker();
        const a = cellFloatAnchor(2, 5);
        const first = t.place(a, 1000, 1500, 60);
        const second = t.place(a, 1050, 1500, 60);
        assert.equals(0, first.index);
        assert.isTrue(second.index > 0 && second.y < 0, '同格第二個字要往下錯開');
        assert.equals(0, t.place(cellFloatAnchor(2, 6), 1060, 1500, 60).index);
    });

    suite.test('接線：buff／毒飄字帶錨點、FloatTextSystem 套縮放、自動代打不跳部署橫幅', () => {
        const unit = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isTrue(/spawnFloatText\(text, floatType, worldPos, cellFloatAnchor\(lane, depth\)\)/.test(unit), 'playBuffConsumeValue 要帶錨點');
        assert.isTrue(/spawnFloatText\(text, 'poison', worldPos, cellFloatAnchor\(lane, depth\)\)/.test(unit), 'playPoisonFloat 要帶錨點');
        assert.isTrue(/floatFitFontSize\(text, config\.fontSize\)/.test(read('assets/scripts/core/systems/FloatTextSystem.ts')), '要套用長字縮放');
        assert.isTrue(/if \(!this\.autoPlay\.active\) c\.deployRuntime\?\.showToast\(`我方已部署/.test(read('assets/scripts/battle/views/BattleUIBridge.ts')), '自動代打時不跳部署橫幅');
    });

    return suite;
}
