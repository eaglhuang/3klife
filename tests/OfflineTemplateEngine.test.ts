/**
 * OfflineTemplateEngine.test.ts — 離線模板台詞產生（NPC-03，PROG-2-0462）
 *
 * 純邏輯測試：槽位填入、字數區間、找不到模板或缺槽位時回退安全句。
 */
import { assert, TestSuite } from './TestRunner';
import {
    OfflineTemplate,
    fillTemplate,
    isAcceptableOfflineLine,
    lineLength,
    renderOfflineLine,
} from '../assets/scripts/core/systems/OfflineTemplateEngine';

const PERSONA = { Safe_Fallback_Line: '此事俺記下了，待有眉目再與你分說。' };
const TEMPLATES: OfflineTemplate[] = [
    { Context_Key: 'changban-bridge', Text: '長坂橋頭那聲喝，俺不是為逞勇，是要替{target}斷開曹軍的膽。' },
    { Context_Key: 'changban-bridge', Text: '當年長坂一聲吼，今日俺仍護著{target}，誰敢上前！' },
];
const SLOTS = { target: '大哥' };

export function createOfflineTemplateEngineSuite(): TestSuite {
    const suite = new TestSuite('OfflineTemplateEngine (NPC-03 離線模板台詞)');

    suite.test('槽位填入：{target} 換成玩家給的值，缺值時回傳 null', () => {
        assert.equals('替大哥斷路', fillTemplate('替{target}斷路', { target: '大哥' }));
        assert.equals(null, fillTemplate('替{target}斷路', {}));
    });

    suite.test('字數以字元計，20~60 字可接受，19 字與 61 字不可', () => {
        assert.equals(3, lineLength('燕人張'));
        assert.isTrue(isAcceptableOfflineLine('字'.repeat(20)));
        assert.isTrue(isAcceptableOfflineLine('字'.repeat(60)));
        assert.isFalse(isAcceptableOfflineLine('字'.repeat(19)));
        assert.isFalse(isAcceptableOfflineLine('字'.repeat(61)));
    });

    suite.test('同情境模板依 pickIndex 輪替，產出的句子已填入槽位', () => {
        const first = renderOfflineLine(PERSONA, 'changban-bridge', TEMPLATES, SLOTS, 0);
        const second = renderOfflineLine(PERSONA, 'changban-bridge', TEMPLATES, SLOTS, 1);
        const wrapped = renderOfflineLine(PERSONA, 'changban-bridge', TEMPLATES, SLOTS, 2);
        assert.equals('template', first.source);
        assert.isTrue(first.line.includes('大哥'));
        assert.isFalse(first.line === second.line);
        assert.equals(first.line, wrapped.line);
    });

    suite.test('找不到情境或缺槽位時回退安全句，source 標示 fallback', () => {
        const noContext = renderOfflineLine(PERSONA, 'unknown-context', TEMPLATES, SLOTS);
        assert.equals('fallback', noContext.source);
        assert.equals(PERSONA.Safe_Fallback_Line, noContext.line);
        const missingSlot = renderOfflineLine(PERSONA, 'changban-bridge', TEMPLATES, {}, 0);
        assert.equals('fallback', missingSlot.source);
    });

    suite.test('填完後字數超出區間也回退安全句，且不改輸入模板', () => {
        const tooShort: OfflineTemplate[] = [{ Context_Key: 'x', Text: '{target}' }];
        const snapshot = JSON.stringify(tooShort);
        const result = renderOfflineLine(PERSONA, 'x', tooShort, { target: '大哥' });
        assert.equals('fallback', result.source);
        assert.equals(snapshot, JSON.stringify(tooShort));
    });

    return suite;
}
