/**
 * LuckFateInheritance.test.ts — 運氣 =100 天命傳承（LUK-06 效果 3，PROG-2-0878）
 *
 * 檢查：只從曾祖代（第 3 世代）取因子；子嗣已有的不重複；色系未啟用的不取；
 * 額外繼承不計入名額；沒有候選時不消耗亂數；候選存在時消耗兩次亂數。
 *
 * Unity 對照：掉落結算後多送一件祖傳寶物，從祖輩收藏抽一件，不佔背包格。
 */
import { assert, TestSuite } from './TestRunner';
import { applyFateInheritance } from '../assets/scripts/core/systems/LuckFateInheritance';
import type { AncestorFactorSource, FactorDictionary, InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';

function factor(id: string, level: number): InheritedFactor {
    return { id, color: 'blue', level, generation: 1, sourceUids: ['p'] };
}

function counted(values: number[]): (() => number) & { calls: () => number } {
    let i = 0;
    const fn = (() => values[Math.min(i++, values.length - 1)]) as (() => number) & { calls: () => number };
    fn.calls = () => i;
    return fn;
}

// 沒有字典時以舊資料 type「戰鬥」對到藍色，讓候選可以被挑中
const greatGrand: AncestorFactorSource = {
    uid: 'gg', generation: 3, factorIds: ['att_x', 'att_y'],
    genes: [{ id: 'att_x', type: '戰鬥' }, { id: 'att_y', type: '戰鬥' }],
};

export function createLuckFateInheritanceSuite(): TestSuite {
    const suite = new TestSuite('LuckFateInheritance (運氣 =100 天命傳承)');

    suite.test('只從曾祖代取因子：父母層的來源不會被選中', () => {
        const parent: AncestorFactorSource = { uid: 'p', generation: 1, factorIds: ['only_parent'] };
        const out = applyFateInheritance([], [parent], { random: counted([0]) });
        assert.equals(0, out.length);
    });

    suite.test('挑中曾祖代因子並加入，世代標為 3、來源為該曾祖', () => {
        const out = applyFateInheritance([factor('own', 1)], [greatGrand], { random: counted([0, 0]) });
        assert.equals(2, out.length);
        assert.equals('att_x', out[1].id);
        assert.equals(3, out[1].generation);
        assert.equals('gg', out[1].sourceUids[0]);
    });

    suite.test('子嗣已擁有的因子不重複加入', () => {
        const out = applyFateInheritance([factor('att_x', 2)], [greatGrand], { random: counted([0, 0]) });
        assert.equals(2, out.length);
        assert.equals('att_y', out[1].id);
    });

    suite.test('色系未啟用的因子不被選中', () => {
        const dictionary = new Map([['att_x', { id: 'att_x', category: 'fortune', maxLevel: 5 }]]) as unknown as FactorDictionary;
        const out = applyFateInheritance([], [{ uid: 'gg', generation: 3, factorIds: ['att_x'], genes: [{ id: 'att_x', type: '戰鬥' }] }], {
            random: counted([0, 0]), dictionary, enabledColors: ['blue'],
        });
        assert.equals(0, out.length);
    });

    suite.test('額外繼承不受 maxFactors 名額限制：已有 5 個仍會加入第 6 個', () => {
        const full = [1, 2, 3, 4, 5].map((n) => factor(`f${n}`, 1));
        const out = applyFateInheritance(full, [greatGrand], { random: counted([0, 0]) });
        assert.equals(6, out.length);
    });

    suite.test('沒有候選時不消耗亂數；有候選時消耗兩次（挑選與星級）', () => {
        const none = counted([0]);
        applyFateInheritance([], [], { random: none });
        assert.equals(0, none.calls());
        const some = counted([0, 0]);
        applyFateInheritance([], [greatGrand], { random: some });
        assert.equals(2, some.calls());
    });

    return suite;
}
