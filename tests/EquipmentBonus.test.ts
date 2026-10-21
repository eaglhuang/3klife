import { assert, TestSuite } from './TestRunner';
import { applyEquipBonuses, clampEquipBonus, equipStatBonuses, EQUIP_BONUS_RANGE } from '../assets/scripts/core/systems/EquipmentBonus';

export function createEquipmentBonusSuite(): TestSuite {
    const suite = new TestSuite('EquipmentBonus (BAG-04 品質加成與面板合入)');

    suite.test('品質範圍與規格表一致：SSR 50~100、SR 20~49、R 5~19、N 1~4', () => {
        assert.equals(50, EQUIP_BONUS_RANGE.SSR.min);
        assert.equals(100, EQUIP_BONUS_RANGE.SSR.max);
        assert.equals(20, EQUIP_BONUS_RANGE.SR.min);
        assert.equals(49, EQUIP_BONUS_RANGE.SR.max);
        assert.equals(5, EQUIP_BONUS_RANGE.R.min);
        assert.equals(19, EQUIP_BONUS_RANGE.R.max);
        assert.equals(1, EQUIP_BONUS_RANGE.N.min);
        assert.equals(4, EQUIP_BONUS_RANGE.N.max);
    });

    suite.test('加成夾進品質範圍；非有限數取下限', () => {
        assert.equals(100, clampEquipBonus('SSR', 999));
        assert.equals(20, clampEquipBonus('SR', 3));
        assert.equals(50, clampEquipBonus('SSR', Number.NaN));
        assert.equals(7, clampEquipBonus('R', 7));
    });

    suite.test('武器、防具、飾品分別加到規格指定的兩項屬性；進階欄不加成', () => {
        assert.equals(
            JSON.stringify({ str: 60, int: 60 }),
            JSON.stringify(equipStatBonuses({ kind: 'WEAPON', quality: 'SSR', bonus: 60 })),
        );
        assert.equals(
            JSON.stringify({ lea: 10, hp: 10 }),
            JSON.stringify(equipStatBonuses({ kind: 'ARMOR', quality: 'R', bonus: 10 })),
        );
        assert.equals(
            JSON.stringify({}),
            JSON.stringify(equipStatBonuses({ kind: 'TREASURE', quality: 'SSR', bonus: 80 })),
        );
    });

    suite.test('合入面板：final = base + Σ 加成，不改動輸入', () => {
        const base = { str: 80, int: 70, lea: 60, pol: 50, cha: 50, hp: 1000 };
        const items = [
            { kind: 'WEAPON' as const, quality: 'SSR' as const, bonus: 50 },
            { kind: 'ARMOR' as const, quality: 'N' as const, bonus: 2 },
        ];
        const merged = applyEquipBonuses(base, items);
        assert.equals(130, merged.str ?? 0);
        assert.equals(120, merged.int ?? 0);
        assert.equals(62, merged.lea ?? 0);
        assert.equals(1002, merged.hp ?? 0);
        assert.equals(80, base.str, '輸入的基礎數值不被改動');
    });

    return suite;
}
