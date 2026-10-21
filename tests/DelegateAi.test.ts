/**
 * DelegateAi.test.ts — 委任 AI 四級部署策略 headless 測試（DEP-11，PROG-2-0904）
 * 規格：智力門檻 90/70/50；AI_RESERVE_POLICY 表；特殊兵只留主將戰；精銳保留槽；糧草保留線。
 */
import { TestSuite, assert } from './TestRunner';
import { applyDeploy, checkDeploy, createSortieState } from '../assets/scripts/core/systems/SortieDeploy';
import { delegateDecideDeploy, delegatePickDeploy, delegateQualityOf, DELEGATE_RESERVE_POLICY } from '../assets/scripts/core/systems/DelegateAi';

const NO_BOSS = { bossTargetVisible: false };
const BOSS = { bossTargetVisible: true };

export function createDelegateAiSuite(): TestSuite {
    const suite = new TestSuite('DelegateAi (委任 AI 四級 DEP-11)');

    suite.test('智力門檻：90 EXPERT、70 HIGH、50 MEDIUM、49 LOW', () => {
        assert.equals('EXPERT', delegateQualityOf(90));
        assert.equals('HIGH', delegateQualityOf(70));
        assert.equals('MEDIUM', delegateQualityOf(50));
        assert.equals('LOW', delegateQualityOf(49));
        assert.equals('HIGH', delegateQualityOf(89));
    });

    suite.test('保留策略照規格表：LOW 不保留，EXPERT 糧草 25% 且保留 1 精銳槽', () => {
        assert.equals(0, DELEGATE_RESERVE_POLICY.LOW.keepFoodFloorRate);
        assert.equals(0.25, DELEGATE_RESERVE_POLICY.EXPERT.keepFoodFloorRate);
        assert.equals(1, DELEGATE_RESERVE_POLICY.EXPERT.reserveSiegeSlots);
        assert.isTrue(DELEGATE_RESERVE_POLICY.HIGH.reserveSpecialForBoss);
        assert.isFalse(DELEGATE_RESERVE_POLICY.MEDIUM.reserveSpecialForBoss);
    });

    suite.test('LOW：部署合法就直接出，不保留糧草', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 200 });
        const decision = delegateDecideDeploy(state, { troopType: 'infantry' }, 'LOW', NO_BOSS);
        assert.isTrue(decision.deploy);
        assert.equals('ok', decision.reason);
    });

    suite.test('部署不合法（糧草不足）時回報 deploy-check-failed', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 0 });
        const decision = delegateDecideDeploy(state, { troopType: 'infantry' }, 'LOW', NO_BOSS);
        assert.isFalse(decision.deploy);
        assert.equals('deploy-check-failed', decision.reason);
    });

    suite.test('MEDIUM 糧草線：部署後糧草低於 maxFood × 10% 就不出；剛好不低於則出', () => {
        const base = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 1000 });
        const cost = checkDeploy(base, { troopType: 'infantry' }).cost.foodCost;
        const floor = base.maxFood * DELEGATE_RESERVE_POLICY.MEDIUM.keepFoodFloorRate;
        const tight = { ...base, food: floor + cost - 1 };
        const exact = { ...base, food: floor + cost };
        assert.equals('food-floor', delegateDecideDeploy(tight, { troopType: 'infantry' }, 'MEDIUM', NO_BOSS).reason);
        assert.isTrue(delegateDecideDeploy(exact, { troopType: 'infantry' }, 'MEDIUM', NO_BOSS).deploy);
    });

    suite.test('HIGH：精銳（騎兵）非主將戰不出，主將戰才出', () => {
        const state = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        assert.equals('hold-for-boss', delegateDecideDeploy(state, { troopType: 'cavalry' }, 'HIGH', NO_BOSS).reason);
        assert.isTrue(delegateDecideDeploy(state, { troopType: 'cavalry' }, 'HIGH', BOSS).deploy);
    });

    suite.test('MEDIUM：精銳不受主將戰限制，但仍可能被保留槽擋（MEDIUM 無精銳保留槽）', () => {
        const state = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        assert.isTrue(delegateDecideDeploy(state, { troopType: 'cavalry' }, 'MEDIUM', NO_BOSS).deploy);
    });

    suite.test('EXPERT：精銳保留 1 槽，非主將戰時第 4 隊精銳（上限 4）被擋，主將戰則可出', () => {
        let state = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        for (let i = 0; i < 3; i += 1) state = applyDeploy(state, `c${i}`, { troopType: 'cavalry' }).state;
        assert.equals(3, state.eliteDeployed);
        const held = delegateDecideDeploy(state, { troopType: 'cavalry' }, 'EXPERT', NO_BOSS);
        assert.isFalse(held.deploy);
        assert.equals('hold-reserved-elite', held.reason, '保留槽先於主將戰判斷');
        assert.isTrue(delegateDecideDeploy(state, { troopType: 'cavalry' }, 'EXPERT', BOSS).deploy, '主將戰可用保留槽');
    });

    suite.test('決策不改動 SortieState', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 200 });
        const before = JSON.stringify(state);
        delegateDecideDeploy(state, { troopType: 'infantry' }, 'EXPERT', NO_BOSS);
        assert.equals(before, JSON.stringify(state));
    });

    suite.test('delegatePickDeploy：依候選順序挑第一個被批准的兵種，前面被擋就跳過', () => {
        const state = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        const pick = delegatePickDeploy(state, ['cavalry', 'infantry'], 'HIGH', NO_BOSS);
        assert.equals('infantry', pick.troopType, '騎兵非主將戰被擋，改派步兵');
        assert.equals('ok', pick.reason);
    });

    suite.test('delegatePickDeploy：全部被擋回 null 並帶第一個擋下原因；空候選回 deploy-check-failed', () => {
        const state = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        const blocked = delegatePickDeploy(state, ['cavalry'], 'HIGH', NO_BOSS);
        assert.equals(null, blocked.troopType);
        assert.equals('hold-for-boss', blocked.reason);
        const empty = delegatePickDeploy(state, [], 'LOW', NO_BOSS);
        assert.equals(null, empty.troopType);
        assert.equals('deploy-check-failed', empty.reason);
    });

    return suite;
}
