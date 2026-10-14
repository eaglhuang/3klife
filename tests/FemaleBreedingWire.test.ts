/**
 * FemaleBreedingWire — 母體來源受孕率倍率接上結緣流程（FEM-02，PROG-2-0250）
 */
import { assert, TestSuite } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyConceptionMod, BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { createFemaleSource, FemaleSource } from '../assets/scripts/core/systems/FemaleSource';
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

function breedWith(getFemaleSource?: (uid: string) => FemaleSource | null): number {
    const store = new InMemoryRosterStore([makeGeneral('father', '男'), makeGeneral('mother', '女')]);
    const service = new BreedingService(store, new BloodlineGraph(), {
        random: () => 0.01,
        currentSeason: () => 3,
        getFemaleSource,
    });
    return service.breed('father', 'mother').conceptionRate;
}

export function createFemaleBreedingWireSuite(): TestSuite {
    const suite = new TestSuite('FemaleBreedingWire (母體來源接上結緣 FEM-02)');

    suite.test('無母體來源：受孕率與未接線前相同（倍率 ×1）', () => {
        const base = breedWith(undefined);
        assert.equals(base, breedWith(() => null));
    });

    suite.test('SSR 轉蛋母體：受孕率 = 基礎率 ×1.2（經 applyConceptionMod 上限）', () => {
        const base = breedWith(undefined);
        const boosted = breedWith((uid) => (uid === 'mother' ? createFemaleSource('GACHA', 'SSR', 1) : null));
        assert.equals(applyConceptionMod(base, 1.2), boosted);
        assert.isTrue(boosted > base);
    });

    suite.test('R 地下城母體：受孕率降低 ×0.8；只看母體，不看父體來源', () => {
        const base = breedWith(undefined);
        const reduced = breedWith((uid) => (uid === 'mother' ? createFemaleSource('DUNGEON', 'R', 1) : null));
        assert.equals(applyConceptionMod(base, 0.8), reduced);
        const fatherOnly = breedWith((uid) => (uid === 'father' ? createFemaleSource('GACHA', 'SSR', 1) : null));
        assert.equals(base, fatherOnly);
    });

    return suite;
}
