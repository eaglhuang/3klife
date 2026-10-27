/**
 * LuckTexts.test.ts — 運氣 UI 字串與劇本文案（LUK-08，PROG-2-1252）headless 測試
 *
 * 鎖住：隱藏提示沿用 LUK_REVEAL_LEVEL、天命列與波動列的模板、四段劇本台詞依規格、
 * 找不到 key 原樣回傳、語系表回傳 key 本身時退回預設、已有譯文時採用譯文。
 */
import { assert, TestSuite } from './TestRunner';
import {
    LUCK_TEXT_FALLBACK_ZH_TW,
    fallbackLuckText,
    lukEventText,
    lukHiddenText,
    lukLoreText,
    lukValueText,
    lukWaveText,
    withLuckFallback,
} from '../assets/scripts/ui/core/LuckTexts';
import { LUK_REVEAL_LEVEL } from '../assets/scripts/core/systems/LuckVisibility';

export function createLuckTextsSuite(): TestSuite {
    const suite = new TestSuite('LuckTexts (運氣 UI 字串與劇本 LUK-08 PROG-2-1252)');

    suite.test('隱藏提示使用 LUK_REVEAL_LEVEL，不洩漏數值', () => {
        assert.equals(`???（Lv${LUK_REVEAL_LEVEL} 解鎖）`, lukHiddenText());
        assert.equals('???（Lv46 解鎖）', lukHiddenText());
    });

    suite.test('天命列、天命波動與天命事件依模板代入', () => {
        assert.equals('天命（LUK）：72', lukValueText(72));
        assert.equals('天命波動：+12（EP 修正）', lukWaveText('+12'));
        assert.equals('天命之力觸發事件：星象異動', lukEventText('星象異動'));
    });

    suite.test('四段劇本台詞與規格一致', () => {
        assert.equals(
            '呂布 的命運之力覺醒——天命波動 +15！',
            lukLoreText('LORE_LUK_FATE_AWAKEN', ['呂布', '15']),
        );
        assert.equals('此子天命不凡，星象為之異動！', lukLoreText('LORE_LUK_HIGH_CHILD'));
        assert.equals('您已達到更高境界——紫色天命因子現身！', lukLoreText('LORE_LUK_PHASE3_UNLOCK'));
        assert.equals(
            '命運重新輪轉…趙雲 的天命波動已重置。',
            lukLoreText('LORE_LUK_FATE_RESET', ['趙雲']),
        );
    });

    suite.test('找不到的 key 原樣回傳，不丟錯', () => {
        assert.equals('UI_LUK_UNKNOWN', fallbackLuckText('UI_LUK_UNKNOWN'));
        assert.isTrue(LUCK_TEXT_FALLBACK_ZH_TW['UI_LUK_UNKNOWN'] === undefined);
    });

    suite.test('語系表回傳 key 本身時退回預設；已有譯文時採用譯文', () => {
        const unresolved = withLuckFallback((key) => key);
        assert.equals('天命之力觸發事件：星象異動', lukEventText('星象異動', unresolved));

        const localized = withLuckFallback((key) => (key === 'UI_LUK_DISPLAY' ? 'LUK: {0}' : key));
        assert.equals('LUK: {0}', localized('UI_LUK_DISPLAY', '72'));
    });

    return suite;
}
