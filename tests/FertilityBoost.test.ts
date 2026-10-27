/**
 * FertilityBoost.test.ts — 安胎藥受孕率倍率接上結緣判定（PROG-2-1032，ITM-04b）
 *
 * 鎖住：未啟用為 1、啟用為 1.5；itemConceptionMod 會乘進受孕率；不傳時受孕率與未接線前相同。
 */
import { assert, TestSuite } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyConceptionMod, BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { FERTILITY_CONCEPTION_MULTIPLIER, fertilityConceptionMod } from '../assets/scripts/core/systems/FertilityBoost';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { Faction } from '../assets/scripts/shared/CommonEnums';

/** 魅力與幸運壓低，讓基礎受孕率落在上限 0.95 之下，倍率才看得出來 */
function makeGeneral(id: string, gender: '男' | '女'): BreedingGeneral {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        age: 30,
        hp: 1000,
        vitality: 100,
        maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 0, luk: 0,
    };
}

function breedWith(itemConceptionMod?: () => number): number {
    const store = new InMemoryRosterStore([makeGeneral('father', '男'), makeGeneral('mother', '女')]);
    const service = new BreedingService(store, new BloodlineGraph(), {
        random: () => 0.01,
        currentSeason: () => 3,
        itemConceptionMod,
    });
    return service.breed('father', 'mother').conceptionRate;
}

export function createFertilityBoostSuite(): TestSuite {
    const suite = new TestSuite('FertilityBoost (安胎藥受孕率倍率 ITM-04b)');

    suite.test('未啟用為 1，啟用為安胎藥倍率 1.5', () => {
        assert.equals(1, fertilityConceptionMod(false));
        assert.equals(FERTILITY_CONCEPTION_MULTIPLIER, fertilityConceptionMod(true));
        assert.equals(1.5, FERTILITY_CONCEPTION_MULTIPLIER);
    });

    suite.test('不傳 itemConceptionMod 時受孕率與未接線前相同', () => {
        assert.equals(breedWith(undefined), breedWith(() => 1));
    });

    suite.test('itemConceptionMod 乘進受孕率（經 applyConceptionMod 上限）', () => {
        const base = breedWith(undefined);
        const boosted = breedWith(() => fertilityConceptionMod(true));
        assert.equals(applyConceptionMod(base, 1.5), boosted);
        assert.isTrue(boosted > base);
    });

    return suite;
}
