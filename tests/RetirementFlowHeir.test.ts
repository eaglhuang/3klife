/**
 * RetirementFlowHeir.test.ts — 退役畫面的裝備接收子嗣選擇（EQP-07 子嗣 UI，PROG-2-1388）
 *
 * 鎖住：候選只含 roster 上父母指向退役目標、存活、非導師卡的武將；循環選擇；
 * 退役時把接收者傳給 retireGeneral；沒選時維持原本的參數（不帶 heirChildId）。
 * Unity 對照：像 EditMode 測試，假 roster 與假 retireGeneral，驗控制器狀態，不碰 cc 畫面。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { RetirementFlowController } from '../assets/scripts/ui/core/RetirementFlowController';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';

type Call = { id: string; options?: { catalystChildId?: string; heirChildId?: string } };

function gen(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, age, ...extra } as unknown as GeneralConfig;
}

function flowWith(roster: GeneralConfig[]) {
    const calls: Call[] = [];
    const flow = new RetirementFlowController({
        roster: () => roster,
        retireGeneral: async (id, options) => {
            calls.push(options === undefined ? { id } : { id, options });
        },
    });
    return { flow, calls };
}

export function createRetirementFlowHeirSuite(): TestSuite {
    const suite = new TestSuite('RetirementFlowHeir (退役裝備接收子嗣)');

    suite.test('候選只含父或母指向退役目標、存活、非導師卡的武將', () => {
        const roster = [
            gen('elder', 70),
            gen('son', 20, { fatherId: 'elder' }),
            gen('daughter', 18, { motherId: 'elder' }),
            gen('stranger', 20),
            gen('dead-son', 25, { fatherId: 'elder', status: GENERAL_STATUS_DEAD }),
            gen('mentor-son', 30, { fatherId: 'elder', isMentorCard: true }),
        ];
        const { flow } = flowWith(roster);
        assert.equals('son,daughter', flow.heirChildren().map(g => g.id).join(','));
    });

    suite.test('循環選擇：無 → 子嗣1 → 子嗣2 → 無', () => {
        const { flow } = flowWith([gen('elder', 70), gen('a', 20, { fatherId: 'elder' }), gen('b', 18, { motherId: 'elder' })]);
        assert.equals(null, flow.heirChild);
        flow.selectNextHeirChild();
        assert.equals('a', flow.heirChild?.id ?? '');
        flow.selectNextHeirChild();
        assert.equals('b', flow.heirChild?.id ?? '');
        flow.selectNextHeirChild();
        assert.equals(null, flow.heirChild);
    });

    suite.test('退役時選了接收者：傳入 heirChildId', async () => {
        const { flow, calls } = flowWith([gen('elder', 70), gen('son', 20, { fatherId: 'elder' })]);
        flow.selectNextHeirChild();
        await flow.retire();
        await flow.retire();
        assert.equals(1, calls.length);
        assert.equals('son', calls[0].options?.heirChildId ?? '');
    });

    suite.test('沒選接收者：退役參數與原本相同，不帶 heirChildId', async () => {
        const { flow, calls } = flowWith([gen('elder', 70), gen('son', 20, { fatherId: 'elder' })]);
        await flow.retire();
        await flow.retire();
        assert.equals(1, calls.length);
        assert.isTrue(calls[0].options === undefined);
    });

    suite.test('切換退役目標會清掉接收者選擇', () => {
        const { flow } = flowWith([gen('elder', 70), gen('elder2', 68), gen('son', 20, { fatherId: 'elder' })]);
        flow.selectNextHeirChild();
        assert.equals('son', flow.heirChild?.id ?? '');
        flow.selectNext();
        assert.equals(null, flow.heirChild);
    });

    return suite;
}
