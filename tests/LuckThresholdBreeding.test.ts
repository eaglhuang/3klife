/**
 * LuckThresholdBreeding.test.ts — 運氣門檻旗標接入結緣結果（LUK-06，PROG-2-0873）
 *
 * 檢查：受孕成功時，結緣結果帶出依父母平均 LUK 判定的三個旗標；
 * 受孕失敗或被擋下時不帶旗標。效果本身（戰法複製、血統變異、天命傳承）不在本測試範圍。
 *
 * Unity 對照：像 Breeding Command 執行後把 Threshold Table 的查詢結果放進回傳結構，
 * 由呼叫端決定要不要用；Command 本身不套效果。
 */
import { assert, TestSuite } from './TestRunner';
import { breed, BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';

function general(id: string, gender: '男' | '女', luk: number): BreedingGeneral {
    return {
        id, name: id, gender, age: 25, status: 'Active', vitality: 100, hp: 800,
        str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk, genes: [], generation: 0,
        pregnancySeasonsLeft: 0,
    } as unknown as BreedingGeneral;
}

function conceiveWith(luk: number) {
    return breed({
        father: general('f', '男', luk),
        mother: general('m', '女', luk),
        pedigree: new BloodlineGraph(),
        random: () => 0,
        childId: 'baby',
        birthSeason: 1,
    });
}

export function createLuckThresholdBreedingSuite(): TestSuite {
    const suite = new TestSuite('LuckThresholdBreeding (LUK 門檻接入結緣)');

    suite.test('父母平均 LUK 79：受孕成功，三個旗標皆為 false', () => {
        const result = conceiveWith(79);
        assert.equals('conceived', result.outcome);
        assert.isFalse(result.luckEffects!.forceTacticCopy);
        assert.isFalse(result.luckEffects!.bloodlineMutation);
        assert.isFalse(result.luckEffects!.fateInheritance);
    });

    suite.test('父母平均 LUK 80：戰法強制複製旗標為 true', () => {
        const result = conceiveWith(80);
        assert.isTrue(result.luckEffects!.forceTacticCopy);
        assert.isFalse(result.luckEffects!.bloodlineMutation);
    });

    suite.test('父母平均 LUK 95：血統變異旗標為 true，天命傳承仍為 false', () => {
        const result = conceiveWith(95);
        assert.isTrue(result.luckEffects!.bloodlineMutation);
        assert.isFalse(result.luckEffects!.fateInheritance);
    });

    suite.test('父母平均 LUK 100：天命傳承旗標為 true', () => {
        const result = conceiveWith(100);
        assert.isTrue(result.luckEffects!.fateInheritance);
    });

    suite.test('受孕失敗：不帶運氣旗標', () => {
        const result = breed({
            father: general('f', '男', 100), mother: general('m', '女', 100),
            pedigree: new BloodlineGraph(), random: () => 0.999, childId: 'baby',
        });
        assert.equals('failed', result.outcome);
        assert.equals(undefined, result.luckEffects);
    });

    return suite;
}
