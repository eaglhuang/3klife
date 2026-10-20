/**
 * 名士批語與天象異變（BRD-09 / PROG-2-0821）
 *
 * 鎖住：批語數量 2~3、不足 2 位名士不出批語、批語誤差率落在 10~20%、
 * 天象異變同輸入同結果且三種都可能出現。
 */
import { assert, TestSuite } from './TestRunner';
import type { FactorPoolEntry } from '../assets/scripts/core/systems/BreedingSystem';
import { buildSageRemarks, OMEN_KINDS, pickOmen, REMARK_ERROR_RATE, remarkRandomOf } from '../assets/scripts/core/systems/SageRemarks';

const POOL = [
    { id: 'f-blue', color: 'blue', chance: 1, displayName: '藍因子' },
    { id: 'f-red', color: 'red', chance: 1, displayName: '紅因子' },
    { id: 'f-green', color: 'green', chance: 0.5, displayName: '綠因子' },
] as unknown as FactorPoolEntry[];

/** 可重現的亂數（線性同餘） */
function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

export function createSageRemarksSuite(): TestSuite {
    const suite = new TestSuite('SageRemarks (名士批語與天象異變 BRD-09)');

    suite.test('批語數量：2 或 3 位名士各一則，超過 3 位只取前 3 位', () => {
        assert.equals(2, buildSageRemarks(POOL, ['zhuge-liang', 'hua-tuo'], seeded(1)).length);
        assert.equals(3, buildSageRemarks(POOL, ['zhuge-liang', 'hua-tuo', 'xu-shao', 'sima-hui'], seeded(1)).length);
    });

    suite.test('不足 2 位名士（含未知或重複）不出批語', () => {
        assert.equals(0, buildSageRemarks(POOL, ['zhuge-liang'], seeded(1)).length);
        assert.equals(0, buildSageRemarks(POOL, ['zhuge-liang', 'zhuge-liang', 'nobody'], seeded(1)).length);
        assert.equals(0, buildSageRemarks([], ['zhuge-liang', 'hua-tuo'], seeded(1)).length);
    });

    suite.test('批語誤差率落在 10~20%（暫定 15%）', () => {
        assert.isTrue(REMARK_ERROR_RATE >= 0.1 && REMARK_ERROR_RATE <= 0.2);
        const random = seeded(7);
        let total = 0;
        let distorted = 0;
        for (let i = 0; i < 4000; i++) {
            for (const remark of buildSageRemarks(POOL, ['zhuge-liang', 'hua-tuo'], random)) {
                total++;
                if (remark.isDistorted) distorted++;
            }
        }
        const rate = distorted / total;
        assert.isTrue(rate >= 0.1 && rate <= 0.2);
    });

    suite.test('天象異變：同輸入同結果，三種都可能出現', () => {
        assert.equals(pickOmen(3, 42), pickOmen(3, 42));
        const seen = new Set<string>();
        for (let season = 1; season <= 60; season++) seen.add(pickOmen(season, 42));
        for (const kind of OMEN_KINDS) assert.isTrue(seen.has(kind));
    });

    suite.test('批語隨機源：同一組種子每次刷新序列相同，不同種子不同', () => {
        const first = remarkRandomOf('a|b');
        const again = remarkRandomOf('a|b');
        const other = remarkRandomOf('a|c');
        const seqA = [first(), first(), first()];
        assert.equals(JSON.stringify(seqA), JSON.stringify([again(), again(), again()]));
        assert.isFalse(seqA[0] === other());
    });

    return suite;
}
