/**
 * EliteTroopCodexCollection — 虎符圖鑑已獲狀態（TRP-20；PROG-2-1934）
 */
import { assert, TestSuite } from './TestRunner';
import { EliteTroopCodexCollection } from '../assets/scripts/core/systems/EliteTroopCodexCollection';

export function createEliteTroopCodexCollectionSuite(): TestSuite {
    const suite = new TestSuite('EliteTroopCodexCollection (虎符圖鑑 TRP-20 PROG-2-1934)');

    suite.test('首獲回 true、重複與名錄外回 false，進度與全收集', () => {
        const c = new EliteTroopCodexCollection(['a', 'b']);
        assert.isTrue(c.markAcquired('a', 10));
        assert.isFalse(c.markAcquired('a', 20));
        assert.isFalse(c.markAcquired('zzz', 30));
        assert.equals(10, c.firstAcquiredAt('a'));
        assert.equals(null, c.firstAcquiredAt('b'));
        assert.equals(1, c.progress().acquired);
        assert.isFalse(c.progress().complete);
        c.markAcquired('b', 40);
        assert.isTrue(c.progress().complete);
    });

    suite.test('存讀檔來回一致，丟棄名錄外與非數值項', () => {
        const c = new EliteTroopCodexCollection(['a', 'b'], { acquired: { a: 5, x: 1, b: Number.NaN } });
        assert.isTrue(c.isAcquired('a'));
        assert.isFalse(c.isAcquired('b'));
        const again = new EliteTroopCodexCollection(['a', 'b'], c.toSave());
        assert.equals(5, again.firstAcquiredAt('a'));
        assert.equals(1, again.progress().acquired);
    });

    return suite;
}
