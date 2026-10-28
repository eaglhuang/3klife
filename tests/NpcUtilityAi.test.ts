/**
 * NpcUtilityAi.test.ts — 武將主動互動的行為選擇與登入窗限流（NPC-05，PROG-2-1439）
 *
 * 鎖住：五因子相乘、權重表缺項為 0、取最高分、全 0 回傳 null、
 * 同一武將同一登入窗只放行一則高權重互動、低權重不受限、換登入窗重算。
 *
 * Unity 對照：EditMode Test 驗證 Utility Score 的乘法與 cooldown 計時器。
 */
import { assert, TestSuite } from './TestRunner';
import {
    NPC_HIGH_WEIGHT_THRESHOLD,
    NpcInteractionLimiter,
    scoreNpcAction,
    selectNpcAction,
    type NpcActionContext,
} from '../assets/scripts/core/systems/NpcUtilityAi';

type Action = 'volunteer' | 'comfort' | 'recall';

const WEIGHTS: Partial<Record<Action, number>> = { volunteer: 1, comfort: 0.5 };

function context(actionType: Action, overrides: Partial<NpcActionContext<Action>> = {}): NpcActionContext<Action> {
    return { actionType, eventWeight: 1, relationshipModifier: 1, moodModifier: 1, cooldownModifier: 1, ...overrides };
}

export function createNpcUtilityAiSuite(): TestSuite {
    const suite = new TestSuite('NpcUtilityAi (NPC-05 PROG-2-1439)');

    suite.test('分數為五因子相乘：事件權重、個性權重、關係、心情、冷卻', () => {
        const score = scoreNpcAction(context('comfort', { eventWeight: 2, relationshipModifier: 0.5, moodModifier: 0.8, cooldownModifier: 0.5 }), WEIGHTS);
        assert.isTrue(Math.abs(score - 2 * 0.5 * 0.5 * 0.8 * 0.5) < 1e-9);
    });

    suite.test('權重表沒有該行為時分數為 0，不猜測補值', () => {
        assert.equals(0, scoreNpcAction(context('recall'), WEIGHTS));
    });

    suite.test('選分數最高的候選；全部為 0 或沒有候選時回傳 null', () => {
        const picked = selectNpcAction<Action>([
            { generalId: 'guan-yu', context: context('comfort') },
            { generalId: 'zhang-fei', context: context('volunteer', { eventWeight: 0.6 }) },
            { generalId: 'zhao-yun', context: context('recall') },
        ], WEIGHTS);
        assert.equals('zhang-fei', picked?.generalId);
        assert.equals('volunteer', picked?.actionType);

        assert.isTrue(selectNpcAction<Action>([{ generalId: 'zhao-yun', context: context('recall') }], WEIGHTS) === null);
        assert.isTrue(selectNpcAction<Action>([], WEIGHTS) === null);
    });

    suite.test('同一武將同一登入窗只放行一則高權重互動；換武將或換登入窗不受影響', () => {
        const limiter = new NpcInteractionLimiter();
        const high = NPC_HIGH_WEIGHT_THRESHOLD + 0.1;
        assert.isTrue(limiter.tryClaim('login-1', 'guan-yu', high));
        assert.isTrue(!limiter.tryClaim('login-1', 'guan-yu', high), '同窗同將第二則被擋');
        assert.isTrue(limiter.tryClaim('login-1', 'zhang-fei', high), '不同武將不受限');
        assert.isTrue(limiter.tryClaim('login-2', 'guan-yu', high), '換登入窗重新計算');
    });

    suite.test('低權重互動不計入也不受限', () => {
        const limiter = new NpcInteractionLimiter();
        const low = NPC_HIGH_WEIGHT_THRESHOLD - 0.1;
        assert.isTrue(limiter.tryClaim('login-1', 'guan-yu', low));
        assert.isTrue(limiter.tryClaim('login-1', 'guan-yu', low));
        assert.isTrue(limiter.tryClaim('login-1', 'guan-yu', NPC_HIGH_WEIGHT_THRESHOLD + 0.1), '低權重之後的第一則高權重仍放行');
    });

    return suite;
}
