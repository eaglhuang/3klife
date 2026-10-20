/**
 * LuckTacticCopy.test.ts — 運氣 ≥80 戰法強制複製（LUK-06 效果，PROG-2-0874）
 *
 * 檢查：父親最強戰法（綠色、星級最高）在子嗣因子中一定存在且星級不低於父親；
 * 名額滿時替換最弱非強制因子；沒有戰法時不變；LUK 未達 80 時不套用。
 *
 * Unity 對照：像掉落結算後的保底規則，保底項目一定進背包，背包滿了擠掉最弱一格。
 */
import { assert, TestSuite } from './TestRunner';
import { forceFatherTacticCopy, strongestFatherTactic } from '../assets/scripts/core/systems/LuckTacticCopy';
import type { FactorDictionary, InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const dictionary: FactorDictionary = new Map([
    ['tac_a', { id: 'tac_a', category: 'tactic-seed', maxLevel: 5 }],
    ['tac_b', { id: 'tac_b', category: 'tactic-seed', maxLevel: 5 }],
    ['att_x', { id: 'att_x', category: 'attribute', maxLevel: 5 }],
] as Array<[string, { id: string; category: string; maxLevel: number }]>) as unknown as FactorDictionary;

function father(genes: Array<{ id: string; level: number }>): GeneralConfig {
    return { id: 'father', genes } as unknown as GeneralConfig;
}

function factor(id: string, level: number, color: InheritedFactor['color'] = 'blue'): InheritedFactor {
    return { id, color, level, generation: 2, sourceUids: ['x'] };
}

export function createLuckTacticCopySuite(): TestSuite {
    const suite = new TestSuite('LuckTacticCopy (運氣 ≥80 戰法強制複製)');

    suite.test('父親最強戰法：取綠色因子中星級最高的一個，同星取 id 小者', () => {
        const best = strongestFatherTactic(father([{ id: 'tac_b', level: 4 }, { id: 'tac_a', level: 4 }, { id: 'att_x', level: 5 }]), dictionary);
        assert.equals('tac_a', best!.id);
        assert.equals(4, best!.level);
    });

    suite.test('父親沒有戰法：不改動子嗣因子', () => {
        const factors = [factor('att_x', 3)];
        assert.equals(factors, forceFatherTacticCopy(factors, father([{ id: 'att_x', level: 5 }]), dictionary, 5));
    });

    suite.test('子嗣沒有該戰法：強制加入，星級等於父親的戰法星級', () => {
        const out = forceFatherTacticCopy([factor('att_x', 3)], father([{ id: 'tac_a', level: 4 }]), dictionary, 5);
        const forced = out.find((f) => f.id === 'tac_a')!;
        assert.equals(4, forced.level);
        assert.equals('green', forced.color);
        assert.equals(2, out.length);
    });

    suite.test('子嗣已抽到同一戰法：星級取較高者，不重複出現', () => {
        const out = forceFatherTacticCopy([factor('tac_a', 2, 'green')], father([{ id: 'tac_a', level: 4 }]), dictionary, 5);
        assert.equals(1, out.length);
        assert.equals(4, out[0].level);
    });

    suite.test('名額已滿：替換掉星級最低的非強制因子，總數不超過上限', () => {
        const full = [factor('att_x', 5), factor('att_y', 4), factor('att_z', 1)];
        const out = forceFatherTacticCopy(full, father([{ id: 'tac_a', level: 3 }]), dictionary, 3);
        assert.equals(3, out.length);
        assert.isTrue(out.some((f) => f.id === 'tac_a'));
        assert.isFalse(out.some((f) => f.id === 'att_z'));
    });

    return suite;
}
