/**
 * 教學戰兵池與軍勢用盡提示（PROG-2-9334）
 *
 * 教學戰兵池從 8000 降到 5000：原本能派 12 隊打敵方 6 隊，幾乎沒有戰損。
 * Unity 對照：新手關的資源上限寫在 ScriptableObject 設定裡，UI 在資源歸零時跳一次提示。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { createSortieState, isSortiePoolExhausted, SORTIE_GUARANTEE_TROOPS } from '../assets/scripts/core/systems/SortieDeploy';

export function createTutorialSortiePoolSuite(): TestSuite {
    const suite = new TestSuite('TutorialSortiePool (教學戰兵池 5000 與軍勢用盡 PROG-2-9334)');

    suite.test('教學戰：新玩家城市兵源 3000，出征軍勢補到 5000', () => {
        assert.equals(5000, GAME_CONFIG.tutorialSortiePoolMin);
        const state = createSortieState({ commandCapacity: 8000, cityTroops: 3000, food: 100, tutorialPoolMin: GAME_CONFIG.tutorialSortiePoolMin });
        assert.equals(5000, state.poolMax);
        assert.equals(5000, state.poolCurrent);
    });

    suite.test('軍勢用盡：連一隊步兵都派不出來才算', () => {
        assert.isFalse(isSortiePoolExhausted({ poolCurrent: SORTIE_GUARANTEE_TROOPS }));
        assert.isTrue(isSortiePoolExhausted({ poolCurrent: SORTIE_GUARANTEE_TROOPS - 1 }));
        assert.isTrue(isSortiePoolExhausted({ poolCurrent: 0 }));
    });

    return suite;
}
