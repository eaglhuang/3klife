/**
 * SameNameTexts.test.ts — 同名武將劇本與字串（SAME-10，PROG-2-1144）headless 測試
 *
 * 鎖住：四段劇本台詞依規格示例、模板參數依序代入、字串 key 的預設值、
 * 找不到 key 原樣回傳、語系表回傳 key 本身時退回預設、已有譯文時採用譯文。
 */
import { assert, TestSuite } from './TestRunner';
import {
    SAME_NAME_TEXT_FALLBACK_ZH_TW,
    fallbackSameNameText,
    sameNameLoreText,
    withSameNameFallback,
} from '../assets/scripts/ui/core/SameNameTexts';

export function createSameNameTextsSuite(): TestSuite {
    const suite = new TestSuite('SameNameTexts (同名劇本與字串 SAME-10 PROG-2-1144)');

    suite.test('四段劇本台詞都有預設，且與規格示例一致', () => {
        assert.equals(
            '此趙雲與你所熟識的那位…似乎有些不同。',
            sameNameLoreText('LORE_SAME_FIRST_MEET'),
        );
        assert.equals(
            '呂布 的戰魂融入 趙雲——兩世為一！',
            sameNameLoreText('LORE_SAME_SOUL_MERGE', ['呂布', '趙雲']),
        );
        assert.equals(
            '血脈歸一，趙雲 繼承了 呂布 的 武勇！',
            sameNameLoreText('LORE_SAME_BLOODLINE_MERGE', ['趙雲', '呂布', '武勇']),
        );
        assert.equals(
            '陣中已有趙雲，不可再添同名之將！',
            sameNameLoreText('LORE_SAME_NAME_CONFLICT', ['趙雲']),
        );
    });

    suite.test('字串模板依序代入參數', () => {
        assert.equals('趙雲・長坂之戰', fallbackSameNameText('UI_VERSION_TAG', '趙雲', '長坂之戰'));
        assert.equals('趙雲 收集進度：2/5 版本', fallbackSameNameText('UI_COLLECTION', '趙雲', '2', '5'));
        assert.equals('血脈歸宗完成！勇 已轉移。', fallbackSameNameText('UI_BLOODLINE_MERGE', '勇'));
        assert.equals('隊伍中已有同名武將（BLD-01），無法編入！', fallbackSameNameText('UI_SAME_NAME_REJECT', 'BLD-01'));
    });

    suite.test('無參數按鈕字與抽卡選擇文字使用規格預設', () => {
        assert.equals('復生重練', fallbackSameNameText('UI_REVIVE_RETRAIN'));
        assert.equals('血脈灌注', fallbackSameNameText('UI_BLOODLINE_INFUSION'));
        assert.equals(
            '再遇故人。要讓他復生，還是讓英靈更完整？',
            fallbackSameNameText('UI_DUPLICATE_CHOICE'),
        );
    });

    suite.test('找不到的 key 原樣回傳，不丟錯', () => {
        assert.equals('UI_UNKNOWN', fallbackSameNameText('UI_UNKNOWN'));
        assert.isTrue(SAME_NAME_TEXT_FALLBACK_ZH_TW['UI_UNKNOWN'] === undefined);
    });

    suite.test('語系表回傳 key 本身時退回預設；已有譯文時採用譯文', () => {
        const unresolved = withSameNameFallback((key) => key);
        assert.equals('復生重練', unresolved('UI_REVIVE_RETRAIN'));

        const localized = withSameNameFallback((key) => (key === 'UI_REVIVE_RETRAIN' ? 'Revive' : key));
        assert.equals('Revive', localized('UI_REVIVE_RETRAIN'));
        assert.equals('Revive', sameNameLoreText('UI_REVIVE_RETRAIN', [], localized));
    });

    return suite;
}
