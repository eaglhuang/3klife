import { TestSuite, assert } from './TestRunner';
import { breed, checkBreedingEligibility, type BreedingGeneral, type PedigreeSource } from '../assets/scripts/core/systems/BreedingSystem';
import { birthFrailRisk, bloodFatigueBirthLines, bloodFatigueForecast, childBloodFatigue, FRAIL_BIRTH_FLAG, normalizeBloodFatigue } from '../assets/scripts/core/systems/BloodFatigue';
import { bloodlineBirthLines } from '../assets/scripts/core/systems/BloodlineBirthLines';

const person = (id: string, gender: string, extra: Record<string, unknown> = {}) => ({
    id, name: id, gender, age: 25, hp: 100, currentHp: 100, vitality: 100, maxVitality: 100,
    str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 10, genes: [], ...extra,
}) as unknown as BreedingGeneral;

/** distance：commonAncestorDistance 的回傳值；只在查到第 4 代才命中時傳 4 */
const pedigree = (distance: number | null): PedigreeSource => ({
    getPedigree: () => ({}) as never,
    getPerson: () => null,
    commonAncestorDistance: (_a, _b, maxGeneration = 3) => (distance !== null && distance <= maxGeneration ? distance : null),
}) as PedigreeSource;

const breedWith = (father: BreedingGeneral, mother: BreedingGeneral, distance: number | null, last: number) => {
    const values: number[] = [];
    return breed({
        father, mother, pedigree: pedigree(distance), childId: 'child', birthSeason: 1,
        // 受孕要成功；血脈疲勞是最後一次亂數，用 last 控制
        random: () => { values.push(0); return last; },
    } as never);
};

export function createBloodFatigueSuite(): TestSuite {
    const suite = new TestSuite('BloodFatigue');

    suite.test('h 轉移：近婚 max+1、外婚 max-1 且不低於 0', () => {
        assert.equals(1, childBloodFatigue(0, 0, true));
        assert.equals(4, childBloodFatigue(3, 1, true));
        assert.equals(2, childBloodFatigue(3, 0, false));
        assert.equals(0, childBloodFatigue(0, 0, false));
        assert.equals(0, childBloodFatigue(undefined, 'x', false));
    });

    suite.test('規格驗算：連續三代外婚 3→2→1→0；2 階再近婚回到 3 階 32%', () => {
        let h = 3;
        for (const expected of [2, 1, 0]) {
            h = childBloodFatigue(h, 0, false);
            assert.equals(expected, h);
        }
        assert.equals(3, childBloodFatigue(2, 0, true));
        assert.equals(0.32, birthFrailRisk(3, true));
    });

    suite.test('病弱風險：外婚一律 1%，近婚查表、4 階以上封頂', () => {
        assert.equals(0.01, birthFrailRisk(0, false));
        assert.equals(0.01, birthFrailRisk(5, false));
        assert.equals(0.12, birthFrailRisk(1, true));
        assert.equals(0.2, birthFrailRisk(2, true));
        assert.equals(0.48, birthFrailRisk(4, true));
        assert.equals(0.48, birthFrailRisk(9, true));
    });

    suite.test('存檔值正規化', () => {
        assert.equals(0, normalizeBloodFatigue(-1));
        assert.equals(0, normalizeBloodFatigue(Number.NaN));
        assert.equals(2, normalizeBloodFatigue(2.9));
    });

    suite.test('預告：乾淨外婚不提，復壯與近婚要顯示數字', () => {
        assert.equals('', bloodFatigueForecast(0, 0, false));
        assert.equals('異姓復壯：血脈疲勞 3→2，病弱風險 1%', bloodFatigueForecast(3, 0, false));
        assert.equals('血脈疲勞 1→2，病弱風險 20%', bloodFatigueForecast(1, 0, true));
    });

    suite.test('出生句：乾淨外婚沒有句子', () => {
        assert.lengthEquals(0, bloodFatigueBirthLines({ before: 0, after: 0, inbred: false, frail: false }));
        assert.isTrue(bloodFatigueBirthLines({ before: 3, after: 2, inbred: false, frail: false })[0].includes('由 3 降為 2'));
        assert.isTrue(bloodFatigueBirthLines({ before: 0, after: 1, inbred: true, frail: true }).join('').includes('體弱'));
    });

    suite.test('資格檢查回報近婚：同血脈或第 4 代共祖；第 4 代不擋結緣', () => {
        const f = person('f', '男');
        const m = person('m', '女');
        assert.isFalse(checkBreedingEligibility(f, m, pedigree(null)).inbred);
        const far = checkBreedingEligibility(f, m, pedigree(4));
        assert.isTrue(far.inbred);
        assert.isTrue(far.ok);
        assert.isTrue(checkBreedingEligibility(person('f', '男', { bloodlineId: 'b' }), person('m', '女', { bloodlineId: 'b' }), pedigree(null)).inbred);
    });

    suite.test('結緣寫入：外婚子嗣 h 下降、不病弱時精力不變', () => {
        const result = breedWith(person('f', '男', { bloodFatigue: 3 }), person('m', '女'), null, 0.5);
        assert.equals('conceived', result.outcome);
        assert.equals(2, result.child!.bloodFatigue!);
        assert.isFalse(result.bloodFatigue!.inbred);
        assert.isFalse(result.bloodFatigue!.frail);
        assert.equals(100, result.child!.maxVitality!);
        assert.isFalse((result.child!.hiddenFlags ?? []).includes(FRAIL_BIRTH_FLAG));
    });

    suite.test('結緣寫入：近婚擲中病弱，精力上限 ×0.8、掛旗標、出生句帶到', () => {
        const result = breedWith(person('f', '男', { bloodFatigue: 1 }), person('m', '女'), 4, 0.1);
        assert.equals(2, result.child!.bloodFatigue!);
        assert.isTrue(result.bloodFatigue!.inbred);
        assert.isTrue(result.bloodFatigue!.frail);
        assert.equals(80, result.child!.maxVitality!);
        assert.equals(80, result.child!.vitality!);
        assert.isTrue(result.child!.hiddenFlags!.includes(FRAIL_BIRTH_FLAG));
        assert.isTrue(bloodlineBirthLines(result, () => null).join('').includes('血脈疲勞升至 2 階'));
    });

    return suite;
}
