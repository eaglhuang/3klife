/**
 * 粉色因子→地形適性接線（APT-09 / PROG-2-0412）
 *
 * 覆蓋：粉色因子覆寫地形適性、14 人血統同因子升級、不改來源、GeneralUnit 經由戰場 profile 讀到因子。
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyPinkTerrainAptitude,
    battleAptitudeProfileOf,
    resolveAptitude,
} from '../assets/scripts/core/systems/BattleAptitude';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction, TerrainType } from '../assets/scripts/shared/CommonEnums';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createPinkTerrainAptitudeSuite(): TestSuite {
    const suite = new TestSuite('PinkTerrainAptitude (粉色因子→地形適性 APT-09)');

    suite.test('粉色地形因子覆寫對應地形：★3→A、★0→D，其他地形保留原值', () => {
        const base = { PLAIN: 'C', MOUNTAIN: 'B' };
        const out = applyPinkTerrainAptitude(base, [
            { id: 'gene_mountain', level: 3 },
            { id: 'gene_forest', level: 0 },
        ]);
        assert.equals('A', out.MOUNTAIN);
        assert.equals('D', out.FOREST);
        assert.equals('C', out.PLAIN);
    });

    suite.test('沒有粉色因子時回傳原值複本；非粉色因子忽略', () => {
        const base = { MOUNTAIN: 'A' };
        const out = applyPinkTerrainAptitude(base, [{ id: 'gene_cavalry', level: 5 }]);
        assert.equals('A', out.MOUNTAIN);
        assert.equals(false, 'CAVALRY' in out);
    });

    suite.test('14 人血統中同因子 ≥5 人時升一級（B→A），不超過 S', () => {
        const low = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 2 }], { gene_naval: 5 });
        assert.equals('A', low.WATER);
        const top = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 3 }], { gene_naval: 9 });
        assert.equals('S', top.WATER);
        const capped = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 5 }], { gene_naval: 9 });
        assert.equals('S', capped.WATER);
        const none = applyPinkTerrainAptitude({}, [{ id: 'gene_naval', level: 2 }], { gene_naval: 4 });
        assert.equals('B', none.WATER);
    });

    suite.test('不改來源 base 與 genes', () => {
        const base = { MOUNTAIN: 'B' };
        const genes = [{ id: 'gene_mountain', level: 3 }];
        applyPinkTerrainAptitude(base, genes);
        assert.equals('B', base.MOUNTAIN);
        assert.equals(3, genes[0].level);
    });

    suite.test('GeneralUnit 經戰場 profile 讀到粉色因子，地形等級由因子決定', () => {
        const general = new GeneralUnit({
            id: 'pink-test',
            name: 'pink-test',
            faction: Faction.Player,
            hp: 1000,
            str: 80,
            lea: 80,
            terrainAptitude: { MOUNTAIN: 'B' },
            genes: [{ id: 'gene_mountain', level: 3, type: '地形' }],
        } as unknown as GeneralConfig);
        assert.equals(true, general.genes.length === 1);
        const resolved = resolveAptitude(battleAptitudeProfileOf(general), { terrain: TerrainType.Mountain });
        assert.equals('A', resolved.terrain);
    });

    suite.test('沒有武將時回傳 null，不丟例外', () => {
        assert.equals(null, battleAptitudeProfileOf(null));
    });

    return suite;
}
