/**
 * PrisonCapacityByLevel.test.ts — 監獄容量依主城等級（ECO-14）headless 測試
 *
 * Unity 對照：ScriptableObject 容量表，EditMode Test 逐級檢查，超過上限時 Decide 按鈕回報 PRISON_FULL。
 */
import { assert, TestSuite } from './TestRunner';
import {
    createPowRecord,
    PRISON_SLOTS_MAX,
    prisonCapacityOf,
    resolvePowDecision,
    type PowRecord,
    type PowResolveContext,
} from '../assets/scripts/core/systems/PrisonerOfWar';

function ctx(prisonUsed: number, territoryLevel: number): PowResolveContext {
    return { random: () => 0, gold: 0, cityTroops: 0, prisonUsed, prisonSlots: prisonCapacityOf(territoryLevel) };
}

/** 與 PrisonerOfWar.test.ts 相同的俘虜：呂布（非傭兵、可關押） */
const LU_BU = { id: 'lu-bu', name: '呂布', faction: 'qun', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 99, int: 30, lea: 80, pol: 20, cha: 40, luk: 30 } as never;
const record: PowRecord = createPowRecord(LU_BU, { cha: 80, luk: 50 })!;

export function createPrisonCapacityByLevelSuite(): TestSuite {
    const suite = new TestSuite('PrisonCapacityByLevel (ECO-14 監獄容量)');

    suite.test('容量符合規格：Lv1–2 為 3、每兩級 +1、Lv15 起封頂 10', () => {
        for (let level = 1; level <= 20; level += 1) {
            const expected = Math.min(PRISON_SLOTS_MAX, 3 + Math.floor((level - 1) / 2));
            assert.equals(expected, prisonCapacityOf(level), `Lv${level}`);
        }
    });

    suite.test('等級低於表內第一列時取第一列', () => {
        assert.equals(3, prisonCapacityOf(0));
    });

    suite.test('達到主城容量即 PRISON_FULL，未達則可關押', () => {
        assert.equals('PRISON_FULL', resolvePowDecision(record, 'imprison', ctx(3, 1)).reasons.join(','));
        assert.isTrue(resolvePowDecision(record, 'imprison', ctx(2, 1)).imprisoned === true);
        assert.isTrue(resolvePowDecision(record, 'imprison', ctx(3, 3)).imprisoned === true, 'Lv3 容量 4，已用 3 仍可關押');
    });

    return suite;
}
