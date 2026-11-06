/**
 * ResultPopupTone.test.ts — 結算面板勝敗外觀（主戰場UI規格書 §4.2，PROG-2-1877）
 *
 * Unity 對照：EditMode 測試結算樣式表查詢。
 */
import { resultPopupTone } from '../assets/scripts/shared/ResultPopupTone';
import { TestSuite, assert } from './TestRunner';

export function createResultPopupToneSuite(): TestSuite {
    const suite = new TestSuite('ResultPopupTone (結算勝敗外觀 PROG-2-1877)');

    suite.test('勝利：深朱紅標題、彈跳、不轉灰', () => {
        const t = resultPopupTone('victory');
        assert.equals(true, t.celebrate);
        assert.equals(false, t.grayscale);
        assert.equals(176, t.titleColor[0]);
    });

    suite.test('失敗：灰階、灰色標題、不彈跳', () => {
        const t = resultPopupTone('defeat');
        assert.equals(true, t.grayscale);
        assert.equals(false, t.celebrate);
        assert.equals(t.titleColor[0], t.titleColor[2]);
    });

    suite.test('平手與未知值：一般外觀', () => {
        assert.equals(false, resultPopupTone('stalemate').grayscale);
        assert.equals(false, resultPopupTone('unknown' as never).celebrate);
    });

    return suite;
}
