// @spec-source → 傭兵系統規格書：人才經營進化（每 8 小時刷新，PROG-2-0560）
/**
 * FemalePoolRefresh — 傭兵池女武將 8 小時刷新與抽取 headless 測試（PROG-2-0560）
 */
import { assert, TestSuite } from './TestRunner';
import {
    drawFemalePool,
    isFemalePoolRefreshDue,
    nextFemalePoolRefreshMs,
} from '../assets/scripts/core/systems/FemalePoolRefresh';

const HOUR = 60 * 60 * 1000;

export function createFemalePoolRefreshSuite(): TestSuite {
    const suite = new TestSuite('FemalePoolRefresh (傭兵池女武將刷新 FEM-04)');

    suite.test('8 小時刷新：滿 8 小時即到期，不足 8 小時不刷新', () => {
        assert.isFalse(isFemalePoolRefreshDue(0, 8 * HOUR - 1));
        assert.isTrue(isFemalePoolRefreshDue(0, 8 * HOUR));
        assert.equals(8 * HOUR, nextFemalePoolRefreshMs(0));
    });

    suite.test('只抽女性：男性候選不會進入女性池', () => {
        const candidates = [
            { id: 'm1', gender: '男' },
            { id: 'f1', gender: '女' },
            { id: 'f2', gender: '女' },
            { id: 'm2', gender: '男' },
        ];
        const picked = drawFemalePool(candidates, 4, () => 0.5);
        assert.equals(2, picked.length);
        assert.isFalse(picked.includes('m1'));
        assert.isFalse(picked.includes('m2'));
    });

    suite.test('數量夾在 3~5：太少補到 3（候選足夠時），太多封頂 5', () => {
        const many = Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, gender: '女' }));
        assert.equals(3, drawFemalePool(many, 1, () => 0.9).length);
        assert.equals(5, drawFemalePool(many, 99, () => 0.9).length);
    });

    suite.test('不重複抽取，候選不足時回傳全部女性', () => {
        const few = [{ id: 'f1', gender: '女' }, { id: 'f2', gender: '女' }];
        const picked = drawFemalePool(few, 5, () => 0.1);
        assert.equals(2, picked.length);
        assert.notEquals(picked[0], picked[1]);
    });

    return suite;
}
