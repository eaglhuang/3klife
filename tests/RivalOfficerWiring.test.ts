/**
 * RivalOfficerWiring.test.ts — 他國名冊接進勢力狀態與季推進（PROG-2-1714）
 */
import { assert, TestSuite } from './TestRunner';
import { averageMilitaryIndex, militaryIndexOf, usesOfficerPower } from '../assets/scripts/core/systems/RivalMilitaryIndex';
import { advanceRivalSeason, attachRivalOfficers, createRivalWorld, normalizeRivalWorld } from '../assets/scripts/core/systems/RivalNations';
import type { RivalNationRoster } from '../assets/scripts/core/systems/RivalOfficers';
import type { RivalPowerContext } from '../assets/scripts/core/systems/RivalOfficerSeason';

const CTX: RivalPowerContext = {
    difficulty: { statScale: 1 },
    chapter: 1,
    troopStatsOf: (t) => (t === 'cavalry' ? { attack: 40, defense: 20 } : null),
};

function roster(id: string): RivalNationRoster {
    return {
        officers: [{ generalId: id, age: 30, vitality: 50, baseStats: { str: 80, int: 60, lea: 70, pol: 50, cha: 50 } }],
        tallies: [{ id: `${id}-t`, quality: 'R', troopType: 'cavalry', star: 1, starExp: 0, equippedGeneralId: null }],
    };
}

export function createRivalOfficerWiringSuite(): TestSuite {
    const suite = new TestSuite('RivalOfficerWiring');

    suite.test('軍力指數：全體都有逐將軍力才改用，否則全體用兵力', () => {
        const mixed = [{ troops: 1000, officerPower: 5000 }, { troops: 3000 }];
        assert.isFalse(usesOfficerPower(mixed));
        assert.equals(averageMilitaryIndex(mixed), 2000);
        const all = [{ troops: 1000, officerPower: 5000 }, { troops: 3000, officerPower: 1000 }];
        assert.isTrue(usesOfficerPower(all));
        assert.equals(averageMilitaryIndex(all), 3000);
        assert.equals(militaryIndexOf(all[0]), 1000, '預設仍取兵力');
        assert.equals(militaryIndexOf(all[0], true), 5000);
    });

    suite.test('attachRivalOfficers：掛上名冊與初始軍力，不覆蓋已有名冊', () => {
        const world = createRivalWorld();
        const first = world.nations[0].id;
        const attached = attachRivalOfficers(world, { [first]: roster('a') }, CTX);
        const n = attached.nations[0];
        assert.isTrue(!!n.officerRoster);
        assert.isTrue((n.officerPower ?? 0) > 0);
        assert.isTrue(!attached.nations[1].officerRoster, '名冊沒有的勢力維持原狀');
        const again = attachRivalOfficers(attached, { [first]: roster('b') }, CTX);
        assert.equals(again.nations[0].officerRoster!.officers[0].generalId, 'a');
    });

    suite.test('advanceRivalSeason：帶逐將情境時推進名冊並重算軍力；不帶時名冊不動', () => {
        const world = createRivalWorld();
        const first = world.nations[0].id;
        const attached = attachRivalOfficers(world, { [first]: roster('a') }, CTX);
        const ticked = advanceRivalSeason(attached, () => 0.99, undefined, CTX).world.nations[0];
        assert.equals(ticked.officerRoster!.officers[0].age, 30.25);
        assert.equals(ticked.officerRoster!.tallies[0].equippedGeneralId, 'a');
        assert.isTrue((ticked.officerPower ?? 0) > (attached.nations[0].officerPower ?? 0), '裝上虎符後軍力上升');
        const plain = advanceRivalSeason(attached, () => 0.99).world.nations[0];
        assert.equals(plain.officerRoster, attached.nations[0].officerRoster);
    });

    suite.test('normalizeRivalWorld：存讀檔保留名冊與軍力，壞資料丟棄', () => {
        const world = createRivalWorld();
        const first = world.nations[0].id;
        const attached = attachRivalOfficers(world, { [first]: roster('a') }, CTX);
        const loaded = normalizeRivalWorld(JSON.parse(JSON.stringify(attached)));
        assert.equals(JSON.stringify(loaded.nations[0].officerRoster), JSON.stringify(attached.nations[0].officerRoster));
        assert.equals(loaded.nations[0].officerPower, attached.nations[0].officerPower);
        const raw = JSON.parse(JSON.stringify(attached));
        raw.nations[0].officerRoster = { officers: 'x' };
        const broken = normalizeRivalWorld(raw).nations[0];
        assert.isTrue(!broken.officerRoster);
        assert.equals(broken.officerPower, undefined);
    });

    return suite;
}
