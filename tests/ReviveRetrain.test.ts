/**
 * ReviveRetrain.test.ts — 復生重練（SAME-04，PROG-2-1064）headless 測試
 *
 * 鎖住：新本體嵌回既有英靈卡、轉數 +1、已滿 5 轉時維持 5 並標記溢出、缺轉數視為 1 轉。
 */
import { assert, TestSuite } from './TestRunner';
import { reviveRetrain } from '../assets/scripts/core/systems/ReviveRetrain';

export function createReviveRetrainSuite(): TestSuite {
    const suite = new TestSuite('ReviveRetrain (復生重練 SAME-04 PROG-2-1064)');

    suite.test('新本體嵌回既有英靈卡，轉數 +1', () => {
        const result = reviveRetrain({ templateId: 'guan-yu', spiritCardUid: 'spirit-1', currentRebirthCount: 2 }, 'body-9');
        assert.equals('body-9', result.newBodyUid);
        assert.equals('guan-yu', result.templateId);
        assert.equals('spirit-1', result.embeddedSpiritCardUid);
        assert.equals(3, result.rebirthCount);
        assert.isTrue(!result.overflow);
    });

    suite.test('已滿 5 轉再復生時維持 5 轉並標記溢出', () => {
        const result = reviveRetrain({ templateId: 'guan-yu', spiritCardUid: 'spirit-1', currentRebirthCount: 5 }, 'body-10');
        assert.equals(5, result.rebirthCount);
        assert.isTrue(result.overflow);
    });

    suite.test('缺轉數的舊資料視為 1 轉，復生後為 2 轉', () => {
        const result = reviveRetrain({ templateId: 'liu-bei', spiritCardUid: 'spirit-2' }, 'body-11');
        assert.equals(2, result.rebirthCount);
    });

    return suite;
}
