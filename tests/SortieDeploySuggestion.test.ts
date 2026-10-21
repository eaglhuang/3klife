/**
 * SortieDeploySuggestion.test.ts — 改派建議 Deploy_Suggestion headless 測試（DEP-10，PROG-2-0901）
 * 規格：目標不可部署時推薦可派出的低耗部隊；只給建議、不自動改派。
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyDeploy,
    checkDeploy,
    createSortieState,
    DEPLOY_SUGGESTION_CANDIDATES,
    deploySuggestionCopy,
    suggestLowCostDeploy,
} from '../assets/scripts/core/systems/SortieDeploy';

export function createSortieDeploySuggestionSuite(): TestSuite {
    const suite = new TestSuite('SortieDeploySuggestion (改派建議 DEP-10)');
    const candidates = DEPLOY_SUGGESTION_CANDIDATES;

    suite.test('軍勢與糧草都足時不需要建議：目標本身可部署', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 1000 });
        assert.isTrue(checkDeploy(state, { troopType: 'cavalry' }).ok);
    });

    suite.test('目標糧草不足時，推薦糧耗最低的可派兵種（不回傳被擋的兵種本身）', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 10 });
        const denied = 'cavalry';
        assert.isFalse(checkDeploy(state, { troopType: denied }).ok);
        const suggestion = suggestLowCostDeploy(state, denied, candidates);
        assert.isTrue(suggestion !== null, '應有建議');
        assert.isTrue(checkDeploy(state, { troopType: suggestion! }).ok, '建議的兵種本身可部署');
        assert.isFalse(suggestion === denied, '不建議被擋的兵種');
    });

    suite.test('沒有任何候選可派時回傳 null', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 0 });
        assert.equals(null, suggestLowCostDeploy(state, 'cavalry', candidates));
    });

    suite.test('建議只給資訊，不改動帳本（不自動改派）', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 10 });
        const before = JSON.stringify(state);
        suggestLowCostDeploy(state, 'cavalry', candidates);
        assert.equals(before, JSON.stringify(state));
        assert.isFalse(applyDeploy(state, 'u1', { troopType: 'cavalry' }).ok, '原目標仍不可部署');
    });

    suite.test('改派文案沿用規格：可改派低耗部隊：{TroopName}。', () => {
        assert.equals('可改派低耗部隊：步兵。', deploySuggestionCopy('步兵'));
    });

    return suite;
}
