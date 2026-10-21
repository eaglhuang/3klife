/**
 * DelegateSandtableIntegration — 委任 AI（DEP-11）與沙盤標記上限（OFC-06）的整合複查（QA，PROG-2-0637）
 *
 * Unity 對照：純決策模組要和它依賴的「帳本」同口徑——AI 說能派，帳本就該真的能派；官職升階後沙盤格數要跟著開。
 */
import { assert, TestSuite } from './TestRunner';
import { applyDeploy, checkDeploy, createSortieState, retireUnit, type SortieState } from '../assets/scripts/core/systems/SortieDeploy';
import { delegateDecideDeploy, delegateQualityOf, type DelegateQuality } from '../assets/scripts/core/systems/DelegateAi';
import { officerUnlocksOf } from '../assets/scripts/core/systems/OfficerSnapshot';
import { canPlaceSandtableMarker, remainingSandtableMarkers, sandtableMarkerLimitOf } from '../assets/scripts/core/systems/SandtableMarkers';

const NO_BOSS = { bossTargetVisible: false };
const BOSS = { bossTargetVisible: true };

/** AI 反覆嘗試部署步兵到不能再派為止，回傳最後帳本與派出隊數 */
function deployUntilStop(initial: SortieState, quality: DelegateQuality, troopType: string, boss = NO_BOSS): { state: SortieState; count: number } {
    let state = initial;
    let count = 0;
    for (let i = 0; i < 200; i += 1) {
        const decision = delegateDecideDeploy(state, { troopType }, quality, boss);
        if (!decision.deploy) break;
        const applied = applyDeploy(state, `u${count}`, { troopType });
        assert.isTrue(applied.ok, `AI 說可派，帳本也必須能派（第 ${count + 1} 隊）`);
        state = applied.state;
        count += 1;
    }
    return { state, count };
}

export function createDelegateSandtableIntegrationSuite(): TestSuite {
    const suite = new TestSuite('DelegateSandtableIntegration (委任AI×帳本、官職×沙盤 PROG-2-0637)');

    suite.test('AI 說可派的，帳本一定能派；品質越高保留越多糧草（派出隊數單調不增）', () => {
        const fresh = () => createSortieState({ commandCapacity: 99999, cityTroops: 99999, food: 100 });
        const counts = (['LOW', 'MEDIUM', 'HIGH', 'EXPERT'] as DelegateQuality[]).map((quality) => deployUntilStop(fresh(), quality, 'infantry').count);
        for (let i = 1; i < counts.length; i += 1) assert.isTrue(counts[i] <= counts[i - 1], `品質越高派得越保守：${counts.join(',')}`);
        assert.isTrue(counts[0] > counts[3], 'LOW 與 EXPERT 有差別');
        const expert = deployUntilStop(fresh(), 'EXPERT', 'infantry');
        assert.isTrue(expert.state.food >= expert.state.maxFood * 0.25 - 10, 'EXPERT 停手時糧草仍在保留線附近');
    });

    suite.test('智力換品質後對上同一份帳本：用真實武將智力值走一遍', () => {
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 300 });
        for (const int of [30, 55, 75, 95]) {
            const quality = delegateQualityOf(int);
            const result = deployUntilStop(state, quality, 'infantry');
            assert.isTrue(result.count > 0, `智力 ${int}(${quality}) 至少派得出第一隊`);
        }
    });

    suite.test('精銳槽以「場上現有」為準：精銳陣亡退場後，AI 要能補派（與 checkDeploy 同口徑）', () => {
        // LOW／MEDIUM 沒有保留槽：騎兵（精銳，場上上限 4）派滿 4 隊、退場 2 隊後，帳本允許再派，AI 也不該攔
        let state = createSortieState({ commandCapacity: 99999, cityTroops: 99999, food: 99999 });
        for (let i = 0; i < 4; i += 1) {
            const applied = applyDeploy(state, `c${i}`, { troopType: 'cavalry' });
            assert.isTrue(applied.ok);
            state = applied.state;
        }
        assert.isFalse(checkDeploy(state, { troopType: 'cavalry' }).ok, '場上滿 4 隊精銳，帳本擋下');
        state = retireUnit(state, 'c0');
        state = retireUnit(state, 'c1');
        assert.isTrue(checkDeploy(state, { troopType: 'cavalry' }).ok, '退場 2 隊後帳本允許補派');
        for (const quality of ['LOW', 'MEDIUM'] as DelegateQuality[]) {
            const decision = delegateDecideDeploy(state, { troopType: 'cavalry' }, quality, NO_BOSS);
            assert.isTrue(decision.deploy, `${quality} 應補派精銳，實得 ${decision.reason}`);
        }
        // 主將戰目標出現時 EXPERT 也能用掉保留槽
        assert.isTrue(delegateDecideDeploy(state, { troopType: 'cavalry' }, 'EXPERT', BOSS).deploy);
    });

    suite.test('官職升階 → 沙盤階段 → 標記上限：未解鎖 0，之後 3／5／8，單調不減', () => {
        const limits = [1, 2, 3, 4, 5].map((tier) => sandtableMarkerLimitOf(officerUnlocksOf({ tier, code: `OFFICER_TIER_${tier}` } as never).sandtableStage));
        assert.equals(0, limits[0]);
        assert.equals(3, limits[2]);
        assert.equals(5, limits[3]);
        assert.equals(8, limits[4]);
        for (let i = 1; i < limits.length; i += 1) assert.isTrue(limits[i] >= limits[i - 1], `上限單調不減：${limits.join(',')}`);
    });

    suite.test('沙盤標記剩餘數：放滿即停；未解鎖不能放；升階後多出的名額可用', () => {
        const s1 = officerUnlocksOf({ tier: 3, code: 'OFFICER_TIER_3' } as never).sandtableStage;
        const s2 = officerUnlocksOf({ tier: 4, code: 'OFFICER_TIER_4' } as never).sandtableStage;
        assert.isFalse(canPlaceSandtableMarker(0, null));
        assert.equals(0, remainingSandtableMarkers(3, s1));
        assert.isFalse(canPlaceSandtableMarker(3, s1), 'S1 放滿 3 個');
        assert.equals(2, remainingSandtableMarkers(3, s2), '升到 S2 多出 2 個');
        assert.isTrue(canPlaceSandtableMarker(3, s2));
        assert.equals(0, remainingSandtableMarkers(99, s2), '超放不出現負數');
    });

    return suite;
}
