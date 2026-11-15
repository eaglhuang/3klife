// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天泡泡）；PROG-2-2252
/**
 * HallBubbleState.test.ts — 連點不疊泡泡、換人放行上一位、舊計時不誤關新泡泡。純邏輯，不依賴 cc。
 */
import { HallBubbleState } from '../assets/scripts/core/systems/HallBubbleState';
import { TestSuite, assert } from './TestRunner';

export function createHallBubbleStateSuite(): TestSuite {
    const suite = new TestSuite('HallBubbleState (大廳泡泡不疊 PROG-2-2252)');

    suite.test('連點同一位武將：不疊泡泡，只刷新計時；previous 等於自己（呼叫端不放行）', () => {
        const bubble = new HallBubbleState();
        const first = bubble.open('zhao-yun');
        const second = bubble.open('zhao-yun');
        const third = bubble.open('zhao-yun');
        assert.equals('zhao-yun', bubble.actorId!);
        assert.equals(null, first.previous);
        assert.equals('zhao-yun', second.previous);
        assert.equals('zhao-yun', third.previous);
        // 只有最後一次的計時有效，前面兩次計時到期都不關
        assert.equals(null, bubble.expire(first.token));
        assert.equals(null, bubble.expire(second.token));
        assert.isTrue(bubble.isOpen);
        assert.equals('zhao-yun', bubble.expire(third.token)!);
        assert.isFalse(bubble.isOpen);
    });

    suite.test('換人：開新泡泡時回傳被擠掉的上一位，呼叫端放行它', () => {
        const bubble = new HallBubbleState();
        bubble.open('zhao-yun');
        const next = bubble.open('zhang-fei');
        assert.equals('zhao-yun', next.previous!);
        assert.equals('zhang-fei', bubble.actorId!);
    });

    suite.test('快速連點 A、B、A、B：任何時刻只有一個泡泡，最後停在最後點的人', () => {
        const bubble = new HallBubbleState();
        const seq = ['a', 'b', 'a', 'b', 'b'];
        let openCount = 0;
        for (const id of seq) {
            bubble.open(id);
            openCount = bubble.isOpen ? 1 : 0;
            assert.equals(1, openCount);
        }
        assert.equals('b', bubble.actorId!);
    });

    suite.test('手動關閉：回傳要放行的武將；之後舊計時晚到不會有作用', () => {
        const bubble = new HallBubbleState();
        const opened = bubble.open('lu-bu');
        assert.equals('lu-bu', bubble.close()!);
        assert.isFalse(bubble.isOpen);
        assert.equals(null, bubble.expire(opened.token));
        assert.equals(null, bubble.close());
    });

    suite.test('舊計時晚到不關新泡泡：先開 A、關掉、再開 B，A 的計時到期不影響 B', () => {
        const bubble = new HallBubbleState();
        const a = bubble.open('a');
        bubble.close();
        bubble.open('b');
        assert.equals(null, bubble.expire(a.token));
        assert.equals('b', bubble.actorId!);
    });

    return suite;
}
