/**
 * AiEntranceLines.test.ts — AI 出場台詞與困難關卡提示（AIS-14）
 *
 * 鎖住：八個 AI 模板的台詞都能對應到敵將 id；沒列在表內的敵將不顯示；
 * 困難（HARD）以上才顯示困難提示；開戰文案的順序是提示在前、台詞在後。
 *
 * Unity 對照：像每個 Boss 的開場 Dialogue 表，查不到就不播，查得到就照順序播。
 */
import { assert, TestSuite } from './TestRunner';
import { aiEntranceLineOf, hardEncounterHintOf, openingAiLogLinesOf } from '../assets/scripts/core/systems/AiEntranceLines';

const TEMPLATE_GENERAL_IDS = ['cao-cao', 'liu-bei', 'zhuge-liang', 'lu-bu', 'zhou-yu', 'guan-yu', 'sima-yi', 'yuan-shao'];

export function createAiEntranceLinesSuite(): TestSuite {
    const suite = new TestSuite('AiEntranceLines (AI 出場台詞與困難提示 AIS-14)');

    suite.test('八個 AI 模板都有出場台詞', () => {
        for (const id of TEMPLATE_GENERAL_IDS) {
            assert.isTrue(aiEntranceLineOf(id) !== null);
        }
    });

    suite.test('沒列在表內的敵將回傳 null', () => {
        assert.equals(null, aiEntranceLineOf('cao-ren'));
    });

    suite.test('困難（HARD）、噩夢、地獄顯示困難提示；簡單與普通不顯示', () => {
        assert.isTrue(hardEncounterHintOf('hard') !== null);
        assert.isTrue(hardEncounterHintOf('nightmare') !== null);
        assert.isTrue(hardEncounterHintOf('hell') !== null);
        assert.equals(null, hardEncounterHintOf('normal'));
        assert.equals(null, hardEncounterHintOf('easy'));
    });

    suite.test('開戰文案：困難提示在前、敵將台詞在後，台詞前綴敵將名', () => {
        const lines = openingAiLogLinesOf('lu-bu', '呂布', 'hell');
        assert.equals(2, lines.length);
        assert.isTrue(lines[1].startsWith('呂布：「天下誰敢一戰！」'));
    });

    suite.test('普通難度且非模板敵將：開戰文案為空', () => {
        assert.equals(0, openingAiLogLinesOf('cao-ren', '曹仁', 'normal').length);
    });

    return suite;
}
