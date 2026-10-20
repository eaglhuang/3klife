/**
 * VitalityScriptTexts.test.ts — 精力劇本文案查詢（PROG-2-0729）headless 測試
 *
 * 鎖住：語系表未載入時退回預設並代入武將名；語系表查不到時退回預設；語系表有值時採用語系表。
 * 與 zh-TW 語系表的逐字比對屬於 PROG-2-0728（ui.vit.script.*），等它合併後再加。
 */
import { assert, TestSuite } from './TestRunner';
import {
    VITALITY_SCRIPT_KEYS,
    fallbackVitalityScriptText,
    vitalityScriptText,
} from '../assets/scripts/ui/core/VitalityScriptTexts';
export function createVitalityScriptTextsSuite(): TestSuite {
    const suite = new TestSuite('VitalityScriptTexts (精力劇本文案查詢 PROG-2-0729)');

    suite.test('未注入語系表時代入武將名', () => {
        assert.equals('張飛 已精疲力竭，暫無法行動。', fallbackVitalityScriptText(VITALITY_SCRIPT_KEYS.exhausted, '張飛'));
        assert.equals('呂布 服下補元散，精力恢復！', fallbackVitalityScriptText(VITALITY_SCRIPT_KEYS.pillUsed, '呂布'));
    });

    suite.test('語系表查不到 key（回傳 key 本身）時退回 zh-TW 預設', () => {
        const missingLookup = (key: string) => key;
        assert.equals(
            '關羽 正在待產中，精力回復暫停…',
            vitalityScriptText(missingLookup, VITALITY_SCRIPT_KEYS.pregnancyLock, '關羽'),
        );
    });

    suite.test('語系表有值時採用語系表', () => {
        const lookup = (key: string, name: string) => `[${key}] ${name}`;
        assert.equals(
            '[ui.vit.script.hint_late_bloomer] 諸葛亮',
            vitalityScriptText(lookup, VITALITY_SCRIPT_KEYS.lateBloomerHint, '諸葛亮'),
        );
    });

    return suite;
}
