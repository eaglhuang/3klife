import { applyDeploy, checkDeploy, createSortieState, SCENE_PRESET_SIEGE, type SortieState } from '../assets/scripts/core/systems/SortieDeploy';
import { TestSuite, assert } from './TestRunner';

const elite = (troopType: string) => ({ troopType, tally: { quality: 'R', star: 1 } });

function sortie(scenePresetId: string | null): SortieState {
    return createSortieState({ commandCapacity: 100000, cityTroops: 100000, stageSortieCap: 100000, food: 100000, scenePresetId });
}

function deployMany(state: SortieState, types: string[]): SortieState {
    types.forEach((t, i) => {
        const r = applyDeploy(state, `u${i}`, elite(t));
        assert.isTrue(r.ok, `第 ${i + 1} 隊 ${t} 應可部署`);
        state = r.state;
    });
    return state;
}

export function createSiegeEngineReserveSuite(): TestSuite {
    const suite = new TestSuite('SiegeEngineReserve (攻城器械保留槽 PROG-2-1604)');

    suite.test('攻城戰：一般精銳只能佔 4 格，第 5 格保留給工兵', () => {
        const state = deployMany(sortie(SCENE_PRESET_SIEGE), ['infantry', 'cavalry', 'archer', 'shield']);
        assert.isTrue(!checkDeploy(state, elite('pikeman')).ok);
        assert.isTrue(checkDeploy(state, elite('engineer')).ok);
    });

    suite.test('攻城戰：工兵已佔保留槽後，一般精銳可補滿 5 格', () => {
        const state = deployMany(sortie(SCENE_PRESET_SIEGE), ['engineer', 'infantry', 'cavalry', 'archer']);
        assert.isTrue(checkDeploy(state, elite('shield')).ok);
    });

    suite.test('野戰：沒有保留槽，精銳上限 4', () => {
        const state = sortie(null);
        assert.equals(0, state.siegeEngineReserve ?? 0);
        const full = deployMany(state, ['infantry', 'cavalry', 'archer', 'shield']);
        assert.isTrue(!checkDeploy(full, elite('engineer')).ok);
    });

    return suite;
}
