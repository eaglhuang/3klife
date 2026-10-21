/**
 * LoreCache.test.ts — 武將故事 LRU 快取的容量與淘汰順序（TERM-06，PROG-2-1023）
 *
 * 鎖住：預設容量 20、超過時淘汰最久未用、get 會更新最近使用、重複 set 不增加容量。
 */
import { TestSuite, assert } from './TestRunner';
import { LORE_CACHE_CAPACITY, LoreCache } from '../assets/scripts/core/services/LoreCache';

export function createLoreCacheSuite(): TestSuite {
    const suite = new TestSuite('LoreCache (故事 LRU 快取 TERM-06)');

    suite.test('預設容量為 20：放 21 位武將，最舊的被淘汰', () => {
        assert.equals(20, LORE_CACHE_CAPACITY);
        const cache = new LoreCache<string>();
        for (let i = 0; i < 21; i++) cache.set('g' + i, 'lore' + i);
        assert.equals(20, cache.size);
        assert.isFalse(cache.has('g0'));
        assert.isTrue(cache.has('g20'));
    });

    suite.test('get 會把項目標為最近使用，被淘汰的是最久未用的', () => {
        const cache = new LoreCache<string>(3);
        cache.set('a', '1');
        cache.set('b', '2');
        cache.set('c', '3');
        assert.equals('1', cache.get('a') ?? '');
        cache.set('d', '4');
        assert.isTrue(cache.has('a'));
        assert.isFalse(cache.has('b'));
        assert.equals('c,a,d', cache.keys().join(','));
    });

    suite.test('重複 set 同一 key 更新值，不增加容量，並標為最近使用', () => {
        const cache = new LoreCache<string>(2);
        cache.set('a', '1');
        cache.set('b', '2');
        cache.set('a', 'updated');
        assert.equals(2, cache.size);
        assert.equals('updated', cache.get('a') ?? '');
        cache.set('c', '3');
        assert.isFalse(cache.has('b'));
    });

    suite.test('讀不存在的 key 回 undefined，不改變順序', () => {
        const cache = new LoreCache<string>(2);
        cache.set('a', '1');
        assert.equals(undefined, cache.get('zzz'));
        assert.equals('a', cache.keys().join(','));
    });

    suite.test('容量不是正整數時丟出 RangeError', () => {
        let threw = false;
        try {
            new LoreCache<string>(0);
        } catch (err) {
            threw = err instanceof RangeError;
        }
        assert.isTrue(threw);
    });

    return suite;
}
